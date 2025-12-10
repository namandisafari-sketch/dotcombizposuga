# Self-Hosted PostgreSQL Migration Guide

## Overview
This guide will help you migrate from Lovable Cloud to your own self-hosted PostgreSQL database while preserving all your existing data.

## Prerequisites
- Self-hosted PostgreSQL 15+ server
- Access to current Lovable Cloud database
- Node.js backend server (Express, Fastify, etc.) for API endpoints
- Storage solution (S3, MinIO, local filesystem, etc.)
- Authentication solution (JWT, OAuth, etc.)

---

## Phase 1: Data Export & Backup

### Step 1: Export Current Database Schema
```bash
# Using Supabase CLI (already connected to your project)
supabase db dump --schema public > schema.sql
supabase db dump --schema auth > auth_schema.sql
supabase db dump --schema storage > storage_schema.sql
```

### Step 2: Export All Data
```bash
# Export data as SQL inserts
supabase db dump --data-only --schema public > data.sql
supabase db dump --data-only --schema auth > auth_data.sql
```

### Step 3: Export Files from Storage Buckets
You need to download files from these buckets:
- `backups`
- `perfume-products`
- `department-logos`

```javascript
// Create a script: export-storage.js
import { supabase } from './src/integrations/supabase/client.js';
import fs from 'fs';
import path from 'path';

const buckets = ['backups', 'perfume-products', 'department-logos'];

for (const bucket of buckets) {
  const { data: files } = await supabase.storage.from(bucket).list();
  
  for (const file of files) {
    const { data } = await supabase.storage.from(bucket).download(file.name);
    const buffer = await data.arrayBuffer();
    fs.writeFileSync(
      path.join('./storage-export', bucket, file.name),
      Buffer.from(buffer)
    );
  }
}
```

---

## Phase 2: Self-Hosted Database Setup

### Step 1: Create Database
```bash
# Connect to your PostgreSQL server
psql -h YOUR_HOST -U YOUR_USER -d postgres

# Create database
CREATE DATABASE dotcom_buzi;
\c dotcom_buzi

# Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Step 2: Import Schema
```bash
# Import public schema
psql -h YOUR_HOST -U YOUR_USER -d dotcom_buzi < schema.sql

# Import auth schema (you may need to modify this)
psql -h YOUR_HOST -U YOUR_USER -d dotcom_buzi < auth_schema.sql
```

### Step 3: Import Data
```bash
# Import data
psql -h YOUR_HOST -U YOUR_USER -d dotcom_buzi < data.sql
psql -h YOUR_HOST -U YOUR_USER -d dotcom_buzi < auth_data.sql
```

### Step 4: Create Application User
```sql
-- Create a dedicated user for your application
CREATE USER dotcom_app WITH PASSWORD 'your_secure_password';

-- Grant permissions
GRANT CONNECT ON DATABASE dotcom_buzi TO dotcom_app;
GRANT USAGE ON SCHEMA public TO dotcom_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dotcom_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dotcom_app;
```

---

## Phase 3: Backend API Setup

You need to create a Node.js backend to replace Supabase edge functions.

### Step 1: Setup Express Backend
```javascript
// server.js
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const { Pool } = pg;

// Database connection
const pool = new Pool({
  host: 'YOUR_HOST',
  port: 5432,
  database: 'dotcom_buzi',
  user: 'dotcom_app',
  password: 'your_secure_password',
  ssl: { rejectUnauthorized: false } // Adjust for your SSL setup
});

app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Role checking middleware
const requireAdmin = async (req, res, next) => {
  const { rows } = await pool.query(
    'SELECT role FROM user_roles WHERE user_id = $1',
    [req.user.id]
  );
  
  if (!rows[0] || rows[0].role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Example: User login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Get user from auth schema
    const { rows } = await pool.query(
      'SELECT id, email, encrypted_password FROM auth.users WHERE email = $1',
      [email]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.encrypted_password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example: Get products with department filtering
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    // Get user's department
    const { rows: profiles } = await pool.query(
      'SELECT department_id FROM profiles WHERE id = $1',
      [req.user.id]
    );
    
    const departmentId = profiles[0]?.department_id;
    
    // Check if admin
    const { rows: roles } = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [req.user.id]
    );
    
    const isAdmin = roles[0]?.role === 'admin';
    
    let query = 'SELECT * FROM products WHERE is_archived = false';
    let params = [];
    
    // Apply department filter for non-admins
    if (!isAdmin && departmentId) {
      query += ' AND department_id = $1';
      params = [departmentId];
    }
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example: Create sale
app.post('/api/sales', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { saleData, items } = req.body;
    
    // Get user's department
    const { rows: profiles } = await client.query(
      'SELECT department_id FROM profiles WHERE id = $1',
      [req.user.id]
    );
    
    const departmentId = profiles[0]?.department_id;
    
    // Generate receipt number
    const { rows: receiptRows } = await client.query(
      "SELECT generate_receipt_number() as receipt_number"
    );
    
    // Insert sale
    const { rows: saleRows } = await client.query(
      `INSERT INTO sales (
        receipt_number, department_id, customer_id, subtotal, discount, 
        total, amount_paid, change_amount, payment_method, cashier_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        receiptRows[0].receipt_number,
        departmentId,
        saleData.customer_id,
        saleData.subtotal,
        saleData.discount,
        saleData.total,
        saleData.amount_paid,
        saleData.change_amount,
        saleData.payment_method,
        saleData.cashier_name
      ]
    );
    
    const sale = saleRows[0];
    
    // Insert sale items and update stock
    for (const item of items) {
      await client.query(
        `INSERT INTO sale_items (
          sale_id, product_id, variant_id, item_name, quantity, 
          unit_price, subtotal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sale.id,
          item.product_id,
          item.variant_id,
          item.item_name,
          item.quantity,
          item.unit_price,
          item.subtotal
        ]
      );
      
      // Update stock
      if (item.variant_id) {
        await client.query(
          'UPDATE product_variants SET current_stock = current_stock - $1 WHERE id = $2',
          [item.quantity, item.variant_id]
        );
      } else {
        await client.query(
          'UPDATE products SET current_stock = current_stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json(sale);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Add more endpoints for all your edge functions...
// - create-staff-user
// - delete-user
// - toggle-user-activation
// - admin-reset-password
// - sync-existing-users
// - process-mobile-payment
// - send-invoice-email
// - send-credit-notification
// - check-low-stock
// - daily-backup

app.listen(3001, () => {
  console.log('API server running on port 3001');
});
```

---

## Phase 4: Frontend Migration

### Step 1: Remove Supabase Client
```bash
npm uninstall @supabase/supabase-js
```

### Step 2: Create API Client
```typescript
// src/lib/api-client.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getProducts() {
    return this.request('/products');
  }

  async createSale(saleData: any, items: any[]) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify({ saleData, items }),
    });
  }

  // Add more methods for all API endpoints...
}

