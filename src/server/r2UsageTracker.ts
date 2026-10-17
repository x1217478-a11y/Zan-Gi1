/**
 * Zan-Gi Cloudflare R2 Free-Tier Usage & Quota Safety Tracker
 * Server-Side Strict Protection Against Unwanted Charges
 *
 * Implements:
 * - Strict 8 GB hard cutoff (free tier is 10 GB, provides 20% safety margin)
 * - 7 GB soft warning threshold
 * - Separate Class A (1M free/month) and Class B (10M free/month) operation tracking
 * - 70%, 85% warning triggers & 90% hard stop on new media operations
 * - Atomic reservation and concurrency lock for simultaneous uploads
 * - Transparent billing delay disclaimers
 */

import fs from 'fs';
import path from 'path';
import { atomicWriteJson, safeReadJson } from './database.js';

export const USAGE_FILE = path.resolve(process.cwd(), 'data', 'r2_usage_tracker.json');

// File Size and Duration Limits (Resolved: 60 MB Hard Maximum, 15 MB Preferred Target, 150s Max Duration)
export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;        // 20 MB ceiling for photos (20,971,520 bytes)
export const PREFERRED_IMAGE_TARGET_BYTES = 2 * 1024 * 1024; // 2 MB preferred photo target (2,097,152 bytes)
export const MAX_VIDEO_SIZE_BYTES = 60 * 1024 * 1024;        // 60 MB hard maximum uploaded video (62,914,560 bytes)
export const PREFERRED_VIDEO_TARGET_BYTES = 15 * 1024 * 1024; // 15 MB preferred adaptive target (15,728,640 bytes)
export const MAX_VIDEO_DURATION_SECONDS = 180;               // 180 seconds (3m 00s) maximum published duration

// Master Ceiling Aliases (backward compatibility)
export const MASTER_MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_BYTES;
export const MASTER_MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_BYTES;
export const MASTER_MAX_VIDEO_DURATION_SECONDS = MAX_VIDEO_DURATION_SECONDS;

// Monthly Storage Quotas (Cloudflare R2 Free Tier gives 10 GB)
export const STORAGE_FREE_TIER_TOTAL_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB reference
export const STORAGE_MONITOR_LIMIT_BYTES = 7.5 * 1024 * 1024 * 1024;   // 7.5 GB monitor threshold
export const STORAGE_OPTIMIZE_LIMIT_BYTES = 8.5 * 1024 * 1024 * 1024;  // 8.5 GB optimize threshold
export const STORAGE_STRICT_LIMIT_BYTES = 9.0 * 1024 * 1024 * 1024;    // 9.0 GB stricter upload controls
export const STORAGE_PAUSE_HARD_LIMIT_BYTES = 9.5 * 1024 * 1024 * 1024; // 9.5 GB pause new R2 uploads (strictly enforced)

// Local Disk Storage Quota (prevents local fallback from silently filling hosting disk)
export const LOCAL_DISK_STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024; // 2.0 GB local disk safety ceiling

// Backward compatibility aliases
export const STORAGE_WARN_LIMIT_BYTES = STORAGE_MONITOR_LIMIT_BYTES;
export const STORAGE_STRONG_WARN_BYTES = STORAGE_OPTIMIZE_LIMIT_BYTES;
export const DEFAULT_STORAGE_HARD_LIMIT_BYTES = STORAGE_PAUSE_HARD_LIMIT_BYTES;
export const STORAGE_HARD_LIMIT_BYTES = STORAGE_PAUSE_HARD_LIMIT_BYTES;

// Operation Quotas (Cloudflare R2 Free Tier)
export const CLASS_A_MONTHLY_FREE_QUOTA = 1_000_000;
export const CLASS_B_MONTHLY_FREE_QUOTA = 10_000_000;

export const CLASS_A_WARN_70_PCT = 700_000;
export const CLASS_A_WARN_85_PCT = 850_000;
export const CLASS_A_HALT_90_PCT = 900_000;

