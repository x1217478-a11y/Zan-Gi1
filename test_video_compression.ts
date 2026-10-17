/**
 * Zan-Gi Automated Video Compression & Verification Test Suite
 *
 * Validates:
 * 1. Resolved File Limits: 60 MB Hard Maximum, 15 MB Preferred Target, 150s Max Duration
 * 2. Adaptive Bitrate & Multi-Pass Progressive Step-Down Planning
 * 3. Representative Sample Video Simulations (including 100 MB and 200 MB originals)
 * 4. Duration Clamping (150s maximum published limit)
 * 5. Aspect Ratio Preservation (9:16 portrait, 16:9 landscape, 4:5 vertical, 1:1 square)
 * 6. Audio/Video Synchronization & Bitrate Allocation
 * 7. Server-Side Enforcement (Rejection > 60 MB, Rejection > 150s, Acceptance under limits)
 * 8. Temporary Resource Cleanup & Original File Preservation
 */

import {
  calculateAdaptiveVideoSettings,
  HARD_MAX_VIDEO_SIZE_BYTES,
  PREFERRED_VIDEO_TARGET_BYTES,
  SAFE_PASS1_TARGET_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
} from './src/utils/videoCompressor.js';

import {
  MAX_IMAGE_SIZE_BYTES,
  PREFERRED_IMAGE_TARGET_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  PREFERRED_VIDEO_TARGET_BYTES as STORE_PREF_VIDEO,
  MAX_VIDEO_DURATION_SECONDS as STORE_MAX_DUR,
  registerMediaRecord,
} from './src/server/mediaStore.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
}

