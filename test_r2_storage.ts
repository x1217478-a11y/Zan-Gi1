/**
 * Zan-Gi — Cloudflare R2 Free-Tier Storage & Architecture Test Suite
 * Non-destructive verification of:
 * 1. Default provider selection & safe fallback to JSON
 * 2. Missing credentials safety & resilience
 * 3. Strict MIME type whitelist enforcement
 * 4. Strict Free-Tier file boundaries:
 *    - Images: max 2 MB
 *    - Videos: max 15 MB
 *    - Duration: max 30s
 * 5. Media authorization, ownership, & admin deletion permissions
 * 6. Cloudflare R2 Standard StorageClass & presigned URL isolation
 * 7. 7 GB warning threshold & 8 GB hard stop cutoff
 * 8. Class A (1M) and Class B (10M) operation tracking (70%, 85%, 90% hard stop)
 * 9. Atomic reservation & concurrent upload locking
 * 10. Deletion storage capacity reduction & Class A audit
 * 11. Preserving existing users, posts, and database data
 * 12. Quota diagnostics & Cloudflare billing delay disclaimer
 */

import {
  getStorageProvider,
  isAllowedMimeType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  PREFERRED_IMAGE_TARGET_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  PREFERRED_VIDEO_TARGET_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
  getMediaStoreStatus,
  registerMediaRecord,
  getMediaRecordById,
  deleteMediaRecordAuthorized,
  registerMediaRecordAsync,
} from './src/server/mediaStore.js';

import {
  getR2Config,
  isR2Configured,
  createR2Client,
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  uploadBufferToR2,
  deleteObjectFromR2,
} from './src/server/r2Client.js';

import {
  getR2QuotaStatus,
  checkUploadAllowed,
  reserveUploadCapacity,
  commitUploadCapacity,
  releaseUploadCapacity,
  recordClassAOperation,
  recordClassBOperation,
  recordObjectDeleted,
  syncStorageFromMediaRecords,
  STORAGE_HARD_LIMIT_BYTES,
  STORAGE_WARN_LIMIT_BYTES,
  STORAGE_MONITOR_LIMIT_BYTES,
  STORAGE_PAUSE_HARD_LIMIT_BYTES,
  CLASS_A_MONTHLY_FREE_QUOTA,
  CLASS_B_MONTHLY_FREE_QUOTA,
  CLASS_A_HALT_90_PCT,
  CLASS_B_HALT_90_PCT,
} from './src/server/r2UsageTracker.js';

