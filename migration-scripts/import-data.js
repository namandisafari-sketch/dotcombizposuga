import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'dotcom_buzi_pos',
  user: 'dotcom_app',
  password: 'Jagonix44@@'
});

// Read the exported data
const dataFile = path.join(__dirname, '../exports/data-export-2025-11-23.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log('Starting data import...');
console.log(`Found ${Object.keys(data).length} tables to import`);

async function importData() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Import order matters due to foreign key constraints
    const tableOrder = [
      'departments',
      'categories',
      'suppliers',
      'perfume_scents',
      'profiles',
      'user_roles',
      'customers',
      'products',
      'product_variants',
      'services',
      'sales',
      'sale_items',
      'appointments',
      'reconciliations',
      'expenses',
      'internal_stock_usage',
      'suspended_revenue',
      'mobile_money_transactions',
      'mobile_money_payments',
      'payment_transactions',
      'credits',
      'interdepartmental_inbox',
      'customer_preferences',
      'department_settings',
      'settings',
      'landing_page_content',
      'service_showcase',
      'demo_mode_settings',
      'mobile_money_settings',
      'perfume_pricing_config',
      'sensitive_service_registrations',
      'stock_alerts',
      'staff_performance',
      'user_nav_permissions'
    ];

    for (const tableName of tableOrder) {
      if (!data[tableName] || data[tableName].length === 0) {
        console.log(`⚠️  Skipping ${tableName} - no data`);
        continue;
      }

      console.log(`\nImporting ${tableName}...`);
      const records = data[tableName];
      
      for (const record of records) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;
        
        try {
          await client.query(query, values);
        } catch (err) {
          console.error(`  ❌ Error inserting into ${tableName}:`, err.message);
        }
      }
      
      console.log(`✅ Imported ${records.length} records into ${tableName}`);
    }

    console.log('\n🎉 Data import completed!');
  } catch (err) {
    console.error('Import error:', err);
  } finally {
    await client.end();
  }
}

importData();
