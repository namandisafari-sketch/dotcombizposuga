#!/usr/bin/env node
/**
 * Phase 1: Export Storage Files
 * This script downloads all files from Supabase storage buckets
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase connection (from your .env)
const supabaseUrl = 'https://nitkbpmyyfrhlmnfbdvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdGticG15eWZyaGxtbmZiZHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NzkzODUsImV4cCI6MjA3NzU1NTM4NX0.ux3SlY8FzYa8Ntp37o8-Y80DeNMT28oOXJnOEe5zdRU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Storage buckets to export
const BUCKETS = ['backups', 'perfume-products', 'department-logos'];

// Create export directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const EXPORT_DIR = path.join(__dirname, `storage-export-${timestamp}`);

console.log('=== DOTCOM BUZI POS - Storage Export Script ===\n');
console.log(`Export directory: ${EXPORT_DIR}\n`);

// Create directories
for (const bucket of BUCKETS) {
  const dir = path.join(EXPORT_DIR, bucket);
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Download a file from Supabase storage
 */
async function downloadFile(bucket, filePath, localPath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      throw error;
    }

    // Convert blob to buffer and save
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create subdirectories if needed
    const dir = path.dirname(localPath);
    fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(localPath, buffer);
    return true;
  } catch (error) {
    console.error(`  ✗ Error downloading ${filePath}:`, error.message);
    return false;
  }
}

/**
 * List and download all files from a bucket
 */
async function exportBucket(bucket) {
  console.log(`\nExporting bucket: ${bucket}`);
  console.log('─'.repeat(50));

  try {
    // List all files in bucket
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error(`  ✗ Error listing files:`, error.message);
      return { success: 0, failed: 0, total: 0 };
    }

    if (!files || files.length === 0) {
      console.log('  ℹ No files found in this bucket');
      return { success: 0, failed: 0, total: 0 };
    }

    console.log(`  Found ${files.length} file(s)\n`);

    let success = 0;
    let failed = 0;

    for (const file of files) {
      if (file.name === '.emptyFolderPlaceholder') continue;

      const localPath = path.join(EXPORT_DIR, bucket, file.name);
      process.stdout.write(`  Downloading: ${file.name}...`);

      const result = await downloadFile(bucket, file.name, localPath);
      
      if (result) {
        console.log(' ✓');
        success++;
      } else {
        console.log(' ✗');
        failed++;
      }
    }

    return { success, failed, total: files.length };
  } catch (error) {
    console.error(`  ✗ Unexpected error:`, error.message);
    return { success: 0, failed: 0, total: 0 };
  }
}

/**
 * Main export function
 */
async function exportAllStorage() {
  const results = {
    totalFiles: 0,
    totalSuccess: 0,
    totalFailed: 0,
    buckets: {}
  };

  for (const bucket of BUCKETS) {
    const result = await exportBucket(bucket);
    results.buckets[bucket] = result;
    results.totalFiles += result.total;
    results.totalSuccess += result.success;
    results.totalFailed += result.failed;
  }

  // Create summary file
  const summary = {
    exportDate: new Date().toISOString(),
    exportDirectory: EXPORT_DIR,
    ...results
  };

  fs.writeFileSync(
    path.join(EXPORT_DIR, 'export-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\n' + '='.repeat(50));
  console.log('=== Export Complete ===');
  console.log('='.repeat(50));
  console.log(`\nTotal files processed: ${results.totalFiles}`);
  console.log(`  ✓ Successfully downloaded: ${results.totalSuccess}`);
  
  if (results.totalFailed > 0) {
    console.log(`  ✗ Failed: ${results.totalFailed}`);
  }

  console.log(`\nAll files saved to: ${EXPORT_DIR}`);
  console.log(`Summary saved to: ${path.join(EXPORT_DIR, 'export-summary.json')}`);

  console.log('\n=== Bucket Breakdown ===');
  for (const [bucket, result] of Object.entries(results.buckets)) {
    console.log(`\n${bucket}:`);
    console.log(`  Total: ${result.total}`);
    console.log(`  Success: ${result.success}`);
    if (result.failed > 0) {
      console.log(`  Failed: ${result.failed}`);
    }
  }

  console.log('\n\nNext step: Run Phase 2 scripts to set up your self-hosted database');
}

// Run export
exportAllStorage().catch(console.error);
