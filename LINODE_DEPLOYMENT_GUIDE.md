# Complete Self-Hosted Deployment Guide for Linode

This guide covers deploying your POS application to a Linode server with PostgreSQL database.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Phase 1: Linode Server Setup](#phase-1-linode-server-setup)
3. [Phase 2: PostgreSQL Database Setup](#phase-2-postgresql-database-setup)
4. [Phase 3: Export Data from Lovable Cloud](#phase-3-export-data-from-lovable-cloud)
5. [Phase 4: Import Data to PostgreSQL](#phase-4-import-data-to-postgresql)
6. [Phase 5: Backend API Deployment](#phase-5-backend-api-deployment)
7. [Phase 6: Frontend Deployment](#phase-6-frontend-deployment)
8. [Phase 7: Domain & SSL Setup](#phase-7-domain--ssl-setup)
9. [Phase 8: File Storage Setup](#phase-8-file-storage-setup)
10. [Phase 9: Backup & Monitoring](#phase-9-backup--monitoring)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:
- A Linode account (https://www.linode.com)
- A domain name (optional but recommended)
- SSH client (Terminal on Mac/Linux, PuTTY on Windows)
- Basic command-line knowledge

---

## Phase 1: Linode Server Setup

### Step 1.1: Create a Linode Instance

1. Log into Linode Dashboard
2. Click **Create Linode**
3. Choose configuration:
   - **Image**: Ubuntu 22.04 LTS
   - **Region**: Choose closest to your users
   - **Plan**: Shared CPU - Linode 4GB ($24/month) or higher recommended
   - **Label**: `dotcom-pos-server`
   - **Root Password**: Set a strong password
   - **SSH Keys**: Add your SSH public key (recommended)

4. Click **Create Linode**

### Step 1.2: Initial Server Setup

SSH into your server:
```bash
ssh root@YOUR_LINODE_IP
```

Update system packages:
```bash
apt update && apt upgrade -y
```

Create a non-root user:
```bash
adduser dotcom
usermod -aG sudo dotcom
```

Set up SSH for new user:
```bash
mkdir -p /home/dotcom/.ssh
cp ~/.ssh/authorized_keys /home/dotcom/.ssh/
chown -R dotcom:dotcom /home/dotcom/.ssh
chmod 700 /home/dotcom/.ssh
chmod 600 /home/dotcom/.ssh/authorized_keys
```

### Step 1.3: Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5432/tcp  # PostgreSQL (only if remote access needed)
ufw enable
```

### Step 1.4: Install Required Software

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v20.x
npm --version

# Install PM2 for process management
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git
```

---

## Phase 2: PostgreSQL Database Setup

### Step 2.1: Install PostgreSQL

```bash
# Add PostgreSQL repository
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

# Install PostgreSQL 15
apt update
apt install -y postgresql-15 postgresql-contrib-15

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql
```

### Step 2.2: Create Database and User

```bash
sudo -u postgres psql
```

Run these SQL commands:
```sql
-- Create the database
CREATE DATABASE dotcom_buzi_pos;

-- Create application user with strong password
CREATE USER dotcom_app WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD_HERE';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dotcom_buzi_pos TO dotcom_app;

-- Connect to the database
\c dotcom_buzi_pos

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO dotcom_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dotcom_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dotcom_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dotcom_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO dotcom_app;

-- Create UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Exit
\q
```

**IMPORTANT**: Replace `YOUR_STRONG_PASSWORD_HERE` with a secure password. Save this password!

### Step 2.3: Configure PostgreSQL for Remote Access (Optional)

If you need remote database access:

Edit `postgresql.conf`:
```bash
nano /etc/postgresql/15/main/postgresql.conf
```

Find and modify:
```
listen_addresses = '*'
```

Edit `pg_hba.conf`:
```bash
nano /etc/postgresql/15/main/pg_hba.conf
```

Add this line:
```
host    dotcom_buzi_pos    dotcom_app    0.0.0.0/0    md5
```

Restart PostgreSQL:
```bash
systemctl restart postgresql
```

### Step 2.4: Create Database Schema

Create the schema file:
```bash
sudo -u postgres psql -d dotcom_buzi_pos
```

Copy and paste the contents from `backend/setup-all-tables.sql` or run:
```bash
sudo -u postgres psql -d dotcom_buzi_pos -f /path/to/setup-all-tables.sql
```

---

## Phase 3: Export Data from Lovable Cloud

### Step 3.1: Export Database

On your local machine where you have the project:

```bash
cd migration-scripts

# Install dependencies
npm install

# Make export script executable
chmod +x 1-export-database.sh

# Run export (requires Supabase CLI configured)
./1-export-database.sh
```

### Step 3.2: Export Storage Files

```bash
node 2-export-storage.js
```

### Step 3.3: Transfer Files to Server

```bash
# From your local machine
scp -r exports/ dotcom@YOUR_LINODE_IP:/home/dotcom/
```

---

## Phase 4: Import Data to PostgreSQL

### Step 4.1: Import Schema

SSH into your server:
```bash
ssh dotcom@YOUR_LINODE_IP
```

Import the schema:
```bash
sudo -u postgres psql -d dotcom_buzi_pos < /home/dotcom/exports/schema-complete.sql
```

### Step 4.2: Import Data

```bash
# Navigate to exports directory
cd /home/dotcom/exports

# Create import script
cat > import-data.js << 'EOF'
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'dotcom_buzi_pos',
  user: 'dotcom_app',
  password: 'YOUR_STRONG_PASSWORD_HERE'
});

const data = JSON.parse(fs.readFileSync('./data-export.json', 'utf8'));

const tableOrder = [
  'departments',
  'profiles',
  'user_credentials',
  'user_roles',
  'categories',
  'suppliers',
  'products',
  'product_variants',
  'customers',
  'customer_preferences',
  'services',
  'sales',
  'sale_items',
  'payment_transactions',
  'expenses',
  'reconciliations',
  'settings',
  'perfume_scents',
  'perfume_pricing_config',
  'mobile_money_settings',
  'data_packages'
];

async function importData() {
  await client.connect();
  console.log('Connected to database');

  for (const table of tableOrder) {
    if (data[table] && data[table].length > 0) {
      console.log(`Importing ${data[table].length} records into ${table}...`);
      
      for (const record of data[table]) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        try {
          await client.query(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            values
          );
        } catch (err) {
          console.error(`Error inserting into ${table}:`, err.message);
        }
      }
      console.log(`✓ ${table} imported`);
    }
  }

  await client.end();
  console.log('Import complete!');
}

importData().catch(console.error);
EOF

# Install pg package and run import
npm init -y
npm install pg
node import-data.js
```

---

## Phase 5: Backend API Deployment

### Step 5.1: Clone and Setup Backend

```bash
cd /home/dotcom

# Create backend directory
mkdir -p pos-backend
cd pos-backend

# Copy backend files from your local machine or clone from GitHub
# Option 1: Clone from GitHub (if you've pushed to GitHub)
git clone YOUR_GITHUB_REPO_URL .

# Option 2: Upload directly
# scp -r backend/* dotcom@YOUR_LINODE_IP:/home/dotcom/pos-backend/
```

### Step 5.2: Configure Environment Variables

```bash
cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dotcom_buzi_pos
DB_USER=dotcom_app
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Configuration
JWT_SECRET=YOUR_VERY_LONG_RANDOM_SECRET_KEY_AT_LEAST_64_CHARACTERS

# File Storage
UPLOAD_DIR=/home/dotcom/pos-uploads
MAX_FILE_SIZE=10485760

# Backup Configuration
BACKUP_DIR=/home/dotcom/pos-backups
BACKUP_RETENTION_DAYS=30
EOF
```

Generate a secure JWT secret:
```bash
openssl rand -base64 64
```

### Step 5.3: Install Dependencies and Start

```bash
npm install

# Create upload and backup directories
mkdir -p /home/dotcom/pos-uploads
mkdir -p /home/dotcom/pos-backups

# Test the server
node server.js

# If successful, stop it (Ctrl+C) and use PM2
pm2 start server.js --name "pos-backend"
pm2 save
pm2 startup
```

---

## Phase 6: Frontend Deployment

### Step 6.1: Build Frontend Locally

On your local machine:

```bash
# Update environment variables for production
cat > .env.production << 'EOF'
VITE_API_URL=https://api.yourdomain.com
VITE_LOCAL_BACKEND=true
EOF

# Build for production
npm run build
```

### Step 6.2: Upload to Server

```bash
# Transfer build files
scp -r dist/* dotcom@YOUR_LINODE_IP:/var/www/pos/
```

On the server:
```bash
# Create web directory
sudo mkdir -p /var/www/pos
sudo chown -R dotcom:dotcom /var/www/pos
```

---

## Phase 7: Domain & SSL Setup

### Step 7.1: Configure Nginx

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/pos
```

Add this configuration:
```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/pos;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /uploads/ {
        alias /home/dotcom/pos-uploads/;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/pos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7.2: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal is configured automatically
# Test with: sudo certbot renew --dry-run
```

### Step 7.3: Configure DNS

In your domain registrar or Linode DNS Manager:

| Type | Host | Value |
|------|------|-------|
| A | @ | YOUR_LINODE_IP |
| A | www | YOUR_LINODE_IP |
| A | api | YOUR_LINODE_IP |

---

## Phase 8: File Storage Setup

### Step 8.1: Create Storage Directories

```bash
mkdir -p /home/dotcom/pos-uploads/{logos,products,documents,backups}
chmod -R 755 /home/dotcom/pos-uploads
```

### Step 8.2: Configure Nginx for Static Files

Already configured in Phase 7. Files uploaded to `/home/dotcom/pos-uploads/` will be accessible at `https://yourdomain.com/uploads/`.

---

## Phase 9: Backup & Monitoring

### Step 9.1: Automated Database Backups

Create backup script:
```bash
cat > /home/dotcom/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/dotcom/pos-backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="dotcom_pos_backup_$DATE.sql.gz"

# Create backup
pg_dump -U dotcom_app -h localhost dotcom_buzi_pos | gzip > "$BACKUP_DIR/$FILENAME"

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup created: $FILENAME"
EOF

chmod +x /home/dotcom/backup-database.sh
```

Add to crontab for daily backups:
```bash
crontab -e
```

Add this line:
```
0 2 * * * /home/dotcom/backup-database.sh >> /home/dotcom/backup.log 2>&1
```

### Step 9.2: Setup PM2 Monitoring

```bash
# View logs
pm2 logs pos-backend

# Monitor
pm2 monit

# Setup log rotation
pm2 install pm2-logrotate
```

### Step 9.3: Server Health Monitoring

Install monitoring tools:
```bash
# Install htop for system monitoring
apt install -y htop

# View system resources
htop

# Check disk usage
df -h

# Check memory
free -m
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
pm2 logs pos-backend

# Verify database connection
psql -U dotcom_app -h localhost -d dotcom_buzi_pos

# Check port availability
netstat -tlnp | grep 3001
```

### Database Connection Issues

```bash
# Check PostgreSQL status
systemctl status postgresql

# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-15-main.log

# Verify user permissions
sudo -u postgres psql -c "\du"
```

### Nginx Errors

```bash
# Test configuration
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log

# Reload after changes
systemctl reload nginx
```

### SSL Certificate Issues

```bash
# Renew certificates manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### File Upload Issues

```bash
# Check directory permissions
ls -la /home/dotcom/pos-uploads/

# Fix permissions if needed
chown -R dotcom:dotcom /home/dotcom/pos-uploads
chmod -R 755 /home/dotcom/pos-uploads
```

---

## Quick Reference

### Important Paths

| Purpose | Path |
|---------|------|
| Backend | `/home/dotcom/pos-backend` |
| Frontend | `/var/www/pos` |
| Uploads | `/home/dotcom/pos-uploads` |
| Backups | `/home/dotcom/pos-backups` |
| Nginx Config | `/etc/nginx/sites-available/pos` |
| SSL Certs | `/etc/letsencrypt/live/yourdomain.com/` |

### Important Commands

```bash
# Backend
pm2 restart pos-backend
pm2 logs pos-backend
pm2 status

# Database
sudo -u postgres psql -d dotcom_buzi_pos
pg_dump -U dotcom_app dotcom_buzi_pos > backup.sql

# Nginx
sudo nginx -t
sudo systemctl reload nginx

# SSL
sudo certbot renew --dry-run
```

### Ports

| Service | Port |
|---------|------|
| Backend API | 3001 |
| PostgreSQL | 5432 |
| HTTP | 80 |
| HTTPS | 443 |

---

## Security Checklist

- [ ] Strong passwords for all accounts
- [ ] SSH key authentication enabled
- [ ] Password authentication disabled for SSH
- [ ] Firewall configured (UFW)
- [ ] SSL certificates installed
- [ ] Regular backups configured
- [ ] Database user has minimal required permissions
- [ ] Environment variables secured
- [ ] Logs monitored

---

## Cost Estimate (Monthly)

| Resource | Cost |
|----------|------|
| Linode 4GB | $24 |
| Domain | ~$1 |
| SSL | Free (Let's Encrypt) |
| **Total** | **~$25/month** |

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review PM2 and Nginx logs
3. Verify database connectivity
4. Check firewall rules

Your self-hosted POS system is now ready for production use!
