#!/bin/bash
# Phase 1: Export Database Schema and Data
# This script exports your complete database from Lovable Cloud

set -e  # Exit on any error

echo "=== DOTCOM BUZI POS - Database Export Script ==="
echo ""

# Create export directory
EXPORT_DIR="./migration-export-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EXPORT_DIR"

echo "Export directory: $EXPORT_DIR"
echo ""

# Database connection details (from your .env)
export SUPABASE_PROJECT_ID="nitkbpmyyfrhlmnfbdvu"
export SUPABASE_DB_URL="postgresql://postgres.nitkbpmyyfrhlmnfbdvu:YOUR_DB_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

echo "Step 1: Exporting public schema structure..."
pg_dump "$SUPABASE_DB_URL" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  > "$EXPORT_DIR/schema-public.sql"
echo "✓ Public schema structure exported"

echo ""
echo "Step 2: Exporting public schema data..."
pg_dump "$SUPABASE_DB_URL" \
  --schema=public \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-privileges \
  > "$EXPORT_DIR/data-public.sql"
echo "✓ Public schema data exported"

echo ""
echo "Step 3: Exporting auth schema structure..."
pg_dump "$SUPABASE_DB_URL" \
  --schema=auth \
  --schema-only \
  --no-owner \
  --no-privileges \
  > "$EXPORT_DIR/schema-auth.sql"
echo "✓ Auth schema structure exported"

echo ""
echo "Step 4: Exporting auth schema data..."
pg_dump "$SUPABASE_DB_URL" \
  --schema=auth \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-privileges \
  > "$EXPORT_DIR/data-auth.sql"
echo "✓ Auth schema data exported"

echo ""
echo "Step 5: Exporting database functions..."
pg_dump "$SUPABASE_DB_URL" \
  --schema=public \
  --schema=auth \
  --routines-only \
  --no-owner \
  --no-privileges \
  > "$EXPORT_DIR/functions.sql"
echo "✓ Database functions exported"

echo ""
echo "Step 6: Creating data inventory..."
psql "$SUPABASE_DB_URL" -c "
SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM public.\"\$tablename\") as row_count
FROM pg_tables
WHERE schemaname IN ('public', 'auth')
ORDER BY schemaname, tablename;
" > "$EXPORT_DIR/data-inventory.txt"
echo "✓ Data inventory created"

echo ""
echo "=== Export Complete ==="
echo "All files saved to: $EXPORT_DIR"
echo ""
echo "Files created:"
echo "  - schema-public.sql    (Database structure)"
echo "  - data-public.sql      (All your data)"
echo "  - schema-auth.sql      (Auth structure)"
echo "  - data-auth.sql        (User accounts)"
echo "  - functions.sql        (Database functions)"
echo "  - data-inventory.txt   (Record counts)"
echo ""
echo "Next step: Run './2-export-storage.js' to backup files"