export const CLASS_B_WARN_70_PCT = 7_000_000;
export const CLASS_B_WARN_85_PCT = 8_500_000;
export const CLASS_B_HALT_90_PCT = 9_000_000;

export interface R2MonthlyUsage {
  billingMonth: string; // "YYYY-MM"
  storageUsedBytes: number;
  classAOperations: number;
  classBOperations: number;
  lastUpdated: string;
}

export interface ActiveReservation {
  id: string;
  sizeBytes: number;
  createdAt: number;
  expiresAt: number;
}

export interface R2UsageState {
  currentMonth: string;
  configuredHardLimitBytes?: number;
  monthlyUsage: Record<string, R2MonthlyUsage>;
  activeReservations: ActiveReservation[];
}

function getCurrentBillingMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const DEFAULT_STATE: R2UsageState = {
  currentMonth: getCurrentBillingMonth(),
  monthlyUsage: {},
  activeReservations: [],
};

// In-memory cache for ultra-fast atomic locks, synced to disk atomically
let stateCache: R2UsageState = safeReadJson<R2UsageState>(USAGE_FILE, DEFAULT_STATE);

function persistState() {
  try {
    atomicWriteJson(USAGE_FILE, stateCache);
  } catch (err) {
    console.error('[R2UsageTracker] Failed to persist usage state:', err);
  }
}

function cleanExpiredReservations() {
  const now = Date.now();
  const initialLen = stateCache.activeReservations.length;
  stateCache.activeReservations = stateCache.activeReservations.filter((r) => r.expiresAt > now);
  if (stateCache.activeReservations.length !== initialLen) {
    persistState();
  }
}

