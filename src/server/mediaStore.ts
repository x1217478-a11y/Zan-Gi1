import fs from 'fs';
import path from 'path';
import multer from 'multer';
import crypto from 'crypto';
import {
  isR2Configured,
  getR2Config,
  uploadBufferToR2,
  deleteObjectFromR2,
  generatePresignedDownloadUrl,
} from './r2Client.js';
import {
  MAX_IMAGE_SIZE_BYTES,
  PREFERRED_IMAGE_TARGET_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  PREFERRED_VIDEO_TARGET_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
  reserveUploadCapacity,
  commitUploadCapacity,
  releaseUploadCapacity,
  recordObjectDeleted,
  syncStorageFromMediaRecords,
  getR2QuotaStatus,
  checkLocalDiskAllowed,
  LOCAL_DISK_STORAGE_LIMIT_BYTES,
} from './r2UsageTracker.js';

// Setup local uploads directory structure for JSON mode
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
export const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');
export const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
export const BANNERS_DIR = path.join(UPLOADS_DIR, 'banners');
export const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
export const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');

// Private messages storage: stored securely in data/private_messages, NOT publicly served by express.static
export const PRIVATE_MESSAGES_DIR = path.resolve(process.cwd(), 'data', 'private_messages');

[UPLOADS_DIR, IMAGES_DIR, VIDEOS_DIR, BANNERS_DIR, AVATARS_DIR, AUDIO_DIR, PRIVATE_MESSAGES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export type StorageProvider = 'json' | 'r2';

/**
 * Returns the currently active storage provider.
 * Active default is ALWAYS 'json' unless explicitly configured.
 */
export function getStorageProvider(): StorageProvider {
  const provider = (process.env.STORAGE_PROVIDER || process.env.STORAGE_BACKEND || 'json').toLowerCase();
  if (provider === 'r2' || provider === 'cloudflare_r2') {
    return 'r2';
  }
  return 'json';
}

export interface MediaRecord {
  id: string;
  uploaderId: string;
  originalName: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  mediaType: 'image' | 'video' | 'avatar' | 'banner' | 'audio';
  createdAt: string;
  storageProvider?: StorageProvider;
  storageKey?: string;
  isPrivate?: boolean;
}

// In-memory record index with persistent json backing
const MEDIA_DB_FILE = path.join(process.cwd(), 'uploads', 'media_index.json');
let mediaRecords: Map<string, MediaRecord> = new Map();

function loadMediaIndex() {
  try {
    if (fs.existsSync(MEDIA_DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(MEDIA_DB_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        mediaRecords = new Map(data.map((r: MediaRecord) => [r.id, r]));
        const totalStoredBytes = Array.from(mediaRecords.values()).reduce(
          (sum, r) => sum + (r.sizeBytes || 0),
          0
        );
        syncStorageFromMediaRecords(totalStoredBytes);
      }
    }
  } catch (e) {
    console.warn('Could not load media index:', e);
  }
}

function saveMediaIndex() {
  try {
    const list = Array.from(mediaRecords.values());
    fs.writeFileSync(MEDIA_DB_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not save media index:', e);
  }
}

loadMediaIndex();

// Allowed MIME types across the entire Zan-Gi platform
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/x-m4a',
  'audio/aac',
];

// File Size and Duration Limits:
// Videos: max 60 MB hard ceiling, 15 MB preferred adaptive target, max 150s duration
// Images: max 20 MB ceiling, 2 MB preferred adaptive target
// Audio: max 15 MB ceiling
export const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024;
export {
  MAX_IMAGE_SIZE_BYTES,
  PREFERRED_IMAGE_TARGET_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  PREFERRED_VIDEO_TARGET_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
};
export const MAX_FILE_SIZE_BYTES = MAX_VIDEO_SIZE_BYTES; // 60 MB overall upper bound for uploads

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mime);
}

/**
 * Validates actual binary magic bytes at the beginning of the file.
 * Ensures client file extension cannot disguise unauthorized payloads.
 */
