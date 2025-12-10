import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== LOADING ENVIRONMENT VARIABLES ===');

// Manually parse .env
const envPath = path.join(__dirname, '.env');
console.log('Reading .env from:', envPath);

const envContent = fs.readFileSync(envPath, 'utf8');
console.log('File size:', envContent.length, 'bytes');

let count = 0;
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
      count++;
      console.log(`✓ Loaded: ${key.trim()}`);
    }
  }
});

console.log(`\nTotal variables loaded: ${count}`);
console.log('\n=== TESTING DATABASE CONNECTION ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'MISSING');

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('\n❌ DATABASE CONNECTION FAILED:');
    console.error('Error:', err.message);
    console.error('Code:', err.code);
    process.exit(1);
  } else {
    console.log('\n✅ DATABASE CONNECTED SUCCESSFULLY!');
    release();
    console.log('\nNow run: node server.js');
    process.exit(0);
  }
});