function getOrInitMonthUsage(month?: string): R2MonthlyUsage {
  const m = month || getCurrentBillingMonth();
  if (!stateCache.monthlyUsage[m]) {
    stateCache.monthlyUsage[m] = {
      billingMonth: m,
      storageUsedBytes: 0,
      classAOperations: 0,
      classBOperations: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
  return stateCache.monthlyUsage[m];
}

/**
 * Recalculates total active stored bytes from actual media record list.
 */
export function syncStorageFromMediaRecords(totalBytes: number) {
  const current = getOrInitMonthUsage();
  current.storageUsedBytes = Math.max(0, totalBytes);
  current.lastUpdated = new Date().toISOString();
  stateCache.activeReservations = [];
  persistState();
}

/**
 * Clears active reservations (used for test isolation and stale upload cleanup).
 */
export function clearActiveReservations() {
  stateCache.activeReservations = [];
  persistState();
}

/**
 * Checks whether uploads are currently permitted under safety thresholds.
 */
export function checkUploadAllowed(requestedBytes: number = 0): {
  allowed: boolean;
  reason?: string;
  status: 'ok' | 'warning_7gb' | 'warning_ops' | 'blocked_storage' | 'blocked_ops';
  warnings: string[];
} {
  // Fail-closed protection: reject if quota state is corrupted or uninitialized
  if (!stateCache || typeof stateCache !== 'object' || !stateCache.monthlyUsage) {
    return {
      allowed: false,
      status: 'blocked_storage',
      reason: 'Fail-closed safety: Storage quota state is unavailable. Uploads are blocked to prevent cloud billing overages.',
      warnings: ['Fail-closed active: Storage quota telemetry could not be verified.'],
    };
  }

  cleanExpiredReservations();
  const current = getOrInitMonthUsage();

  if (!current || typeof current.storageUsedBytes !== 'number') {
    return {
      allowed: false,
      status: 'blocked_storage',
      reason: 'Fail-closed safety: Monthly usage telemetry is corrupted or unavailable.',
      warnings: ['Fail-closed active: Monthly usage record could not be parsed.'],
    };
  }

  const reservedBytes = stateCache.activeReservations.reduce((sum, r) => sum + r.sizeBytes, 0);
  const totalProjectedBytes = current.storageUsedBytes + reservedBytes + requestedBytes;

  const warnings: string[] = [];
  let status: 'ok' | 'warning_7gb' | 'warning_ops' | 'blocked_storage' | 'blocked_ops' = 'ok';

  // 1. Hard storage limit check (9.5 GB pause new uploads - strictly enforced)
  if (totalProjectedBytes >= STORAGE_PAUSE_HARD_LIMIT_BYTES) {
    return {
      allowed: false,
      status: 'blocked_storage',
      reason: `Application storage safety limit reached (${(STORAGE_PAUSE_HARD_LIMIT_BYTES / (1024 * 1024 * 1024)).toFixed(1)} GB). New media uploads are temporarily paused to protect the zero-budget free tier. Text messaging remains active.`,
      warnings: ['Storage safety cap reached: 9.5 GB pause threshold engaged.'],
    };
  }

  // 2. Class A Operations check (1M free, stop at 90% = 900,000)
  if (current.classAOperations >= CLASS_A_HALT_90_PCT) {
    return {
      allowed: false,
      status: 'blocked_ops',
      reason: `Class A operations have reached 90% of the free monthly allowance (${current.classAOperations.toLocaleString()} / 1,000,000). Media uploads are paused to avoid accidental overage charges. Text messaging remains active.`,
      warnings: ['Class A operations exceed 90% safety limit.'],
    };
  }

  // 3. Class B Operations check (10M free, stop at 90% = 9,000,000)
  if (current.classBOperations >= CLASS_B_HALT_90_PCT) {
    return {
      allowed: false,
      status: 'blocked_ops',
      reason: `Class B operations have reached 90% of the free monthly allowance (${current.classBOperations.toLocaleString()} / 10,000,000). Nonessential media operations paused. Text messaging remains active.`,
      warnings: ['Class B operations exceed 90% safety limit.'],
    };
  }

  // Multi-tier warnings: Storage (7.5 GB monitor, 8.5 GB optimize, 9.0 GB strict controls)
  if (totalProjectedBytes >= STORAGE_STRICT_LIMIT_BYTES) {
    status = 'warning_7gb';
    warnings.push(
      `Strict upload controls active: ${(totalProjectedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB / 9.50 GB ceiling. High compression enforced.`
    );
  } else if (totalProjectedBytes >= STORAGE_OPTIMIZE_LIMIT_BYTES) {
    status = 'warning_7gb';
    warnings.push(
      `Storage optimization triggered: ${(totalProjectedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB / 9.50 GB. Adaptive quality active.`
    );
  } else if (totalProjectedBytes >= STORAGE_MONITOR_LIMIT_BYTES) {
    status = 'warning_7gb';
    warnings.push(
      `Monitoring storage usage: ${(totalProjectedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB / 10.00 GB free tier.`
    );
  }

  // Soft warnings: Operations (70% and 85%)
  if (current.classAOperations >= CLASS_A_WARN_85_PCT) {
    status = 'warning_ops';
    warnings.push(`Class A operations at 85% of monthly allowance (${current.classAOperations.toLocaleString()} / 1M).`);
  } else if (current.classAOperations >= CLASS_A_WARN_70_PCT) {
    status = 'warning_ops';
    warnings.push(`Class A operations at 70% of monthly allowance (${current.classAOperations.toLocaleString()} / 1M).`);
  }

  if (current.classBOperations >= CLASS_B_WARN_85_PCT) {
    status = 'warning_ops';
    warnings.push(`Class B operations at 85% of monthly allowance (${current.classBOperations.toLocaleString()} / 10M).`);
  } else if (current.classBOperations >= CLASS_B_WARN_70_PCT) {
    status = 'warning_ops';
    warnings.push(`Class B operations at 70% of monthly allowance (${current.classBOperations.toLocaleString()} / 10M).`);
  }

  return {
    allowed: true,
    status,
    warnings,
  };
}

/**
 * Reserves bytes and Class A operation slot atomically before upload proceeds.
 */
export function reserveUploadCapacity(sizeBytes: number): {
  allowed: boolean;
  reservationId?: string;
  reason?: string;
} {
  cleanExpiredReservations();
  const check = checkUploadAllowed(sizeBytes);
  if (!check.allowed) {
    return { allowed: false, reason: check.reason };
  }

  const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  stateCache.activeReservations.push({
    id: reservationId,
    sizeBytes,
    createdAt: Date.now(),
    expiresAt: Date.now() + 120_000, // 2 minutes auto-expiry for stale uploads
  });

  persistState();
  return { allowed: true, reservationId };
}

/**
 * Commits an upload: records actual size added and increments Class A operations.
 */
export function commitUploadCapacity(reservationId: string, actualSizeBytes: number) {
  stateCache.activeReservations = stateCache.activeReservations.filter((r) => r.id !== reservationId);
  const current = getOrInitMonthUsage();
  current.storageUsedBytes += actualSizeBytes;
  current.classAOperations += 1;
  current.lastUpdated = new Date().toISOString();
  persistState();
}

/**
 * Releases a reservation when an upload fails, is cancelled, or is rejected.
 */
export function releaseUploadCapacity(reservationId: string) {
  const prevCount = stateCache.activeReservations.length;
  stateCache.activeReservations = stateCache.activeReservations.filter((r) => r.id !== reservationId);
  if (stateCache.activeReservations.length !== prevCount) {
    persistState();
  }
}

/**
 * Records an object deletion (frees stored bytes and counts as 1 Class A operation).
 */
export function recordObjectDeleted(sizeBytes: number) {
  const current = getOrInitMonthUsage();
  current.storageUsedBytes = Math.max(0, current.storageUsedBytes - sizeBytes);
  current.classAOperations += 1; // DeleteObject is Class A
  current.lastUpdated = new Date().toISOString();
  persistState();
}

/**
 * Increments Class A operation count.
 */
export function recordClassAOperation(count: number = 1) {
  const current = getOrInitMonthUsage();
  current.classAOperations += count;
  current.lastUpdated = new Date().toISOString();
  persistState();
}

/**
 * Increments Class B operation count.
 */
export function recordClassBOperation(count: number = 1) {
  const current = getOrInitMonthUsage();
  current.classBOperations += count;
  current.lastUpdated = new Date().toISOString();
  persistState();
}

export function calculateDirectorySize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += calculateDirectorySize(fullPath);
      } else if (entry.isFile()) {
        try {
          total += fs.statSync(fullPath).size;
        } catch {}
      }
    }
  } catch {}
  return total;
}