export const apiClient = new ApiClient();
```

### Step 3: Update React Queries
Replace all Supabase queries with API client calls:

```typescript
// Before (Supabase)
const { data: products } = useQuery({
  queryKey: ['products'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_archived', false);
    
    if (error) throw error;
    return data;
  },
});

// After (API Client)
const { data: products } = useQuery({
  queryKey: ['products'],
  queryFn: () => apiClient.getProducts(),
});
```

### Step 4: Update Environment Variables
```env
# .env
VITE_API_URL=https://your-api-domain.com/api
```

---

## Phase 5: File Storage Setup

### Option 1: Self-Hosted MinIO
```bash
# Install MinIO
docker run -p 9000:9000 -p 9001:9001 \
  --name minio \
  -v ~/minio/data:/data \
  -e "MINIO_ROOT_USER=admin" \
  -e "MINIO_ROOT_PASSWORD=your_password" \
  minio/minio server /data --console-address ":9001"
```

### Option 2: AWS S3 Compatible Storage
```javascript
// server.js - Add file upload endpoint
import multer from 'multer';
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.S3_ENDPOINT, // For MinIO
  s3ForcePathStyle: true,
});

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload/:bucket', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const params = {
      Bucket: req.params.bucket,
      Key: req.file.originalname,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };
    
    const result = await s3.upload(params).promise();
    res.json({ url: result.Location });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

---

## Phase 6: Testing & Validation

### Checklist:
- [ ] All database tables have data
- [ ] All users can log in
- [ ] Department isolation works correctly
- [ ] Sales can be created and recorded
- [ ] Inventory updates correctly
- [ ] Reports generate correctly
- [ ] File uploads/downloads work
- [ ] Mobile money transactions work
- [ ] Email notifications work (if using)
- [ ] Reconciliations work
- [ ] Credit system works
- [ ] PWA still functions offline

### Test Each Department:
- [ ] Cyber Cafe department
- [ ] Perfume department
- [ ] Mobile Money department
- [ ] Other departments

---

## Phase 7: Deployment

### Backend Deployment Options:
1. **VPS (DigitalOcean, Linode, etc.)**
   - Install Node.js, PM2, Nginx
   - Configure SSL with Let's Encrypt
   
2. **Docker Container**
   ```dockerfile
   FROM node:18
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 3001
   CMD ["node", "server.js"]
   ```

3. **Kubernetes** (for high availability)

### Frontend Deployment:
- Build: `npm run build`
- Deploy to: Vercel, Netlify, your VPS, etc.
- Update `VITE_API_URL` to production API URL

---

## Critical Notes

1. **RLS Policies**: You lose PostgreSQL RLS. All access control must be implemented in your API layer.

2. **Real-time Features**: You'll need to implement WebSockets or Server-Sent Events for real-time updates.

3. **Authentication**: You're responsible for password hashing, token management, and security.

4. **Backups**: Set up automated PostgreSQL backups:
   ```bash
   # Cron job example
   0 2 * * * pg_dump -h localhost -U dotcom_app dotcom_buzi | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
   ```

5. **Monitoring**: Set up monitoring for your database and API server.

---

## Cost Comparison

**Current (Lovable Cloud)**: $0-25/month
**Self-Hosted**:
- VPS: $5-40/month
- Database backup storage: $5/month
- SSL certificate: Free (Let's Encrypt)
- Monitoring: $0-10/month
- **Total**: ~$10-55/month + your time for maintenance

---

## Support Required From You

To complete this migration, you'll need to provide:
1. Your PostgreSQL server connection details
2. Preferred authentication method
3. File storage solution preference
4. Backend hosting preference
5. Any specific security requirements

**Estimated Time**: 40-80 hours for full migration

Would you like me to start with any specific phase first?
