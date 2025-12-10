import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n=== TESTING ENVIRONMENT VARIABLES ===\n');

const envPath = path.join(__dirname, '.env');
console.log('1. Looking for .env at:', envPath);
console.log('2. File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('3. File size:', content.length, 'bytes');
  console.log('4. First 100 chars:', content.substring(0, 100));
}

console.log('\n5. Loading with dotenv.config()...');
const result = dotenv.config({ path: envPath });

console.log('6. Result:', result);
console.log('7. Error:', result.error || 'None');
console.log('8. Parsed:', result.parsed);

console.log('\n9. Environment variables after load:');
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_PORT:', process.env.DB_PORT);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('   DB_USER:', process.env.DB_USER);
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
