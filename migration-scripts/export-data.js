import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';

const supabaseUrl = 'https://nitkbpmyyfrhlmnfbdvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdGticG15eWZyaGxtbmZiZHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NzkzODUsImV4cCI6MjA3NzU1NTM4NX0.ux3SlY8FzYa8Ntp37o8-Y80DeNMT28oOXJnOEe5zdRU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Create exports directory
try {
  mkdirSync('exports', { recursive: true });
} catch (e) {}

// Tables to export
const tables = [
  'profiles', 'user_roles', 'departments', 'department_settings',
  'products', 'product_variants', 'categories', 'suppliers',
  'customers', 'customer_preferences', 'sales', 'sale_items',
  'services', 'appointments', 'expenses', 'reconciliations',
  'suspended_revenue', 'credits', 'internal_stock_usage',
  'perfume_scents', 'perfume_pricing_config',
  'mobile_money_settings', 'mobile_money_transactions', 'mobile_money_payments',
  'payment_transactions', 'stock_alerts', 'settings'
];

async function exportData() {
  console.log('Starting data export...\n');
  const allData = {};

  for (const table of tables) {
    try {
      console.log(`Exporting ${table}...`);
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`Error exporting ${table}:`, error.message);
        allData[table] = { error: error.message, data: [] };
      } else {
        allData[table] = { count: data.length, data };
        console.log(`✓ Exported ${data.length} rows from ${table}`);
      }
    } catch (err) {
      console.error(`Failed to export ${table}:`, err.message);
      allData[table] = { error: err.message, data: [] };
    }
  }

  // Write to file
  const filename = `exports/data-export-${new Date().toISOString().split('T')[0]}.json`;
  writeFileSync(filename, JSON.stringify(allData, null, 2));
  
  console.log(`\n✓ Export complete! Data saved to ${filename}`);
  console.log('\nExport Summary:');
  Object.entries(allData).forEach(([table, info]) => {
    if (info.error) {
      console.log(`  ${table}: ERROR - ${info.error}`);
    } else {
      console.log(`  ${table}: ${info.count} rows`);
    }
  });
}

exportData().catch(console.error);