export function validateFileMagicBytes(filePath: string, mimetype: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(32);
    const bytesRead = fs.readSync(fd, buffer, 0, 32, 0);
    fs.closeSync(fd);
    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (mimetype === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (mimetype === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }
    // GIF: 'GIF87a' or 'GIF89a'
    if (mimetype === 'image/gif') {
      const header = buffer.subarray(0, 6).toString('ascii');
      return header === 'GIF87a' || header === 'GIF89a';
    }
    // WebP: RIFF .... WEBP
    if (mimetype === 'image/webp') {
      const riff = buffer.subarray(0, 4).toString('ascii');
      const webp = buffer.subarray(8, 12).toString('ascii');
      return riff === 'RIFF' && webp === 'WEBP';
    }
    // MP4 / MOV / M4A: ftyp or moov
    if (
      mimetype === 'video/mp4' ||
      mimetype === 'video/quicktime' ||
      mimetype === 'audio/mp4' ||
      mimetype === 'audio/x-m4a'
    ) {
      const tag = buffer.subarray(4, 8).toString('ascii');
      return tag === 'ftyp' || tag === 'moov';
    }
    // WebM / MKV / WebA: EBML header 1A 45 DF A3
    if (mimetype === 'video/webm' || mimetype === 'audio/webm') {
      return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
    }
    // MP3: 'ID3' or MPEG sync frame FF FB / FF F3 / FF F2
    if (mimetype === 'audio/mpeg') {
      const id3 = buffer.subarray(0, 3).toString('ascii');
      if (id3 === 'ID3') return true;
      return buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
    }
    // WAV: RIFF .... WAVE
    if (mimetype === 'audio/wav') {
      const riff = buffer.subarray(0, 4).toString('ascii');
      const wave = buffer.subarray(8, 12).toString('ascii');
      return riff === 'RIFF' && wave === 'WAVE';
    }
    // OGG: 'OggS'
    if (mimetype === 'audio/ogg') {
      return buffer.subarray(0, 4).toString('ascii') === 'OggS';
    }

    return true;
  } catch {
    return false;
  }
}

// Multer Disk Storage Configuration (used for JSON local mode and temp staging)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetType = (req.query.type as string) || (req.body.type as string) || 'image';
    if (targetType === 'audio' || file.mimetype.startsWith('audio/')) {
      cb(null, AUDIO_DIR);
    } else if (targetType === 'video' || file.mimetype.startsWith('video/')) {
      cb(null, VIDEOS_DIR);
    } else if (targetType === 'banner') {
      cb(null, BANNERS_DIR);
    } else if (targetType === 'avatar') {
      cb(null, AVATARS_DIR);
    } else {
      cb(null, IMAGES_DIR);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const safeExt = [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif',
      '.mp4',
      '.webm',
      '.mov',
      '.mp3',
      '.wav',
      '.ogg',
      '.m4a',
      '.aac',
      '.weba',
    ].includes(ext)
      ? ext
      : file.mimetype.startsWith('video/')
      ? '.mp4'
      : file.mimetype.startsWith('audio/')
      ? '.webm'
      : '.jpg';
    const uniqueName = `zg_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${safeExt}`;
    cb(null, uniqueName);
  },
});

