/**
 * Zan-Gi Smart Client-Side Photo Compressor
 *
 * Capabilities:
 * - Handles large photos up to 100-200 MB originals without freezing the UI
 * - Compresses locally in the browser BEFORE transmitting to Cloudflare R2
 * - Targets safe free-tier limit (< 2 MB standard, up to 20 MB configurable)
 * - Preserves aspect ratio, orientation, transparency (PNG/WebP), and visual fidelity
 * - Progressive quality and dimension stepping with cancellable progress events
 * - Never transmits oversized raw originals if compression fails
 */

export interface ImageCompressionOptions {
  maxTargetSizeBytes?: number;     // Defaults to 1.8 MB (safe under 2 MB free-tier limit)
  maxDimension?: number;           // Defaults to 2560px
  preferredFormat?: 'image/webp' | 'image/jpeg' | 'image/png';
  preserveTransparency?: boolean; // Default true: detects PNG alpha and keeps PNG or WebP
  onProgress?: (progress: ImageCompressionProgress) => void;
  signal?: AbortSignal;
}

export interface ImageCompressionProgress {
  stage: 'reading' | 'analyzing' | 'resizing' | 'encoding' | 'optimizing' | 'complete' | 'aborted' | 'error';
  percent: number; // 0 - 100
  originalSizeBytes: number;
  currentSizeBytes?: number;
  message: string;
}

export interface CompressedImageResult {
  file: File;
  blob: Blob;
  previewUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  savedBytes: number;
  compressionRatio: number; // e.g. 0.25 (75% reduction)
  width: number;
  height: number;
  format: string;
}

/**
 * Checks whether an image Blob/File has alpha transparency channel (PNG).
 */
async function hasTransparency(file: File): Promise<boolean> {
  if (file.type !== 'image/png') return false;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    // Sample a small version for speed
    const sampleW = Math.min(bitmap.width, 128);
    const sampleH = Math.min(bitmap.height, 128);
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(bitmap, 0, 0, sampleW, sampleH);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] < 250) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * High-performance progressive client-side image compression.
 */
