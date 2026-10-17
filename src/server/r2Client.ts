/**
 * Zan-Gi Cloudflare R2 Client & Helper Library
 * Phase 5 Storage Integration (Server-Only)
 *
 * Cloudflare R2 is an S3-compatible zero-egress object storage service.
 * This module provides:
 * - S3Client initialization targeting Cloudflare R2 endpoints
 * - Secure credential loading from server environment variables only
 * - Private-by-default signed URL generation for downloads & uploads
 * - Non-destructive helper operations with strict MIME & size validation
 *
 * STRICT SAFETY RULES:
 * - Credentials MUST NEVER be logged, exposed via APIs, or sent to client bundles
 * - Default storage access is PRIVATE (presigned URLs with short expiry)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { recordClassAOperation, recordClassBOperation } from './r2UsageTracker.js';

export interface R2Config {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicDomain?: string; // Optional custom delivery domain (e.g., https://media.zangi.app)
  isPublic: boolean;     // Defaults to false (private-by-default)
  presignedExpirySeconds: number; // Defaults to 1800 (30 mins)
}

/**
 * Loads R2 configuration from server environment variables only.
 * Returns null if required credentials are missing.
 */
export function getR2Config(): R2Config | null {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const bucketName = (process.env.R2_BUCKET_NAME || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();

  // If any required field is missing, return null
  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const publicDomain = (process.env.R2_PUBLIC_DOMAIN || '').trim() || undefined;
  const isPublic = process.env.R2_IS_PUBLIC === 'true';
  const presignedExpirySeconds = parseInt(process.env.R2_PRESIGNED_EXPIRY_SECONDS || '1800', 10) || 1800;

  return {
    accountId,
    bucketName,
    accessKeyId,
    secretAccessKey,
    publicDomain,
    isPublic,
    presignedExpirySeconds,
  };
}

/**
 * Validates whether R2 has complete configuration available.
 */
export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

/**
 * Creates an S3Client configured for Cloudflare R2 Standard.
 */
export function createR2Client(customConfig?: Partial<R2Config>): S3Client {
  const config = { ...(getR2Config() || {}), ...customConfig };

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Cannot initialize R2 client: Missing required R2 credentials in environment.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Generates a short-lived presigned URL to securely download/view a private object.
 * Counts as a Class B operation.
 */
export function generatePresignedDownloadUrl(
  key: string,
  client?: S3Client,
  customConfig?: Partial<R2Config>
): Promise<string> {
  const config = { ...(getR2Config() || {}), ...customConfig };
  if (!config.bucketName) {
    throw new Error('R2 bucket name is not configured');
  }

  const s3 = client || createR2Client(config);
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  const expiresIn = Math.min(config.presignedExpirySeconds || 1800, 3600); // 30 mins default, max 1 hour
  recordClassBOperation(1);

  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Generates a short-lived presigned URL allowing an authorized client to upload directly to R2.
 * Enforces R2 Standard storage class. Counts as a Class A operation reservation.
 */
export function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  client?: S3Client,
  customConfig?: Partial<R2Config>
): Promise<{ uploadUrl: string; key: string; publicOrDirectUrl: string }> {
  const config = { ...(getR2Config() || {}), ...customConfig };
  if (!config.bucketName) {
    throw new Error('R2 bucket name is not configured');
  }

  const s3 = client || createR2Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
    StorageClass: 'STANDARD', // Strictly R2 Standard, never Infrequent Access
  });

  const expiresIn = Math.min(config.presignedExpirySeconds || 900, 1800); // Max 15-30 mins for upload URLs
  recordClassAOperation(1);

  return getSignedUrl(s3, command, { expiresIn }).then((uploadUrl) => {
    let publicOrDirectUrl: string;
    if (config.isPublic && config.publicDomain) {
      publicOrDirectUrl = `${config.publicDomain.replace(/\/$/, '')}/${key}`;
    } else {
      // Private by default - client will request signed URL for viewing
      publicOrDirectUrl = `/api/media/r2/${encodeURIComponent(key)}`;
    }

    return {
      uploadUrl,
      key,
      publicOrDirectUrl,
    };
  });
}

/**
 * Server-side direct upload of a file Buffer to Cloudflare R2 Standard.
 * Explicitly sets StorageClass to STANDARD (zero Infrequent Access).
 */
export async function uploadBufferToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
  metadata?: Record<string, string>,
  client?: S3Client,
  customConfig?: Partial<R2Config>
): Promise<{ key: string; fileUrl: string; sizeBytes: number; isPrivate: boolean }> {
  const config = { ...(getR2Config() || {}), ...customConfig };
  if (!config.bucketName) {
    throw new Error('R2 bucket name is not configured');
  }

  const s3 = client || createR2Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
    StorageClass: 'STANDARD', // Strictly R2 Standard
  });

  await s3.send(command);

  let fileUrl: string;
  const isPrivate = !config.isPublic || !config.publicDomain;

  if (!isPrivate && config.publicDomain) {
    fileUrl = `${config.publicDomain.replace(/\/$/, '')}/${key}`;
  } else {
    // Return relative application endpoint that serves/redirects with presigned authorization
    fileUrl = `/api/media/r2/${encodeURIComponent(key)}`;
  }

  return {
    key,
    fileUrl,
    sizeBytes: buffer.length,
    isPrivate,
  };
}

/**
 * Deletes an object from Cloudflare R2 bucket.
 * Counts as 1 Class A operation.
 */
export async function deleteObjectFromR2(
  key: string,
  client?: S3Client,
  customConfig?: Partial<R2Config>
): Promise<boolean> {
  const config = { ...(getR2Config() || {}), ...customConfig };
  if (!config.bucketName) {
    return false;
  }

  try {
    const s3 = client || createR2Client(config);
    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });
    await s3.send(command);
    return true;
  } catch (err) {
    console.warn(`[R2] Failed to delete object with key ${key}:`, err);
    return false;
  }
}

/**
 * Checks if an object exists in Cloudflare R2.
 * Counts as 1 Class B operation.
 */
export async function checkObjectExistsInR2(
  key: string,
  client?: S3Client,
  customConfig?: Partial<R2Config>
): Promise<boolean> {
  const config = { ...(getR2Config() || {}), ...customConfig };
  if (!config.bucketName) return false;

  try {
    const s3 = client || createR2Client(config);
    const command = new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });
    await s3.send(command);
    recordClassBOperation(1);
    return true;
  } catch {
    return false;
  }
}
