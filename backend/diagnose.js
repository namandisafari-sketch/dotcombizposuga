console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Current directory:', process.cwd());
console.log('\nChecking files...');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('__dirname:', __dirname);
console.log('server.js exists:', fs.existsSync(path.join(__dirname, 'server.js')));
console.log('package.json exists:', fs.existsSync(path.join(__dirname, 'package.json')));
console.log('.env exists:', fs.existsSync(path.join(__dirname, '.env')));

console.log('\nReading package.json...');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
console.log('Package name:', pkg.name);
console.log('Package type:', pkg.type);
console.log('Has duplicate type?:', JSON.stringify(pkg).match(/\"type\"/g)?.length || 0);

console.log('\nTesting Express...');
import express from 'express';
const app = express();

console.log('Express loaded successfully');

const PORT = 3001;
console.log('Attempting to bind to port', PORT, '...');

const server = app.listen(PORT, () => {
  console.log('✅ SERVER IS LISTENING ON PORT', PORT);
  console.log('✅ Server object:', typeof server);
  console.log('✅ Server listening:', server.listening);
  console.log('\n🎯 If you see this, server started successfully!');
  console.log('🎯 Process should stay alive now...');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});

// Keep alive with interval
const keepAlive = setInterval(() => {
  console.log('⏰', new Date().toTimeString().split(' ')[0], '- Process still running');
}, 5000);

// Prevent immediate exit
process.stdin.resume();

console.log('\n✅ Script finished executing, server should stay running');
console.log('Press Ctrl+C to exit\n');