export async function compressImageLocally(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxTargetSizeBytes = 1.8 * 1024 * 1024, // 1.8 MB default safe threshold
    maxDimension = 2560,
    preserveTransparency = true,
    onProgress,
    signal,
  } = options;

  const originalSizeBytes = file.size;

  const report = (stage: ImageCompressionProgress['stage'], percent: number, message: string, currentBytes?: number) => {
    if (onProgress) {
      onProgress({
        stage,
        percent,
        originalSizeBytes,
        currentSizeBytes: currentBytes,
        message,
      });
    }
  };

  if (signal?.aborted) {
    throw new Error('Compression was cancelled by user.');
  }

  report('reading', 10, 'Reading original image bytes...');

  // If already comfortably below target size and reasonable dimensions, check format
  const isTransparent = preserveTransparency && (await hasTransparency(file));
  const format: 'image/webp' | 'image/jpeg' | 'image/png' = isTransparent
    ? 'image/png'
    : options.preferredFormat || 'image/webp';

  report('analyzing', 25, 'Analyzing image resolution & transparency...');

  // Load image bitmap for hardware-accelerated decoding
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (err: any) {
    report('error', 0, 'Could not decode image.');
    throw new Error(`Failed to decode image "${file.name}". The file may be corrupt or an unsupported format.`);
  }

  if (signal?.aborted) {
    bitmap.close?.();
    throw new Error('Compression was cancelled by user.');
  }

  // Calculate target dimensions preserving aspect ratio
  let targetWidth = bitmap.width;
  let targetHeight = bitmap.height;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }
  }

  report('resizing', 45, `Resizing from ${bitmap.width}x${bitmap.height} to ${targetWidth}x${targetHeight}...`);

  // Create canvas for rendering
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: isTransparent });

  if (!ctx) {
    bitmap.close?.();
    throw new Error('Canvas 2D rendering context could not be initialized.');
  }

  // Smooth resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (!isTransparent) {
    // Fill white background for JPEGs if needed
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close?.();

  if (signal?.aborted) {
    throw new Error('Compression was cancelled by user.');
  }

  report('encoding', 60, 'Encoding with adaptive quality optimization...');

  // Helper to convert canvas to blob with promise
  const toBlobPromise = (q: number, fmt: string): Promise<Blob | null> => {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), fmt, q);
    });
  };

  // Progressive quality stepping
  const qualitySteps = isTransparent ? [1.0] : [0.92, 0.85, 0.78, 0.68, 0.55];
  let bestBlob: Blob | null = null;
  let currentQuality = 0.92;

  for (let i = 0; i < qualitySteps.length; i++) {
    if (signal?.aborted) throw new Error('Compression was cancelled by user.');

    currentQuality = qualitySteps[i];
    report('optimizing', 65 + i * 6, `Testing quality ${Math.round(currentQuality * 100)}%...`);

    const candidateBlob = await toBlobPromise(currentQuality, format);
    if (!candidateBlob) continue;

    bestBlob = candidateBlob;
    if (candidateBlob.size <= maxTargetSizeBytes) {
      break;
    }
  }

  // If still oversized after quality steps, downscale dimensions
  let currentW = targetWidth;
  let currentH = targetHeight;
  let downscaleTries = 0;

  while (bestBlob && bestBlob.size > maxTargetSizeBytes && downscaleTries < 4) {
    if (signal?.aborted) throw new Error('Compression was cancelled by user.');

    downscaleTries++;
    currentW = Math.round(currentW * 0.8);
    currentH = Math.round(currentH * 0.8);

    report('optimizing', 85 + downscaleTries * 3, `Adaptive downscale to ${currentW}x${currentH}...`, bestBlob.size);

    const downscaleCanvas = document.createElement('canvas');
    downscaleCanvas.width = currentW;
    downscaleCanvas.height = currentH;
    const downCtx = downscaleCanvas.getContext('2d', { alpha: isTransparent });
    if (downCtx) {
      downCtx.imageSmoothingEnabled = true;
      downCtx.imageSmoothingQuality = 'high';
      if (!isTransparent) {
        downCtx.fillStyle = '#ffffff';
        downCtx.fillRect(0, 0, currentW, currentH);
      }
      downCtx.drawImage(canvas, 0, 0, currentW, currentH);
      bestBlob = await new Promise((res) => downscaleCanvas.toBlob(res, format, 0.72));
    }
  }

  if (!bestBlob) {
    throw new Error('Image compression could not generate an output file.');
  }

  // Safety threshold check: if still above hard max, throw clean error
  if (bestBlob.size > maxTargetSizeBytes * 1.15 && bestBlob.size > 2 * 1024 * 1024) {
    throw new Error(
      `Photo could not be safely compressed below ${(maxTargetSizeBytes / (1024 * 1024)).toFixed(1)} MB (final size: ${(bestBlob.size / (1024 * 1024)).toFixed(2)} MB). Please select a different image or trim its resolution.`
    );
  }

  report('complete', 100, 'Image compression completed successfully!', bestBlob.size);

  const ext = format === 'image/webp' ? '.webp' : isTransparent ? '.png' : '.jpg';
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const compressedFileName = `${baseName}_optimized${ext}`;

  const compressedFile = new File([bestBlob], compressedFileName, {
    type: bestBlob.type,
    lastModified: Date.now(),
  });

  const previewUrl = URL.createObjectURL(bestBlob);

  return {
    file: compressedFile,
    blob: bestBlob,
    previewUrl,
    originalSizeBytes,
    compressedSizeBytes: bestBlob.size,
    savedBytes: Math.max(0, originalSizeBytes - bestBlob.size),
    compressionRatio: Number((bestBlob.size / Math.max(1, originalSizeBytes)).toFixed(3)),
    width: currentW,
    height: currentH,
    format: bestBlob.type,
  };
}
