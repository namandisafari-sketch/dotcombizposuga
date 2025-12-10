import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 TESTING SERVER STARTUP\n');

// Load .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const app = express();
const PORT = 3001;

app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

console.log('Attempting to start server...');

const server = app.listen(PORT, () => {
  console.log('✅ TEST SERVER RUNNING on http://localhost:' + PORT);
  console.log('✅ Visit: http://localhost:' + PORT + '/test');
  console.log('✅ Server should stay running. Press Ctrl+C to stop.\n');
});

server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use!`);
  }
});

// Keep alive
setInterval(() => {
  console.log('⏰ Server still running...', new Date().toISOString());
}, 30000);

console.log('Script execution completed. Server should be running...\n');