/**
 * Computes exact stored bytes across all local storage folders (uploads & private messages).
 */
export function getLocalDiskUsageBytes(): number {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const privateMsgDir = path.resolve(process.cwd(), 'data', 'private_messages');
  return calculateDirectorySize(uploadsDir) + calculateDirectorySize(privateMsgDir);
}

/**
 * Checks whether local disk storage has room for a new upload within 2.0 GB ceiling.
 * Prevents local fallback from silently exhausting hosting disk space.
 */
export function checkLocalDiskAllowed(requestedBytes: number = 0): {
  allowed: boolean;
  usedBytes: number;
  remainingBytes: number;
  reason?: string;
} {
  const used = getLocalDiskUsageBytes();
  const projected = used + requestedBytes;
  if (projected >= LOCAL_DISK_STORAGE_LIMIT_BYTES) {
    return {
      allowed: false,
      usedBytes: used,
      remainingBytes: Math.max(0, LOCAL_DISK_STORAGE_LIMIT_BYTES - used),
      reason: `Local disk storage safety limit reached (${(LOCAL_DISK_STORAGE_LIMIT_BYTES / (1024 * 1024 * 1024)).toFixed(1)} GB ceiling). Local media uploads are paused to protect hosting disk space. Text messaging remains active.`,
    };
  }
  return {
    allowed: true,
    usedBytes: used,
    remainingBytes: Math.max(0, LOCAL_DISK_STORAGE_LIMIT_BYTES - projected),
  };
}