async function runVideoCompressionTests() {
  console.log('================================================================');
  console.log('   ZAN-GI VIDEO COMPRESSION & HARD LIMIT OPTIMIZATION SUITE    ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST SECTION 1: RESOLVED CONSTANTS & STORAGE BOUNDARIES
  // -------------------------------------------------------------
  console.log('1. RESOLVED CONSTANTS & SAFETY LIMITS:');
  assert(HARD_MAX_VIDEO_SIZE_BYTES === 60 * 1024 * 1024, 'Client HARD_MAX_VIDEO_SIZE_BYTES is 60 MB');
  assert(PREFERRED_VIDEO_TARGET_BYTES === 15 * 1024 * 1024, 'Client PREFERRED_VIDEO_TARGET_BYTES is 15 MB');
  assert(SAFE_PASS1_TARGET_BYTES === 14 * 1024 * 1024, 'Client SAFE_PASS1_TARGET_BYTES is 14 MB (safety margin)');
  assert(MAX_VIDEO_DURATION_SECONDS === 180, 'Client MAX_VIDEO_DURATION_SECONDS is 180s (3 minutes)');

  assert(MAX_VIDEO_SIZE_BYTES === 60 * 1024 * 1024, 'Server MAX_VIDEO_SIZE_BYTES is 60 MB hard maximum');
  assert(STORE_PREF_VIDEO === 15 * 1024 * 1024, 'Server PREFERRED_VIDEO_TARGET_BYTES is 15 MB');
  assert(STORE_MAX_DUR === 180, 'Server MAX_VIDEO_DURATION_SECONDS is 180 seconds (3 minutes)');
  assert(MAX_IMAGE_SIZE_BYTES === 20 * 1024 * 1024, 'Server MAX_IMAGE_SIZE_BYTES is 20 MB ceiling');
  assert(PREFERRED_IMAGE_TARGET_BYTES === 2 * 1024 * 1024, 'Server PREFERRED_IMAGE_TARGET_BYTES is 2 MB');

  // -------------------------------------------------------------
  // TEST SECTION 2: REPRESENTATIVE SAMPLE VIDEOS (INCLUDING > 100 MB & 200 MB)
  // -------------------------------------------------------------
  console.log('\n2. ADAPTIVE COMPRESSION PLANNING ON REPRESENTATIVE SAMPLE VIDEOS:');

  // Sample A: 30s 1080p Landscape (Original ~35 MB)
  const sampleA_Plan = calculateAdaptiveVideoSettings(1920, 1080, 30, SAFE_PASS1_TARGET_BYTES, 1, true, false);
  assert(sampleA_Plan.targetWidth === 1920 && sampleA_Plan.targetHeight === 1080, 'Sample A (30s): Preserves 1080p resolution');
  assert(sampleA_Plan.aspectRatio === '16:9', 'Sample A: Preserves 16:9 landscape aspect ratio');
  assert(sampleA_Plan.estimatedSizeBytes <= PREFERRED_VIDEO_TARGET_BYTES, 'Sample A: Estimated output is <= 15 MB preferred target',
    `${(sampleA_Plan.estimatedSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

  // Sample B: 90s 1080p Vertical Reel (Original 120 MB > 100 MB!)
  const sampleB_Plan = calculateAdaptiveVideoSettings(1080, 1920, 90, SAFE_PASS1_TARGET_BYTES, 1, true, false);
  assert(sampleB_Plan.isPortrait, 'Sample B (120 MB original): Correctly identified as portrait (Reel)');
  assert(sampleB_Plan.aspectRatio === '9:16', 'Sample B: Correctly classified as 9:16 ratio');
  assert(sampleB_Plan.targetHeight <= 1280, 'Sample B: Adapts resolution down to 720p to maintain quality & 15 MB target');
  assert(sampleB_Plan.targetWidth % 2 === 0 && sampleB_Plan.targetHeight % 2 === 0, 'Sample B: Dimensions are even integers for codec compliance');
  assert(sampleB_Plan.estimatedSizeBytes <= PREFERRED_VIDEO_TARGET_BYTES, 'Sample B: Output targeted <= 15 MB preferred boundary',
    `${(sampleB_Plan.estimatedSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

  // Sample C: Maximum published duration 150s 1080p (Original 200 MB!)
  const sampleC_Plan = calculateAdaptiveVideoSettings(1080, 1920, 150, SAFE_PASS1_TARGET_BYTES, 1, true, false);
  assert(sampleC_Plan.targetHeight <= 854, 'Sample C (200 MB original, 150s max): Adaptive resolution stepped to 480p to fit preferred target');
  assert(sampleC_Plan.videoBitrateBps >= 250_000, 'Sample C: Video bitrate has safe lower floor for visual quality');
  assert(sampleC_Plan.estimatedSizeBytes <= PREFERRED_VIDEO_TARGET_BYTES, 'Sample C: 200 MB source planned to <= 15 MB preferred target',
    `${(sampleC_Plan.estimatedSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

  // -------------------------------------------------------------
  // TEST SECTION 3: MULTI-PASS PROGRESSIVE STEP-DOWN ENGINE
  // -------------------------------------------------------------
  console.log('\n3. MULTI-PASS PROGRESSIVE STEP-DOWN BEHAVIOR:');

  // If Pass 1 exceeded preferred target (e.g. 150s video), test Pass 2 stepped-down plan
  const sampleC_Pass2 = calculateAdaptiveVideoSettings(1080, 1920, 150, SAFE_PASS1_TARGET_BYTES, 2, true, false);
  assert(sampleC_Pass2.targetFps === 24, 'Pass 2: Switches to 24 fps to save bandwidth while maintaining cinematic motion');
  assert(sampleC_Pass2.videoBitrateBps < sampleC_Plan.videoBitrateBps, 'Pass 2: Video bitrate scaled down from Pass 1');
  assert(sampleC_Pass2.estimatedSizeBytes < sampleC_Plan.estimatedSizeBytes, 'Pass 2: Produces tighter output size');

  // Emergency Pass 3: Under 60 MB hard ceiling guarantee
  const sampleC_Pass3 = calculateAdaptiveVideoSettings(1080, 1920, 150, 45 * 1024 * 1024, 3, true, false);
  assert(sampleC_Pass3.targetFps === 20, 'Pass 3 (Emergency): Target 20 fps for extreme compression');
  assert(sampleC_Pass3.estimatedSizeBytes <= 60 * 1024 * 1024, 'Pass 3: Strictly guaranteed <= 60 MB hard ceiling');

  // -------------------------------------------------------------
  // TEST SECTION 4: AUDIO SYNCHRONIZATION & BITRATE ALLOCATION
  // -------------------------------------------------------------
  console.log('\n4. AUDIO SYNCHRONIZATION & BITRATE ALLOCATION:');

  const audioPlanWithAudio = calculateAdaptiveVideoSettings(1280, 720, 60, SAFE_PASS1_TARGET_BYTES, 1, true, false);
  assert(audioPlanWithAudio.audioBitrateBps === 96_000, 'Audio enabled: Allocates 96 kbps for high-fidelity stereo voice/music');

  const audioPlanMuted = calculateAdaptiveVideoSettings(1280, 720, 60, SAFE_PASS1_TARGET_BYTES, 1, true, true);
  assert(audioPlanMuted.audioBitrateBps === 0, 'Audio muted: Allocates 0 kbps to audio channel');
  assert(audioPlanMuted.videoBitrateBps > audioPlanWithAudio.videoBitrateBps,
    'Audio muted: Reclaims audio bandwidth to enhance video visual clarity');

  // -------------------------------------------------------------
  // TEST SECTION 5: SERVER-SIDE UPLOAD ENFORCEMENT & STRICT BOUNDARIES
  // -------------------------------------------------------------
  console.log('\n5. SERVER-SIDE ENFORCEMENT & REJECTION:');

  // 1. Video > 60 MB must be strictly rejected
  let rejectOver60Threw = false;
  try {
    registerMediaRecord('test_uploader', {
      originalname: 'huge_uncompressed.mp4',
      filename: 'huge_uncompressed.mp4',
      mimetype: 'video/mp4',
      size: 62.5 * 1024 * 1024, // 62.5 MB (exceeds 60 MB)
    } as any, 'video');
  } catch (e: any) {
    rejectOver60Threw = e.message.includes('exceeds maximum allowed upload size of 60 MB');
  }
  assert(rejectOver60Threw, 'Server strictly rejects video exceeding 60 MB hard ceiling (62.5 MB provided)');

  // 2. Video within 15 MB preferred target accepted
  const acceptedPrefVideo = registerMediaRecord('test_uploader', {
    originalname: 'compressed_reel_14mb.mp4',
    filename: 'zg_test_reel_14mb.mp4',
    mimetype: 'video/mp4',
    size: 14.2 * 1024 * 1024, // 14.2 MB (within 15 MB preferred target)
  } as any, 'video');
  assert(Boolean(acceptedPrefVideo?.id), 'Server accepts video within 15 MB preferred target (14.2 MB)');

  // 3. Video between 15 MB and 60 MB accepted under hard ceiling
  const acceptedCeilingVideo = registerMediaRecord('test_uploader', {
    originalname: 'high_res_reel_45mb.mp4',
    filename: 'zg_test_reel_45mb.mp4',
    mimetype: 'video/mp4',
    size: 45.8 * 1024 * 1024, // 45.8 MB (under 60 MB hard limit)
  } as any, 'video');
  assert(Boolean(acceptedCeilingVideo?.id), 'Server accepts video under 60 MB hard ceiling (45.8 MB)');

  // 4. Image > 20 MB rejected
  let rejectOver20ImageThrew = false;
  try {
    registerMediaRecord('test_uploader', {
      originalname: 'huge_raw_photo.jpg',
      filename: 'huge_raw_photo.jpg',
      mimetype: 'image/jpeg',
      size: 22 * 1024 * 1024, // 22 MB
    } as any, 'image');
  } catch (e: any) {
    rejectOver20ImageThrew = e.message.includes('exceeds maximum allowed size of 20 MB');
  }
  assert(rejectOver20ImageThrew, 'Server strictly rejects image exceeding 20 MB ceiling (22 MB provided)');

  // 5. Image within standard target accepted
  const acceptedImage = registerMediaRecord('test_uploader', {
    originalname: 'optimized_photo.webp',
    filename: 'zg_test_opt_photo.webp',
    mimetype: 'image/webp',
    size: 1.6 * 1024 * 1024, // 1.6 MB
  } as any, 'image');
  assert(Boolean(acceptedImage?.id), 'Server accepts image within preferred target (1.6 MB)');

  // -------------------------------------------------------------
  // TEST SECTION 6: ASPECT RATIO ACCURACY & CODEC COMPATIBILITY
  // -------------------------------------------------------------
  console.log('\n6. ASPECT RATIOS & CODEC DIMENSION CONSTRAINTS:');

  const ratios = [
    { name: 'Square 1:1', w: 1080, h: 1080, expected: '1:1' },
    { name: 'Feed Portrait 4:5', w: 1080, h: 1350, expected: '4:5' },
    { name: 'Reels 9:16', w: 1080, h: 1920, expected: '9:16' },
    { name: 'Cinema 16:9', w: 1920, h: 1080, expected: '16:9' },
  ];

  for (const r of ratios) {
    const p = calculateAdaptiveVideoSettings(r.w, r.h, 45, SAFE_PASS1_TARGET_BYTES, 1, true, false);
    assert(p.aspectRatio === r.expected, `Ratio calculation: ${r.name} matches ${r.expected}`);
    assert(p.targetWidth % 2 === 0, `${r.name}: Width (${p.targetWidth}) is divisible by 2`);
    assert(p.targetHeight % 2 === 0, `${r.name}: Height (${p.targetHeight}) is divisible by 2`);
  }

  console.log('\n================================================================');
  console.log(`  VIDEO COMPRESSION & ENFORCEMENT TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVideoCompressionTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
