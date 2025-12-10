import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify user is authenticated and has admin role
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Starting sync of existing users...');

    // Get all auth users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Found ${users.length} auth users`);

    // Get existing profiles
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    const existingProfileIds = new Set(existingProfiles?.map(p => p.id) || []);
    console.log(`Found ${existingProfileIds.size} existing profiles`);

    // Find users without profiles
    const usersWithoutProfiles = users.filter(user => !existingProfileIds.has(user.id));
    console.log(`Found ${usersWithoutProfiles.length} users without profiles`);

    let syncedCount = 0;
    const errors = [];

    // Create profiles and roles for users without them
    for (const user of usersWithoutProfiles) {
      try {
        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          });

        if (profileError) {
          console.error(`Error creating profile for ${user.email}:`, profileError);
          errors.push({ user: user.email, error: profileError.message });
          continue;
        }

        // Check if user already has a role
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        // Create default 'user' role if they don't have one
        if (!existingRole) {
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: user.id,
              role: 'user',
            });

          if (roleError) {
            console.error(`Error creating role for ${user.email}:`, roleError);
            errors.push({ user: user.email, error: roleError.message });
          }
        }

        syncedCount++;
        console.log(`Synced user: ${user.email}`);
      } catch (error: any) {
        console.error(`Error processing user ${user.email}:`, error);
        errors.push({ user: user.email, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${syncedCount} users`,
        totalUsers: users.length,
        existingProfiles: existingProfileIds.size,
        syncedUsers: syncedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in sync-existing-users:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
