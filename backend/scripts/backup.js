import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.DB_NAME || 'dotcom_buzi_pos';
const DB_USER = process.env.DB_USER || 'dotcom_app';
const BACKUP_DIR = './backups';

async function createBackup() {
  try {
    // Ensure backup directory exists
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    console.log(`Creating database backup: ${filename}`);

    // Run pg_dump
    const command = `pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -F p -f "${filepath}" ${DB_NAME}`;
    await execAsync(command);

    console.log(`✓ Backup created successfully: ${filepath}`);

    // Clean old backups (keep last 30 days)
    await cleanOldBackups();

    return filepath;
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

async function cleanOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    for (const file of files) {
      if (!file.startsWith('backup-')) continue;
      
      const filepath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filepath);
      
      if (stats.mtimeMs < thirtyDaysAgo) {
        await fs.unlink(filepath);
        console.log(`Deleted old backup: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning old backups:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createBackup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { createBackup, cleanOldBackups };
