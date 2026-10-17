/**
 * Zan-Gi Database & Media Restoration Utility
 * Phase 1 Migration Preparation
 *
 * Safely restores databases and media from a timestamped backup snapshot:
 * - Supports dry-run validation to verify file integrity and SHA-256 checksums
 * - Supports restoring to live /data and /uploads directories
 * - Never deletes data outside the snapshot scope
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface ManifestFileEntry {
  relativePath: string;
  sizeBytes: number;
  sha256: string;
}

interface BackupManifest {
  backupId: string;
  createdAt: string;
  sourceEnvironment: string;
  recordCounts: Record<string, number>;
  files: ManifestFileEntry[];
}

function calculateFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

export function restoreFromBackup(options?: {
  backupIdOrPath?: string;
  dryRun?: boolean;
}): { success: boolean; verifiedFiles: number; restoredFiles: number; message: string } {
  const dryRun = options?.dryRun ?? false;
  const backupsRootDir = path.resolve(process.cwd(), 'backups');

  if (!fs.existsSync(backupsRootDir)) {
    throw new Error(`Backups directory not found at ${backupsRootDir}`);
  }

  let selectedBackupDir = '';

  if (options?.backupIdOrPath) {
    if (path.isAbsolute(options.backupIdOrPath)) {
      selectedBackupDir = options.backupIdOrPath;
    } else if (fs.existsSync(path.join(backupsRootDir, options.backupIdOrPath))) {
      selectedBackupDir = path.join(backupsRootDir, options.backupIdOrPath);
    } else {
      selectedBackupDir = path.resolve(process.cwd(), options.backupIdOrPath);
    }
  } else {
    // Pick most recent backup directory
    const available = fs
      .readdirSync(backupsRootDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('backup_'))
      .map((d) => d.name)
      .sort()
      .reverse();

    if (available.length === 0) {
      throw new Error('No timestamped backups found in backups/ directory.');
    }
    selectedBackupDir = path.join(backupsRootDir, available[0]);
  }

  console.log(`[Restore] Target backup snapshot: ${selectedBackupDir}`);
  console.log(`[Restore] Mode: ${dryRun ? 'DRY-RUN (Validation only)' : 'LIVE RESTORATION'}`);

  const manifestPath = path.join(selectedBackupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Corrupt backup: manifest.json missing in ${selectedBackupDir}`);
  }

  const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`[Restore] Backup Created At: ${manifest.createdAt}`);
  console.log(`[Restore] Tracked Entities:`, manifest.recordCounts);

  let verifiedFiles = 0;
  let restoredFiles = 0;

  // 1. Verify SHA-256 for all snapshot files
  for (const entry of manifest.files) {
    const backupFilePath = path.join(selectedBackupDir, entry.relativePath);
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Integrity check failed: missing file ${backupFilePath}`);
    }
    const computedSha = calculateFileSha256(backupFilePath);
    if (computedSha !== entry.sha256) {
      throw new Error(
        `Integrity check failed: checksum mismatch for ${entry.relativePath}. Expected ${entry.sha256}, got ${computedSha}`
      );
    }
    verifiedFiles++;
  }
  console.log(`  ✓ Checksum integrity verified for all ${verifiedFiles} files.`);

  // 2. Perform restoration if not dry-run
  if (!dryRun) {
    for (const entry of manifest.files) {
      const srcFile = path.join(selectedBackupDir, entry.relativePath);
      const destFile = path.resolve(process.cwd(), entry.relativePath);
      const destDir = path.dirname(destFile);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.copyFileSync(srcFile, destFile);
      restoredFiles++;
    }
    console.log(`  ✓ Restored ${restoredFiles} files to live project directories.`);
  }

  const message = dryRun
    ? `Dry-run completed successfully. All ${verifiedFiles} files verified with valid SHA-256 checksums.`
    : `Restoration completed successfully. Restored ${restoredFiles} files from ${manifest.backupId}.`;

  console.log(`[Restore] ${message}`);
  return {
    success: true,
    verifiedFiles,
    restoredFiles,
    message,
  };
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('restore.ts')) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const targetId = args.find((a) => !a.startsWith('--'));

  try {
    restoreFromBackup({ backupIdOrPath: targetId, dryRun: isDryRun });
  } catch (err: any) {
    console.error('[Restore] Restoration error:', err.message || err);
    process.exit(1);
  }
}
