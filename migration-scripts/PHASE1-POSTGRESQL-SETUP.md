# Phase 1: PostgreSQL Database Setup

This guide will help you set up a self-hosted PostgreSQL database on your machine to receive your application data.

## Prerequisites

- A computer running Linux, macOS, or Windows
- Administrator/root access to install software
- Basic command-line knowledge

## Step 1: Install PostgreSQL

### On Ubuntu/Debian Linux

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### On macOS

```bash
# Install using Homebrew
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
```

### On Windows

1. Download PostgreSQL installer from: https://www.postgresql.org/download/windows/
2. Run the installer (choose PostgreSQL 15 or later)
3. During installation:
   - Note down the password you set for the `postgres` user
   - Default port: 5432
   - Default locale: Use your system locale
4. Verify installation by opening Command Prompt:
   ```cmd
   psql --version
   ```

## Step 2: Access PostgreSQL

### Linux/macOS

```bash
# Switch to postgres user
sudo -u postgres psql
```

### Windows

```cmd
# Open Command Prompt and run
psql -U postgres
```

You'll be prompted for the password you set during installation.

## Step 3: Create Your Application Database

Once inside the PostgreSQL shell (you'll see a `postgres=#` prompt):

```sql
-- Create the database
CREATE DATABASE dotcom_buzi_pos;

-- Create a dedicated application user
CREATE USER dotcom_app WITH ENCRYPTED PASSWORD 'your_secure_password_here';

-- Grant all privileges on the database to the app user
GRANT ALL PRIVILEGES ON DATABASE dotcom_buzi_pos TO dotcom_app;

-- Connect to the new database
\c dotcom_buzi_pos

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO dotcom_app;

-- Exit PostgreSQL
\q
```

**IMPORTANT:** Replace `your_secure_password_here` with a strong password. Save this password securely - you'll need it later.

## Step 4: Configure PostgreSQL for Network Access

By default, PostgreSQL only accepts local connections. If your database and app will be on different machines, you need to enable network access.

### Find Configuration Files

#### Linux
```bash
sudo find /etc/postgresql -name "postgresql.conf"
sudo find /etc/postgresql -name "pg_hba.conf"
```

#### macOS (Homebrew)
```bash
# Usually in:
/opt/homebrew/var/postgresql@15/postgresql.conf
/opt/homebrew/var/postgresql@15/pg_hba.conf
```

#### Windows
```
C:\Program Files\PostgreSQL\15\data\postgresql.conf
C:\Program Files\PostgreSQL\15\data\pg_hba.conf
```

### Edit postgresql.conf

```bash
# Open the file with your preferred editor
sudo nano /path/to/postgresql.conf
```

Find and uncomment/modify this line:
```
listen_addresses = 'localhost'  # Change to '*' for all interfaces or specific IP
```

For local-only access (recommended to start):
```
listen_addresses = 'localhost'
```

For network access (if needed):
```
listen_addresses = '*'
```

### Edit pg_hba.conf

```bash
sudo nano /path/to/pg_hba.conf
```

Add this line for local connections:
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   dotcom_buzi_pos dotcom_app                              md5
host    dotcom_buzi_pos dotcom_app      127.0.0.1/32            md5
host    dotcom_buzi_pos dotcom_app      ::1/128                 md5
```

For network access (if your app is on another machine):
```
host    dotcom_buzi_pos dotcom_app      0.0.0.0/0               md5
```

### Restart PostgreSQL

#### Linux
```bash
sudo systemctl restart postgresql
```

#### macOS
```bash
brew services restart postgresql@15
```

#### Windows
```cmd
# Open Services (services.msc) and restart "postgresql-x64-15"
# Or use Command Prompt as Administrator:
net stop postgresql-x64-15
net start postgresql-x64-15
```

## Step 5: Test Your Connection

Create a test connection string:

```bash
postgresql://dotcom_app:your_secure_password_here@localhost:5432/dotcom_buzi_pos
```

### Test with psql

```bash
psql "postgresql://dotcom_app:your_secure_password_here@localhost:5432/dotcom_buzi_pos"
```

If successful, you should see:
```
dotcom_buzi_pos=>
```

### Test with Node.js (Optional)

Create a file `test-connection.js`:

```javascript
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'dotcom_buzi_pos',
  user: 'dotcom_app',
  password: 'your_secure_password_here'
});

client.connect()
  .then(() => {
    console.log('✓ Successfully connected to PostgreSQL!');
    return client.query('SELECT version()');
  })
  .then(result => {
    console.log('PostgreSQL version:', result.rows[0].version);
    return client.end();
  })
  .catch(err => {
    console.error('✗ Connection failed:', err.message);
  });
```

Run it:
```bash
npm install pg
node test-connection.js
```

## Step 6: Note Your Connection Details

Save these details for the next phases:

```
Database Host: localhost (or your server IP)
Database Port: 5432
Database Name: dotcom_buzi_pos
Database User: dotcom_app
Database Password: [your password]

Full Connection String:
postgresql://dotcom_app:your_secure_password_here@localhost:5432/dotcom_buzi_pos
```

## Troubleshooting

### "psql: command not found"
- Make sure PostgreSQL bin directory is in your PATH
- Linux: Add `/usr/lib/postgresql/15/bin` to PATH
- macOS: Add `/opt/homebrew/opt/postgresql@15/bin` to PATH
- Windows: Add `C:\Program Files\PostgreSQL\15\bin` to PATH

### "FATAL: Peer authentication failed"
- Edit `pg_hba.conf` and change `peer` to `md5` for local connections
- Restart PostgreSQL

### "Connection refused"
- Check if PostgreSQL is running: `sudo systemctl status postgresql` (Linux)
- Verify port 5432 is open: `netstat -an | grep 5432`
- Check firewall settings

### "password authentication failed"
- Double-check the password you set
- Try resetting the password:
  ```sql
  ALTER USER dotcom_app WITH PASSWORD 'new_password';
  ```

## Security Best Practices

1. **Use strong passwords**: Mix uppercase, lowercase, numbers, and special characters
2. **Limit network access**: Only allow connections from trusted IPs
3. **Regular backups**: Set up automated backups (we'll cover this in later phases)
4. **Keep PostgreSQL updated**: Regularly update to the latest stable version
5. **Use SSL/TLS**: For production, enable SSL connections
6. **Firewall rules**: Only expose PostgreSQL port to necessary machines

## Next Steps

Once your PostgreSQL database is set up and you can connect successfully:

1. ✓ **You are here** - PostgreSQL database is ready
2. **Phase 2**: Export your current data from Lovable Cloud
3. **Phase 3**: Import data into your PostgreSQL database
4. **Phase 4**: Set up Node.js backend API
5. **Phase 5**: Update frontend to use new backend
6. **Phase 6**: Set up local file storage
7. **Phase 7**: Test and deploy

---

## Ready to Continue?

Once you've successfully:
- ✓ Installed PostgreSQL
- ✓ Created the `dotcom_buzi_pos` database
- ✓ Created the `dotcom_app` user
- ✓ Tested the connection

You're ready for **Phase 2: Data Export & Backup**!