/**
 * Returns comprehensive quota and telemetry status for API and UI consumers.
 */
export function getR2QuotaStatus() {
  cleanExpiredReservations();
  const current = getOrInitMonthUsage();
  const reservedBytes = stateCache.activeReservations.reduce((sum, r) => sum + r.sizeBytes, 0);
  const check = checkUploadAllowed(0);
  const localUsage = checkLocalDiskAllowed(0);

  const storageUsedBytes = current.storageUsedBytes;
  const storageRemainingBytes = Math.max(0, STORAGE_PAUSE_HARD_LIMIT_BYTES - storageUsedBytes - reservedBytes);

  return {
    billingMonth: current.billingMonth,
    storageUsedBytes,
    storageUsedMB: Number((storageUsedBytes / (1024 * 1024)).toFixed(2)),
    storageUsedGB: Number((storageUsedBytes / (1024 * 1024 * 1024)).toFixed(3)),
    storageHardLimitBytes: STORAGE_PAUSE_HARD_LIMIT_BYTES,
    storageHardLimitGB: 9.5,
    storageWarnLimitGB: 7.5,
    storageRemainingBytes,
    storageRemainingMB: Number((storageRemainingBytes / (1024 * 1024)).toFixed(2)),
    storageRemainingGB: Number((storageRemainingBytes / (1024 * 1024 * 1024)).toFixed(3)),
    storagePercentOfLimit: Number(((storageUsedBytes / STORAGE_PAUSE_HARD_LIMIT_BYTES) * 100).toFixed(1)),

    // Local Disk Safety Quota (2.0 GB Ceiling)
    localDiskStorageLimitBytes: LOCAL_DISK_STORAGE_LIMIT_BYTES,
    localDiskStorageLimitGB: 2.0,
    localDiskUsedBytes: localUsage.usedBytes,
    localDiskUsedMB: Number((localUsage.usedBytes / (1024 * 1024)).toFixed(2)),
    localDiskRemainingBytes: localUsage.remainingBytes,
    localDiskRemainingMB: Number((localUsage.remainingBytes / (1024 * 1024)).toFixed(2)),
    localDiskPercent: Number(((localUsage.usedBytes / LOCAL_DISK_STORAGE_LIMIT_BYTES) * 100).toFixed(1)),
    isLocalDiskAllowed: localUsage.allowed,

    // Operation telemetry
    classAOperations: current.classAOperations,
    classAFreeQuota: CLASS_A_MONTHLY_FREE_QUOTA,
    classAHaltLimit: CLASS_A_HALT_90_PCT,
    classAPercent: Number(((current.classAOperations / CLASS_A_MONTHLY_FREE_QUOTA) * 100).toFixed(1)),

    classBOperations: current.classBOperations,
    classBFreeQuota: CLASS_B_MONTHLY_FREE_QUOTA,
    classBHaltLimit: CLASS_B_HALT_90_PCT,
    classBPercent: Number(((current.classBOperations / CLASS_B_MONTHLY_FREE_QUOTA) * 100).toFixed(1)),

    // Status flags & timestamps
    isUploadAllowed: check.allowed && localUsage.allowed,
    status: check.status,
    warnings: check.warnings,
    activeReservationsCount: stateCache.activeReservations.length,
    lastRefreshTime: current.lastUpdated,

    // File type and size limits
    maxImageSizeBytes: MAX_IMAGE_SIZE_BYTES,
    maxVideoSizeBytes: MAX_VIDEO_SIZE_BYTES,
    maxVideoDurationSeconds: MAX_VIDEO_DURATION_SECONDS,

    // Billing disclaimer
    disclaimer:
      'Application-level quotas are designed to prevent accidental overages, but do not guarantee zero charges because Cloudflare usage telemetry may experience propagation delays.',
  };
}
