import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || userRole?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body for options
    const body = await req.json().catch(() => ({}))
    const { confirmationToken, dryRun } = body

    // Require explicit confirmation token for actual deletion
    if (!dryRun && confirmationToken !== 'DELETE_ALL_USERS_CONFIRMED') {
      return new Response(
        JSON.stringify({ 
          error: 'Confirmation required',
          message: 'You must provide confirmationToken: "DELETE_ALL_USERS_CONFIRMED" to proceed with deletion'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get all users with admin role
    const { data: adminRoles, error: adminRolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')

    if (adminRolesError) {
      throw adminRolesError
    }

    const adminUserIds = adminRoles.map(role => role.user_id)

    // Get all users
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers()
    
    if (usersError) {
      throw usersError
    }

    // Filter out admin users
    const nonAdminUsers = users.filter(u => !adminUserIds.includes(u.id))

    // If dry run, return preview only
    if (dryRun) {
      const preview = nonAdminUsers.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
      }))

      return new Response(
        JSON.stringify({
          message: 'Dry run - no users deleted',
          wouldDelete: preview,
          count: nonAdminUsers.length,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Delete non-admin users with error tracking
    let deletedCount = 0
    const errors = []
    const deletedUsers = []

    for (const nonAdminUser of nonAdminUsers) {
      try {
        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(
          nonAdminUser.id
        )
        if (deleteError) {
          errors.push({
            userId: nonAdminUser.id,
            email: nonAdminUser.email,
            error: deleteError.message,
          })
        } else {
          deletedCount++
          deletedUsers.push({
            id: nonAdminUser.id,
            email: nonAdminUser.email,
          })
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push({
          userId: nonAdminUser.id,
          email: nonAdminUser.email,
          error: errorMessage,
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: `Successfully deleted ${deletedCount} non-admin user(s)`,
        deletedCount,
        deletedUsers,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
