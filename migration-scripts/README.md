# DOTCOM BUZI POS - Migration Scripts

This directory contains scripts to migrate your POS system from Lovable Cloud to your self-hosted infrastructure.

## Phase 1: PostgreSQL Database Setup

**Start here first!** Before exporting data, you need a PostgreSQL database ready to receive it.

See: [PHASE1-POSTGRESQL-SETUP.md](./PHASE1-POSTGRESQL-SETUP.md)

## Phase 2: Data Export & Backup

These scripts create a complete backup of your current system without affecting your live application.

### Prerequisites

1. **Install PostgreSQL Client Tools** (for database export):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   
   # macOS
   brew install postgresql
   
   # Windows
   # Download from: https://www.postgresql.org/download/windows/
   ```

2. **Install Node.js** (for storage export):
   ```bash
   # Must be Node.js 18+
   node --version
   ```

3. **Get Your Database Password**:
   - You'll need the full database connection string
   - Contact Lovable support or check your project settings
   - Format: `postgresql://postgres.PROJECT_ID:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`

### Step-by-Step Instructions

#### Step 1: Prepare the Scripts

```bash
# Navigate to your project
cd /path/to/your/project

# Make export scripts executable
chmod +x migration-scripts/1-export-database.sh
chmod +x migration-scripts/2-export-storage.js

# Install required Node packages
npm install @supabase/supabase-js
```

#### Step 2: Export Database

```bash
# Edit 1-export-database.sh and replace YOUR_DB_PASSWORD with your actual password
nano migration-scripts/1-export-database.sh
# OR use your preferred text editor

# Run the database export
./migration-scripts/1-export-database.sh
```

**What this does:**
- Exports all table structures (schema)
- Exports all data from these tables:
  - `appointments`, `categories`, `credits`, `customers`
  - `departments`, `expenses`, `products`, `sales`
  - `sale_items`, `profiles`, `user_roles`
  - And 30+ more tables
- Exports user authentication data
- Exports all database functions
- Creates an inventory report

**Time estimate:** 2-5 minutes depending on data size

**Expected output:**
```
✓ Public schema structure exported
✓ Public schema data exported
✓ Auth schema structure exported
✓ Auth schema data exported
✓ Database functions exported
✓ Data inventory created
```

#### Step 3: Export Storage Files

```bash
# Run the storage export
node migration-scripts/2-export-storage.js
```

**What this does:**
- Downloads all files from these buckets:
  - `backups` - Your automated backups
  - `perfume-products` - Product images for perfume department
  - `department-logos` - Logo images for each department
- Creates a JSON summary of the export

**Time estimate:** 1-10 minutes depending on file count/size

**Expected output:**
```
Exporting bucket: backups
──────────────────────────────────────────────────
  Found 5 file(s)
  Downloading: backup_20250115.sql... ✓
  Downloading: backup_20250120.sql... ✓
  ...

=== Export Complete ===
Total files processed: 47
  ✓ Successfully downloaded: 47
```

### Verify Your Export

After running both scripts, you should have:

```
migration-export-YYYYMMDD-HHMMSS/
├── schema-public.sql       (Database structure)
├── data-public.sql         (All business data)
├── schema-auth.sql         (Auth structure)
├── data-auth.sql           (User accounts)
├── functions.sql           (Database functions)
└── data-inventory.txt      (Record counts)

storage-export-YYYYMMDD-HHMMSS/
├── backups/
│   └── [your backup files]
├── perfume-products/
│   └── [product images]
├── department-logos/
│   └── [logo images]
└── export-summary.json
```

### Troubleshooting

**"pg_dump: command not found"**
- Install PostgreSQL client tools (see Prerequisites)

**"FATAL: password authentication failed"**
- Check your database password in the script
- Verify the connection string format

**"Error: connect ECONNREFUSED"**
- Check your internet connection
- Verify the Supabase URL is correct

**"Error listing files" in storage export**
- Check that the Supabase key is correct
- Verify the buckets exist in your project

### Data Safety

- ✅ These scripts are **READ-ONLY** - they don't modify your live system
- ✅ Your application continues running normally during export
- ✅ You can run these scripts multiple times safely
- ✅ Keep these exports as backups even after migration

### Next Steps

Once your export completes successfully:

1. **Verify the data**:
   ```bash
   # Check record counts
   cat migration-export-*/data-inventory.txt
   
   # Check storage summary
   cat storage-export-*/export-summary.json
   ```

2. **Back up the exports**:
   ```bash
   # Create a compressed backup
   tar -czf dotcom-buzi-export-$(date +%Y%m%d).tar.gz \
     migration-export-* \
     storage-export-*
   
   # Copy to safe location (external drive, cloud storage, etc.)
   ```

3. **Ready for Phase 2**: Setting up your self-hosted database

---

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the error messages carefully
3. Ensure all prerequisites are installed
4. Make sure your database password is correct

**Important**: Keep your export files secure - they contain all your business data and customer information!