// File filter: strict MIME type checking
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  if (isAllowedMimeType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM, MOV, MP3, WAV, OGG.`));
  }
};

export const uploadMiddleware = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 5,
  },
});

export interface MediaUploadOptions {
  isPrivate?: boolean;
  purpose?: 'message' | 'post' | 'reel' | 'story' | 'avatar' | 'banner';
}

/**
 * Registers a media record from a Multer file.
 * Handles both local JSON disk storage and Cloudflare R2 uploads based on current configuration.
 * Strictly enforces size limits and atomic quota reservations.
 * Private message attachments are stored separately in private storage and never exposed via public URLs.
 */
export async function registerMediaRecordAsync(
  uploaderId: string,
  file: Express.Multer.File,
  mediaType: 'image' | 'video' | 'avatar' | 'banner' | 'audio',
  options?: MediaUploadOptions
): Promise<MediaRecord> {
  const isPrivate = Boolean(options?.isPrivate || options?.purpose === 'message');

  // 1. Strict binary magic bytes verification
  if (!validateFileMagicBytes(file.path, file.mimetype)) {
    try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
    throw new Error(
      `File verification failed: Header magic bytes for "${file.originalname}" do not match declared MIME type ${file.mimetype}.`
    );
  }

  // 2. Strict per-type size validation
  const isImg = mediaType === 'image' || mediaType === 'avatar' || mediaType === 'banner' || file.mimetype.startsWith('image/');
  if (isImg && file.size > MAX_IMAGE_SIZE_BYTES) {
    try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
    throw new Error(
      `Image "${file.originalname}" exceeds maximum allowed size of 20 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB provided).`
    );
  }

  if (mediaType === 'audio' && file.size > MAX_AUDIO_SIZE_BYTES) {
    try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
    throw new Error(
      `Audio "${file.originalname}" exceeds maximum allowed size of 15 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB provided).`
    );
  }

  if (mediaType === 'video' && file.size > MAX_VIDEO_SIZE_BYTES) {
    try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
    throw new Error(
      `Video "${file.originalname}" exceeds maximum allowed upload size of 60 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB provided). Videos must be compressed locally before upload.`
    );
  }

  // 3. Atomic capacity reservation (prevents simultaneous uploads from exceeding 9.5 GB safety cap or 90% Class A ops)
  const reservation = reserveUploadCapacity(file.size);
  if (!reservation.allowed) {
    try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
    throw new Error(reservation.reason || 'Media upload rejected: safety threshold engaged.');
  }

  const provider = getStorageProvider();

  if (provider === 'r2') {
    if (!isR2Configured()) {
      releaseUploadCapacity(reservation.reservationId!);
      try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
      throw new Error('R2 storage is selected but required R2 environment variables are not configured');
    }

    try {
      const ext = path.extname(file.originalname).toLowerCase() || '.bin';
      const r2Prefix = isPrivate ? 'private/messages' : `media/${mediaType}s`;
      const r2Key = `${r2Prefix}/${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;

      // Read the staged file into buffer
      const fileBuffer = fs.readFileSync(file.path);
      const r2Result = await uploadBufferToR2(fileBuffer, r2Key, file.mimetype, {
        uploaderId,
        mediaType,
        originalName: encodeURIComponent(file.originalname),
      });

      // Remove local staging file
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch {
        // Non-fatal
      }

      const recordId = `med_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const record: MediaRecord = {
        id: recordId,
        uploaderId,
        originalName: file.originalname,
        fileName: path.basename(r2Key),
        fileUrl: isPrivate ? `/api/messages/media/${recordId}` : r2Result.fileUrl,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        mediaType,
        createdAt: new Date().toISOString(),
        storageProvider: 'r2',
        storageKey: r2Key,
        isPrivate: isPrivate || r2Result.isPrivate,
      };

      mediaRecords.set(record.id, record);
      saveMediaIndex();

      // Commit reservation now that upload succeeded
      commitUploadCapacity(reservation.reservationId!, file.size);

      return record;
    } catch (uploadErr) {
      // Release reservation on failure
      releaseUploadCapacity(reservation.reservationId!);
      throw uploadErr;
    }
  }

  // Active default: JSON mode (local filesystem storage with strict 2.0 GB disk quota)
  const localDiskCheck = checkLocalDiskAllowed(file.size);
  if (!localDiskCheck.allowed) {
    releaseUploadCapacity(reservation.reservationId!);
    try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
    throw new Error(localDiskCheck.reason || 'Local disk storage quota exceeded.');
  }

  try {
    const record = registerMediaRecord(uploaderId, file, mediaType, reservation.reservationId, isPrivate);
    return record;
  } catch (err) {
    releaseUploadCapacity(reservation.reservationId!);
    throw err;
  }
}

/**
 * Synchronous local record registration for standard JSON mode.
 * Preserves exact backwards compatibility with existing codebase while securing private media.
 */
export function registerMediaRecord(
  uploaderId: string,
  file: Express.Multer.File,
  mediaType: 'image' | 'video' | 'avatar' | 'banner' | 'audio',
  existingReservationId?: string,
  isPrivate: boolean = false
): MediaRecord {
  // Validate limits
  const isImg = mediaType === 'image' || mediaType === 'avatar' || mediaType === 'banner' || file.mimetype.startsWith('image/');
  if (isImg && file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image "${file.originalname}" exceeds maximum allowed size of 20 MB.`);
  }
  if (mediaType === 'video' && file.size > MAX_VIDEO_SIZE_BYTES) {
    throw new Error(`Video "${file.originalname}" exceeds maximum allowed upload size of 60 MB.`);
  }

  // Local disk quota check
  const diskCheck = checkLocalDiskAllowed(file.size);
  if (!diskCheck.allowed) {
    throw new Error(diskCheck.reason || 'Local disk storage quota exceeded (2.0 GB ceiling).');
  }

  let reservationId = existingReservationId;
  if (!reservationId) {
    const res = reserveUploadCapacity(file.size);
    if (!res.allowed) {
      throw new Error(res.reason || 'Storage safety quota limit reached.');
    }
    reservationId = res.reservationId;
  }

  const recordId = `med_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  let storageKey: string | undefined;
  let fileUrl: string;

  if (isPrivate) {
    // Move from public staging to private messages directory
    const privateTarget = path.join(PRIVATE_MESSAGES_DIR, file.filename);
    try {
      if (fs.existsSync(file.path)) {
        fs.renameSync(file.path, privateTarget);
      }
    } catch {
      // If rename fails, copy and remove
      try {
        fs.copyFileSync(file.path, privateTarget);
        fs.unlinkSync(file.path);
      } catch {}
    }
    storageKey = privateTarget;
    fileUrl = `/api/messages/media/${recordId}`;
  } else {
    let subDir = 'images';
    if (mediaType === 'video' || file.mimetype.startsWith('video/')) subDir = 'videos';
    else if (mediaType === 'audio' || file.mimetype.startsWith('audio/')) subDir = 'audio';
    else if (mediaType === 'banner') subDir = 'banners';
    else if (mediaType === 'avatar') subDir = 'avatars';
    fileUrl = `/uploads/${subDir}/${file.filename}`;
  }

  const record: MediaRecord = {
    id: recordId,
    uploaderId,
    originalName: file.originalname,
    fileName: file.filename,
    fileUrl,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    mediaType,
    createdAt: new Date().toISOString(),
    storageProvider: 'json',
    storageKey,
    isPrivate,
  };

  mediaRecords.set(record.id, record);
  saveMediaIndex();

  if (reservationId) {
    commitUploadCapacity(reservationId, file.size);
  }

  return record;
}

/**
 * Finds a media record by ID.
 */
export function getMediaRecordById(id: string): MediaRecord | undefined {
  return mediaRecords.get(id);
}

/**
 * Finds a media record by file URL or storage key.
 */
export function getMediaRecordByUrl(fileUrl: string): MediaRecord | undefined {
  for (const rec of mediaRecords.values()) {
    if (rec.fileUrl === fileUrl || (rec.storageKey && rec.storageKey === fileUrl)) {
      return rec;
    }
  }
  return undefined;
}

/**
 * Generates an access URL for viewing/downloading media.
 * For private R2 objects, generates a short-lived presigned URL.
 * For JSON local objects or public R2 objects, returns the direct URL.
 */
export async function getMediaAccessUrl(
  record: MediaRecord,
  expiresInSeconds?: number
): Promise<string> {
  if (record.storageProvider === 'r2' && record.storageKey && record.isPrivate !== false) {
    if (isR2Configured()) {
      return generatePresignedDownloadUrl(
        record.storageKey,
        undefined,
        expiresInSeconds ? { presignedExpirySeconds: expiresInSeconds } : undefined
      );
    }
  }
  return record.fileUrl;
}

/**
 * Authorized media deletion with ownership enforcement:
 * - Requester must be the original uploader, OR
 * - Requester must have an administrative role ('admin' or 'owner')
 */
export async function deleteMediaRecordAuthorized(
  idOrUrl: string,
  requesterId: string,
  requesterRole: string
): Promise<{ success: boolean; error?: string; status?: number }> {
  // Find by ID first, then by URL
  const record = getMediaRecordById(idOrUrl) || getMediaRecordByUrl(idOrUrl);
  if (!record) {
    return { success: false, error: 'Media record not found', status: 404 };
  }

  // Authorization check
  const isOwner = record.uploaderId === requesterId;
  const isAdmin = requesterRole === 'admin' || requesterRole === 'owner';

  if (!isOwner && !isAdmin) {
    return { success: false, error: 'Forbidden: You do not have permission to delete this media', status: 403 };
  }

  // Perform deletion based on storage provider
  if (record.storageProvider === 'r2' && record.storageKey) {
    if (isR2Configured()) {
      await deleteObjectFromR2(record.storageKey);
    }
  } else {
    // Local JSON disk file deletion (supports both uploads and private_messages)
    deleteLocalDiskFile(record.storageKey || record.fileUrl);
  }

  // Record storage decrease and Class A deletion operation
  recordObjectDeleted(record.sizeBytes || 0);

  // Remove from index
  mediaRecords.delete(record.id);
  saveMediaIndex();

  return { success: true };
}

/**
 * Helper to delete a local file from disk (handles public uploads and private messages).
 */
function deleteLocalDiskFile(fileUrlOrKey: string): boolean {
  try {
    if (!fileUrlOrKey) return false;
    // Direct absolute path
    if (path.isAbsolute(fileUrlOrKey) && fs.existsSync(fileUrlOrKey)) {
      fs.unlinkSync(fileUrlOrKey);
      return true;
    }
    // Private messages folder candidate
    const privateCandidate = path.join(PRIVATE_MESSAGES_DIR, path.basename(fileUrlOrKey));
    if (fs.existsSync(privateCandidate)) {
      fs.unlinkSync(privateCandidate);
      return true;
    }
    if (fileUrlOrKey.startsWith('/uploads/')) {
      const relPath = fileUrlOrKey.replace('/uploads/', '');
      const absPath = path.join(UPLOADS_DIR, relPath);
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath);
        return true;
      }
    }
  } catch (e) {
    console.warn('Failed to delete local media file from disk:', e);
  }
  return false;
}

/**
 * Legacy deletion function preserved for backwards compatibility with socialStore.ts.
 */
export function deleteMediaFile(fileUrl: string): boolean {
  try {
    // Check if indexed in memory
    for (const [id, rec] of mediaRecords.entries()) {
      if (rec.fileUrl === fileUrl || (rec.storageKey && rec.storageKey === fileUrl)) {
        if (rec.storageProvider === 'r2' && rec.storageKey && isR2Configured()) {
          deleteObjectFromR2(rec.storageKey).catch((e) => console.warn('R2 delete error:', e));
        } else {
          deleteLocalDiskFile(rec.storageKey || rec.fileUrl);
        }
        recordObjectDeleted(rec.sizeBytes || 0);
        mediaRecords.delete(id);
        saveMediaIndex();
        return true;
      }
    }

    // Direct unindexed disk delete
    return deleteLocalDiskFile(fileUrl);
  } catch (e) {
    console.warn('Failed to delete media file:', e);
  }
  return false;
}

/**
 * Returns current media store status and count for diagnostic auditing.
 */
export function getMediaStoreStatus() {
  const provider = getStorageProvider();
  const r2Ready = isR2Configured();
  const quota = getR2QuotaStatus();

  return {
    provider,
    totalRecords: mediaRecords.size,
    isR2Configured: r2Ready,
    allowedMimes: ALLOWED_MIME_TYPES,
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
    maxImageSizeBytes: MAX_IMAGE_SIZE_BYTES,
    preferredImageTargetBytes: PREFERRED_IMAGE_TARGET_BYTES,
    maxVideoSizeBytes: MAX_VIDEO_SIZE_BYTES,
    preferredVideoTargetBytes: PREFERRED_VIDEO_TARGET_BYTES,
    maxVideoDurationSeconds: MAX_VIDEO_DURATION_SECONDS,
    quota,
  };
}
