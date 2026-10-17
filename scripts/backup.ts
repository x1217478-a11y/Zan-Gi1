/**
 * Zan-Gi Database & Media Timestamped Backup Utility
 * Phase 1 Migration Preparation
 *
 * Creates an immutable, non-destructive, timestamped snapshot of:
 * - All JSON database files (/data/users_db.json, sessions_db.json, social_db.json, audit_logs.json)
 * - Uploads media files and media index (/uploads/**)
 * - Generates SHA-256 integrity checksums and record counts in manifest.json
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
  recordCounts: {
    users: number;
    sessions: number;
    posts: number;
    reels: number;
    comments: number;
    scheduledPosts: number;
    auditLogs: number;
    mediaRecords: number;
    uploadedFiles: number;
  };
  files: ManifestFileEntry[];
}

function calculateFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function copyDirectoryRecursive(srcDir: string, destDir: string): ManifestFileEntry[] {
  const entries: ManifestFileEntry[] = [];
  if (!fs.existsSync(srcDir)) return entries;

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const items = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const item of items) {
    const srcPath = path.join(srcDir, item.name);
    const destPath = path.join(destDir, item.name);

    if (item.isDirectory()) {
      const subEntries = copyDirectoryRecursive(srcPath, destPath);
      entries.push(...subEntries);
    } else if (item.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      const stat = fs.statSync(destPath);
      entries.push({
        relativePath: path.relative(process.cwd(), destPath),
        sizeBytes: stat.size,
        sha256: calculateFileSha256(destPath),
      });
    }
  }

  return entries;
}

export function createTimestampedBackup(): { backupDir: string; manifest: BackupManifest } {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupId = `backup_${timestamp}`;
  const backupsRootDir = path.resolve(process.cwd(), 'backups');
  const targetBackupDir = path.join(backupsRootDir, backupId);

  console.log(`[Backup] Initiating snapshot: ${backupId}`);
  console.log(`[Backup] Target destination: ${targetBackupDir}`);

  if (!fs.existsSync(targetBackupDir)) {
    fs.mkdirSync(targetBackupDir, { recursive: true });
  }

  const fileManifestEntries: ManifestFileEntry[] = [];

  // 1. Snapshot JSON databases (/data)
  const sourceDataDir = path.resolve(process.cwd(), 'data');
  const backupDataDir = path.join(targetBackupDir, 'data');
  if (fs.existsSync(sourceDataDir)) {
    fs.mkdirSync(backupDataDir, { recursive: true });
    const dataFiles = fs.readdirSync(sourceDataDir);
    for (const file of dataFiles) {
      if (file.endsWith('.json')) {
        const src = path.join(sourceDataDir, file);
        const dst = path.join(backupDataDir, file);
        fs.copyFileSync(src, dst);
        const stat = fs.statSync(dst);
        fileManifestEntries.push({
          relativePath: path.relative(targetBackupDir, dst),
          sizeBytes: stat.size,
          sha256: calculateFileSha256(dst),
        });
        console.log(`  ✓ Backed up data file: data/${file} (${stat.size} bytes)`);
      }
    }
  }

  // 2. Snapshot Uploaded Media (/uploads)
  const sourceUploadsDir = path.resolve(process.cwd(), 'uploads');
  const backupUploadsDir = path.join(targetBackupDir, 'uploads');
  if (fs.existsSync(sourceUploadsDir)) {
    const uploadEntries = copyDirectoryRecursive(sourceUploadsDir, backupUploadsDir);
    for (const entry of uploadEntries) {
      fileManifestEntries.push({
        relativePath: path.relative(targetBackupDir, path.join(process.cwd(), entry.relativePath)),
        sizeBytes: entry.sizeBytes,
        sha256: entry.sha256,
      });
    }
    console.log(`  ✓ Backed up uploads directory (${uploadEntries.length} items)`);
  }

  // 3. Count Entities from Backed Up Data
  let usersCount = 0;
  let sessionsCount = 0;
  let postsCount = 0;
  let reelsCount = 0;
  let commentsCount = 0;
  let auditLogsCount = 0;
  let mediaRecordsCount = 0;

  let scheduledPostsCount = 0;

  try {
    const usersPath = path.join(backupDataDir, 'users_db.json');
    if (fs.existsSync(usersPath)) {
      const parsed = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      if (Array.isArray(parsed)) usersCount = parsed.length;
    }

    const sessPath = path.join(backupDataDir, 'sessions_db.json');
    if (fs.existsSync(sessPath)) {
      const parsed = JSON.parse(fs.readFileSync(sessPath, 'utf-8'));
      if (Array.isArray(parsed)) sessionsCount = parsed.length;
    }

    const socialPath = path.join(backupDataDir, 'social_db.json');
    if (fs.existsSync(socialPath)) {
      const parsed = JSON.parse(fs.readFileSync(socialPath, 'utf-8'));
      if (Array.isArray(parsed.posts)) {
        postsCount = parsed.posts.length;
        commentsCount = parsed.posts.reduce(
          (acc: number, p: any) => acc + (Array.isArray(p.comments) ? p.comments.length : 0),
          0
        );
      }
      if (Array.isArray(parsed.reels)) reelsCount = parsed.reels.length;
      if (Array.isArray(parsed.scheduledPosts)) scheduledPostsCount = parsed.scheduledPosts.length;
    }

    const auditPath = path.join(backupDataDir, 'audit_logs.json');
    if (fs.existsSync(auditPath)) {
      const parsed = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
      if (Array.isArray(parsed)) auditLogsCount = parsed.length;
    }

    const mediaPath = path.join(backupUploadsDir, 'media_index.json');
    if (fs.existsSync(mediaPath)) {
      const parsed = JSON.parse(fs.readFileSync(mediaPath, 'utf-8'));
      if (Array.isArray(parsed)) mediaRecordsCount = parsed.length;
    }
  } catch (err) {
    console.warn('[Backup] Warning while calculating record metrics:', err);
  }

  // Count raw files in uploads
  let uploadedFilesCount = 0;
  function countFiles(dir: string): number {
    let count = 0;
    if (!fs.existsSync(dir)) return 0;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) count += countFiles(path.join(dir, item.name));
      else if (item.isFile()) count++;
    }
    return count;
  }
  uploadedFilesCount = countFiles(backupUploadsDir);

  const manifest: BackupManifest = {
    backupId,
    createdAt: now.toISOString(),
    sourceEnvironment: process.env.NODE_ENV || 'development',
    recordCounts: {
      users: usersCount,
      sessions: sessionsCount,
      posts: postsCount,
      reels: reelsCount,
      comments: commentsCount,
      scheduledPosts: scheduledPostsCount,
      auditLogs: auditLogsCount,
      mediaRecords: mediaRecordsCount,
      uploadedFiles: uploadedFilesCount,
    },
    files: fileManifestEntries,
  };

  const manifestPath = path.join(targetBackupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`  ✓ Generated manifest: manifest.json (${fileManifestEntries.length} files tracked)`);

  console.log('\n======================================================');
  console.log(`  BACKUP COMPLETE: ${backupId}`);
  console.log(`  Users: ${usersCount} | Sessions: ${sessionsCount} | Posts: ${postsCount}`);
  console.log(`  Reels: ${reelsCount} | Comments: ${commentsCount} | Audit Logs: ${auditLogsCount}`);
  console.log(`  Destination: ${targetBackupDir}`);
  console.log('======================================================\n');

  return { backupDir: targetBackupDir, manifest };
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('backup.ts')) {
  try {
    createTimestampedBackup();
  } catch (err) {
    console.error('[Backup] Critical error executing backup:', err);
    process.exit(1);
  }
}
