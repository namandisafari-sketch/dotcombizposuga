import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TABLES = [
  'perfume_shop_products',
  'perfume_shop_alerts',
  'perfume_pricing_config',
  'sales',
  'products',
  'customers',
  'services',
  'appointments',
  'expenses',
  'mobile_money_transactions',
  'reconciliations',
  'departments',
  'suppliers',
  'internal_usage',
  'customer_preferences',
  'user_roles',
  'profiles',
  'settings'
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Defense-in-depth: Verify authorization if called manually
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      // Allow cron job (no auth header from Supabase cron)
      console.log('Backup triggered by cron job');
    } else {
      // If called manually, require admin role
      const token = authHeader.replace('Bearer ', '');
      const authClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      
      const { data: { user }, error: authError } = await authClient.auth.getUser(token);
      if (authError || !user) {
        console.error('Unauthorized backup attempt:', authError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check admin role
      const { data: userRole } = await authClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (userRole?.role !== 'admin') {
        console.error('Non-admin backup attempt by user:', user.id);
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Manual backup triggered by admin:', user.id);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting daily backup...');

    const backupData: {
      exported_at: string;
      version: string;
      tables: Record<string, any[]>;
    } = {
      exported_at: new Date().toISOString(),
      version: '1.0',
      tables: {},
    };

    // Fetch data from all tables
    for (const tableName of TABLES) {
      try {
        const { data, error } = await supabaseClient
          .from(tableName)
          .select('*');

        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          continue;
        }

        backupData.tables[tableName] = data || [];
        console.log(`Backed up ${data?.length || 0} records from ${tableName}`);
      } catch (err) {
        console.error(`Failed to backup ${tableName}:`, err);
      }
    }

    // Create JSON file
    const jsonContent = JSON.stringify(backupData, null, 2);
    const fileName = `backup-${new Date().toISOString().split('T')[0]}.json`;

    // Upload to storage bucket
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('backups')
      .upload(fileName, jsonContent, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    console.log('Backup completed successfully:', fileName);

    // Delete backups older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: files } = await supabaseClient
      .storage
      .from('backups')
      .list();

    if (files) {
      for (const file of files) {
        const fileDate = new Date(file.created_at);
        if (fileDate < thirtyDaysAgo) {
          await supabaseClient
            .storage
            .from('backups')
            .remove([file.name]);
          console.log(`Deleted old backup: ${file.name}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName,
        tablesBackedUp: Object.keys(backupData.tables).length,
        recordsBackedUp: Object.values(backupData.tables).reduce((sum, records) => sum + records.length, 0)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Backup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
