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

    // Check if requesting user is admin
    const { data: requestingUserRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || requestingUserRole?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can activate/deactivate users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user ID and activation status from request body
    const { userId, isActive } = await req.json()

    console.log('Toggle activation request received')

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (typeof isActive !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'isActive must be a boolean' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent users from deactivating themselves
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot deactivate yourself' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Updating user activation status')

    // Update the user's activation status
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)
    
    if (updateError) {
      console.error('Error updating user activation status:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update user activation status. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User activation status updated successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: isActive ? 'User activated successfully' : 'User deactivated successfully',
        userId,
        isActive
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in toggle-user-activation:', error)
    return new Response(
      JSON.stringify({ error: 'Operation failed. Please contact support.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
