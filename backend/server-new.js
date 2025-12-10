import express from 'express';
import cors from 'cors';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { body } from 'express-validator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🚀 DOTCOM BACKEND SERVER - FRESH START');
console.log('==========================================\n');

// Manually parse .env file
const envPath = path.join(__dirname, '.env');
console.log('📁 Loading .env from:', envPath);
console.log('📄 File exists:', fs.existsSync(envPath));

const envContent = fs.readFileSync(envPath, 'utf8');
console.log('📊 File size:', envContent.length, 'bytes\n');

let loadedCount = 0;
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
      loadedCount++;
    }
  }
});

console.log(`✅ Loaded ${loadedCount} environment variables\n`);
console.log('🔧 DATABASE CONFIGURATION:');
console.log('   Host:', process.env.DB_HOST || 'MISSING ❌');
console.log('   Port:', process.env.DB_PORT || 'MISSING ❌');
console.log('   Database:', process.env.DB_NAME || 'MISSING ❌');
console.log('   User:', process.env.DB_USER || 'MISSING ❌');
console.log('   Password:', process.env.DB_PASSWORD ? 'SET ✓' : 'MISSING ❌');
console.log('   JWT Secret:', process.env.JWT_SECRET ? 'SET ✓' : 'MISSING ❌');
console.log();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

// Create upload directories
['logos', 'products', 'documents', 'backups'].forEach(dir => {
  const fullPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
});

// CORS configuration
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// PostgreSQL connection pool
console.log('🔌 Connecting to PostgreSQL...');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Add error handler
pool.on('error', (err, client) => {
  console.error('\n❌ Database pool error:', err.message);
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('\n❌ DATABASE CONNECTION FAILED!');
    console.error('   Error:', err.message);
    console.error('   Code:', err.code);
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('   1. Ensure PostgreSQL service is running (services.msc)');
    console.error('   2. Verify database exists: psql -U postgres -c "\\l"');
    console.error('   3. Check credentials in .env file');
    console.error('   4. Try: psql -U dotcom_app -d dotcom_buzi_pos -h localhost\n');
  } else {
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY!\n');
    release();
  }
});

// Import the rest of your server code from the old file
// For now, just the essential parts to test the connection

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('==========================================');
  console.log(`✅ SERVER RUNNING ON http://localhost:${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`📦 Max file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('==========================================\n');
  console.log('👉 Test health: http://localhost:' + PORT + '/api/health');
  console.log('👉 Frontend should connect to: http://localhost:' + PORT + '\n');
});