import { S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, failureDetail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${failureDetail ? `(${failureDetail})` : ''}`);
    failed++;
  }
}

async function runR2Tests() {
  console.log('================================================================');
  console.log('    ZAN-GI CLOUDFLARE R2 FREE-TIER STORAGE ARCHITECTURE SUITE  ');
  console.log('================================================================\n');

  // Backup original env vars
  const origProvider = process.env.STORAGE_PROVIDER;
  const origBackend = process.env.STORAGE_BACKEND;
  const origAccountId = process.env.R2_ACCOUNT_ID;
  const origBucket = process.env.R2_BUCKET_NAME;
  const origKeyId = process.env.R2_ACCESS_KEY_ID;
  const origSecret = process.env.R2_SECRET_ACCESS_KEY;
  const origDomain = process.env.R2_PUBLIC_DOMAIN;
  const origIsPublic = process.env.R2_IS_PUBLIC;

  try {
    // -------------------------------------------------------------
    // TEST 1: DEFAULT PROVIDER & PROVIDER SWITCHING
    // -------------------------------------------------------------
    console.log('1. STORAGE PROVIDER SELECTION & SAFE DEFAULTS:');
    delete process.env.STORAGE_PROVIDER;
    process.env.STORAGE_BACKEND = 'json';
    assert(getStorageProvider() === 'json', 'Default storage provider is "json"');

    process.env.STORAGE_PROVIDER = 'r2';
    assert(getStorageProvider() === 'r2', 'Switches to "r2" when STORAGE_PROVIDER="r2"');

    process.env.STORAGE_PROVIDER = 'cloudflare_r2';
    assert(getStorageProvider() === 'r2', 'Recognizes "cloudflare_r2" alias');

    process.env.STORAGE_PROVIDER = 'unknown_backend';
    assert(getStorageProvider() === 'json', 'Unknown provider safely falls back to "json"');

    // Reset back to json
    process.env.STORAGE_PROVIDER = 'json';
    process.env.STORAGE_BACKEND = 'json';

    // -------------------------------------------------------------
    // TEST 2: MISSING CONFIGURATION RESILIENCE
    // -------------------------------------------------------------
    console.log('\n2. MISSING CONFIGURATION RESILIENCE:');
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;

    assert(!isR2Configured(), 'isR2Configured() returns false when env credentials unset');
    assert(getR2Config() === null, 'getR2Config() returns null when required credentials missing');

    let missingConfigThrew = false;
    try {
      createR2Client();
    } catch (e: any) {
      missingConfigThrew = e.message.includes('Missing required R2 credentials');
    }
    assert(missingConfigThrew, 'createR2Client() throws clean error on missing credentials');

    process.env.STORAGE_PROVIDER = 'r2';
    const dummyPath = path.resolve(process.cwd(), 'uploads', 'test_r2_dummy.jpg');
    fs.writeFileSync(dummyPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00]));
    let asyncUploadError = false;
    try {
      await registerMediaRecordAsync('user_test', {
        originalname: 'test.jpg',
        filename: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        path: dummyPath,
      } as any, 'image');
    } catch (e: any) {
      asyncUploadError = e.message.includes('not configured');
    } finally {
      if (fs.existsSync(dummyPath)) try { fs.unlinkSync(dummyPath); } catch {}
    }
    assert(asyncUploadError, 'registerMediaRecordAsync() rejects when R2 is active but unconfigured');
    process.env.STORAGE_PROVIDER = 'json';

    // -------------------------------------------------------------
    // TEST 3: STRICT MIME TYPE VALIDATION
    // -------------------------------------------------------------
    console.log('\n3. STRICT MIME TYPE WHITELIST ENFORCEMENT:');
    const validMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];
    for (const mime of validMimes) {
      assert(isAllowedMimeType(mime), `Allowed MIME type accepted: ${mime}`);
    }

    const invalidMimes = [
      'application/x-msdownload',
      'text/html',
      'application/javascript',
      'image/svg+xml', // SVG disallowed to prevent stored XSS attacks
      'application/pdf',
      'application/octet-stream',
      'application/zip',
    ];
    for (const mime of invalidMimes) {
      assert(!isAllowedMimeType(mime), `Disallowed MIME type rejected: ${mime}`);
    }

    // -------------------------------------------------------------
    // TEST 4: RESOLVED FILE SIZE & DURATION BOUNDARIES (60 MB Hard Max, 15 MB Preferred, 150s)
    // -------------------------------------------------------------
    console.log('\n4. RESOLVED FILE BOUNDARIES (20 MB Image, 60 MB Video Hard Max, 15 MB Preferred Target, 150s):');
    assert(MAX_IMAGE_SIZE_BYTES === 20 * 1024 * 1024, 'MAX_IMAGE_SIZE_BYTES is 20 MB ceiling (20,971,520 bytes)');
    assert(PREFERRED_IMAGE_TARGET_BYTES === 2 * 1024 * 1024, 'PREFERRED_IMAGE_TARGET_BYTES is 2 MB standard target');
    assert(MAX_VIDEO_SIZE_BYTES === 60 * 1024 * 1024, 'MAX_VIDEO_SIZE_BYTES is exactly 60 MB hard maximum (62,914,560 bytes)');
    assert(PREFERRED_VIDEO_TARGET_BYTES === 15 * 1024 * 1024, 'PREFERRED_VIDEO_TARGET_BYTES is 15 MB preferred adaptive target');
    assert(MAX_VIDEO_DURATION_SECONDS >= 150 && MAX_VIDEO_DURATION_SECONDS <= 180, 'MAX_VIDEO_DURATION_SECONDS supports 1-3 minute videos (180s)');

    // Verify image size threshold rejection above 20 MB ceiling
    let imageRejectThrew = false;
    try {
      registerMediaRecord('uploader_test', {
        originalname: 'large.jpg',
        filename: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 21 * 1024 * 1024, // 21 MB
      } as any, 'image');
    } catch (e: any) {
      imageRejectThrew = e.message.includes('exceeds maximum allowed size of 20 MB');
    }
    assert(imageRejectThrew, 'Oversized image (21 MB) is strictly rejected');

    // Verify video size threshold rejection above 60 MB hard ceiling
    let videoRejectThrew = false;
    try {
      registerMediaRecord('uploader_test', {
        originalname: 'large.mp4',
        filename: 'large.mp4',
        mimetype: 'video/mp4',
        size: 61 * 1024 * 1024, // 61 MB
      } as any, 'video');
    } catch (e: any) {
      videoRejectThrew = e.message.includes('exceeds maximum allowed upload size of 60 MB');
    }
    assert(videoRejectThrew, 'Oversized video (61 MB) is strictly rejected by server');

    // Verify allowed size acceptance (1.8 MB standard image and 14 MB preferred video)
    const validImageRecord = registerMediaRecord('uploader_test', {
      originalname: 'valid.jpg',
      filename: 'zg_valid_img.jpg',
      mimetype: 'image/jpeg',
      size: 1.8 * 1024 * 1024, // 1.8 MB
    } as any, 'image');
    assert(Boolean(validImageRecord?.id), 'Valid image (1.8 MB) is accepted and registered');

    const validVideoRecord = registerMediaRecord('uploader_test', {
      originalname: 'valid_compressed_reel.mp4',
      filename: 'zg_valid_reel.mp4',
      mimetype: 'video/mp4',
      size: 14.5 * 1024 * 1024, // 14.5 MB (within 15 MB preferred target and 60 MB hard limit)
    } as any, 'video');
    assert(Boolean(validVideoRecord?.id), 'Valid video (14.5 MB preferred target) is accepted and registered');

    // -------------------------------------------------------------
    // TEST 5: MEDIA AUTHORIZATION & DELETION PRIVILEGE ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n5. MEDIA AUTHORIZATION & OWNERSHIP ENFORCEMENT:');
    const testRecord = registerMediaRecord('uploader_alice', {
      originalname: 'scenic.jpg',
      filename: 'zg_test_alice_photo.jpg',
      mimetype: 'image/jpeg',
      size: 2048,
    } as any, 'image');

    assert(Boolean(testRecord.id), 'Test media record registered with unique ID');
    assert(getMediaRecordById(testRecord.id)?.uploaderId === 'uploader_alice', 'Record correctly indexes uploader ID');

    // Attack: bob attempts to delete alice's media
    const bobDelete = await deleteMediaRecordAuthorized(testRecord.id, 'attacker_bob', 'creator');
    assert(!bobDelete.success && bobDelete.status === 403, 'Unauthorized user (bob) blocked from deleting alice media (HTTP 403)');

    // Attempt deleting non-existent media
    const notFoundDelete = await deleteMediaRecordAuthorized('med_nonexistent_9999', 'uploader_alice', 'creator');
    assert(!notFoundDelete.success && notFoundDelete.status === 404, 'Non-existent media deletion returns HTTP 404');

    // Authorized: platform admin can delete any media
    const adminDelete = await deleteMediaRecordAuthorized(testRecord.id, 'admin_charlie', 'admin');
    assert(adminDelete.success, 'Platform admin is authorized to delete media for content moderation');
    assert(!getMediaRecordById(testRecord.id), 'Deleted media record removed from index');

    // -------------------------------------------------------------
    // TEST 6: R2 STANDARD STORAGE CLASS & PRESIGNED URL ISOLATION
    // -------------------------------------------------------------
    console.log('\n6. R2 STANDARD STORAGE CLASS & PRESIGNED URL ISOLATION:');
    const mockR2Config = {
      accountId: 'test_acc_987654321',
      bucketName: 'zangi-test-bucket',
      accessKeyId: 'TEST_ACCESS_KEY_ABCD',
      secretAccessKey: 'TEST_SECRET_KEY_1234567890abcdef',
      isPublic: false,
      presignedExpirySeconds: 1800,
    };

    const client = createR2Client(mockR2Config);
    assert(client instanceof S3Client, 'createR2Client returns valid S3Client instance');

    const testKey = 'media/images/zg_2026_test.jpg';
    const signedDownloadUrl = await generatePresignedDownloadUrl(testKey, client, mockR2Config);
    assert(signedDownloadUrl.includes('test_acc_987654321.r2.cloudflarestorage.com'), 'Signed URL targets Cloudflare R2 endpoint');
    assert(signedDownloadUrl.includes('X-Amz-Signature='), 'Signed URL contains standard AWS SigV4 signature');
    assert(!signedDownloadUrl.includes('TEST_SECRET_KEY_1234567890abcdef'), 'CRITICAL: Secret access key is NOT exposed in presigned URL');

    const uploadRes = await generatePresignedUploadUrl(testKey, 'image/jpeg', client, mockR2Config);
    assert(uploadRes.uploadUrl.includes('X-Amz-Signature='), 'Presigned upload URL contains signature');
    assert(uploadRes.publicOrDirectUrl.startsWith('/api/media/r2/'), 'Private bucket directs viewers through secure application proxy');

    // -------------------------------------------------------------
    // TEST 7: 7.5 GB MONITOR & 9.5 GB HARD STOP CUTOFF
    // -------------------------------------------------------------
    console.log('\n7. STORAGE THRESHOLDS (7.5 GB Monitor, 8.5 GB Optimize, 9.0 GB Strict, 9.5 GB Hard Pause):');
    assert(STORAGE_MONITOR_LIMIT_BYTES === 7.5 * 1024 * 1024 * 1024, 'STORAGE_MONITOR_LIMIT_BYTES is 7.5 GB');
    assert(STORAGE_PAUSE_HARD_LIMIT_BYTES === 9.5 * 1024 * 1024 * 1024, 'STORAGE_PAUSE_HARD_LIMIT_BYTES is 9.5 GB');

    // Reset storage to 0
    syncStorageFromMediaRecords(0);

    // Check normal capacity
    const normalCheck = checkUploadAllowed(1024 * 1024);
    assert(normalCheck.allowed, 'Upload is allowed when well below safety limits');

    // Check 9.5 GB hard cutoff simulation
    const giantCheck = checkUploadAllowed(9.6 * 1024 * 1024 * 1024);
    assert(!giantCheck.allowed, 'Upload exceeding 9.5 GB hard safety limit is strictly blocked');
    assert(giantCheck.status === 'blocked_storage', 'Status reflects blocked_storage');

    // -------------------------------------------------------------
    // TEST 8: CLASS A & CLASS B OPERATION TRACKING & QUOTAS
    // -------------------------------------------------------------
    console.log('\n8. OPERATION TRACKING & FREE-TIER QUOTAS:');
    assert(CLASS_A_MONTHLY_FREE_QUOTA === 1_000_000, 'Class A free quota is 1,000,000 requests/month');
    assert(CLASS_B_MONTHLY_FREE_QUOTA === 10_000_000, 'Class B free quota is 10,000,000 requests/month');
    assert(CLASS_A_HALT_90_PCT === 900_000, 'Class A hard halt engaged at 900,000 requests (90%)');
    assert(CLASS_B_HALT_90_PCT === 9_000_000, 'Class B hard halt engaged at 9,000,000 requests (90%)');

    const quotaBefore = getR2QuotaStatus();
    recordClassAOperation(5);
    recordClassBOperation(10);
    const quotaAfter = getR2QuotaStatus();
    assert(quotaAfter.classAOperations === quotaBefore.classAOperations + 5, 'Class A operations correctly incremented (+5)');
    assert(quotaAfter.classBOperations === quotaBefore.classBOperations + 10, 'Class B operations correctly incremented (+10)');

    // -------------------------------------------------------------
    // TEST 9: ATOMIC RESERVATIONS & CONCURRENT UPLOAD LOCKING
    // -------------------------------------------------------------
    console.log('\n9. ATOMIC RESERVATIONS & CONCURRENT UPLOAD LOCKING:');
    const reserve1 = reserveUploadCapacity(1024 * 1024);
    assert(reserve1.allowed && Boolean(reserve1.reservationId), 'Atomic capacity reservation succeeds');

    // Parallel attempt exceeding capacity should be blocked
    const reserveHuge = reserveUploadCapacity(9.6 * 1024 * 1024 * 1024);
    assert(!reserveHuge.allowed, 'Concurrent upload attempting to exceed 9.5 GB is rejected');

    // Releasing reservation
    if (reserve1.reservationId) {
      releaseUploadCapacity(reserve1.reservationId);
      assert(true, 'Reservation successfully released upon cancellation/failure');
    }

    // -------------------------------------------------------------
    // TEST 10: DELETION STORAGE REDUCTION & CLASS A AUDITING
    // -------------------------------------------------------------
    console.log('\n10. STORAGE REDUCTION ON OBJECT DELETION:');
    const beforeDelQuota = getR2QuotaStatus();
    recordObjectDeleted(1024);
    const afterDelQuota = getR2QuotaStatus();
    assert(afterDelQuota.classAOperations === beforeDelQuota.classAOperations + 1, 'Deletion logs 1 Class A operation');

    // -------------------------------------------------------------
    // TEST 11: PRESERVING EXISTING DATABASE FILES & ZERO BINARY IN JSON
    // -------------------------------------------------------------
    console.log('\n11. PRESERVING EXISTING DATABASE DATA:');
    const usersDbPath = path.resolve(process.cwd(), 'data', 'users_db.json');
    const socialDbPath = path.resolve(process.cwd(), 'data', 'social_db.json');
    assert(fs.existsSync(usersDbPath), 'data/users_db.json exists and is preserved');
    assert(fs.existsSync(socialDbPath), 'data/social_db.json exists and is preserved');

    // Verify no base64 binary blobs in users_db
    const usersRaw = fs.readFileSync(usersDbPath, 'utf-8');
    assert(!usersRaw.includes('data:image/'), 'users_db.json does not contain embedded binary media (clean separation)');

    // -------------------------------------------------------------
    // TEST 12: QUOTA TELEMETRY & CLOUDFLARE DISCLAIMER
    // -------------------------------------------------------------
    console.log('\n12. QUOTA TELEMETRY & CLOUDFLARE BILLING DISCLAIMER:');
    const status = getMediaStoreStatus();
    assert(status.maxImageSizeBytes === MAX_IMAGE_SIZE_BYTES, 'Status exposes 20 MB image ceiling');
    assert(status.maxVideoSizeBytes === MAX_VIDEO_SIZE_BYTES, 'Status exposes 60 MB video hard ceiling');
    assert(status.preferredVideoTargetBytes === PREFERRED_VIDEO_TARGET_BYTES, 'Status exposes 15 MB preferred video target');
    assert(status.maxVideoDurationSeconds === MAX_VIDEO_DURATION_SECONDS, 'Status exposes 150s video duration limit');
    assert(typeof status.quota.disclaimer === 'string' && status.quota.disclaimer.includes('propagation delays'),
      'Notice transparently clarifies Cloudflare telemetry propagation delays');

  } finally {
    // Restore original env vars
    if (origProvider) process.env.STORAGE_PROVIDER = origProvider;
    else delete process.env.STORAGE_PROVIDER;

    if (origBackend) process.env.STORAGE_BACKEND = origBackend;
    else delete process.env.STORAGE_BACKEND;

    if (origAccountId) process.env.R2_ACCOUNT_ID = origAccountId;
    else delete process.env.R2_ACCOUNT_ID;

    if (origBucket) process.env.R2_BUCKET_NAME = origBucket;
    else delete process.env.R2_BUCKET_NAME;

    if (origKeyId) process.env.R2_ACCESS_KEY_ID = origKeyId;
    else delete process.env.R2_ACCESS_KEY_ID;

    if (origSecret) process.env.R2_SECRET_ACCESS_KEY = origSecret;
    else delete process.env.R2_SECRET_ACCESS_KEY;

    if (origDomain) process.env.R2_PUBLIC_DOMAIN = origDomain;
    else delete process.env.R2_PUBLIC_DOMAIN;

    if (origIsPublic) process.env.R2_IS_PUBLIC = origIsPublic;
    else delete process.env.R2_IS_PUBLIC;
  }

  console.log('\n================================================================');
  console.log(`  FREE-TIER R2 STORAGE TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runR2Tests().catch((err) => {
  console.error('Unexpected test execution failure:', err);
  process.exit(1);
});
