/**
 * Zan-Gi Local-First Media Cache & Storage Manager
 *
 * Implements:
 * - Local-first caching of photos, videos, and voice notes using browser Cache API and IndexedDB
 * - Storage usage calculation (images, videos, voice notes, downloaded files, total cache size)
 * - Safe clear-cache with explicit confirmation safeguards (never silently delete user files)
 * - "Save media to device / gallery" export with permission handling
 * - Network-aware auto-download (Wi-Fi only detection, type-specific controls)
 * - Device storage capacity detection and full-storage safe guards
 * - Transparent warnings for local-only media vs cloud-delivery
 */

import { StoragePreferences } from '../types';

const CACHE_NAME = 'zangi-local-media-v1';
const METADATA_KEY = 'zangi_media_cache_metadata';
const PREFS_STORAGE_KEY = 'zangi_storage_preferences';

export interface CachedMediaItem {
  url: string;
  messageId?: string;
  mediaType: 'image' | 'video' | 'audio';
  sizeBytes: number;
  downloadedAt: string;
  fileName?: string;
  isDownloaded?: boolean;
  savedToDevice?: boolean;
}

export interface StorageUsageBreakdown {
  imagesBytes: number;
  videosBytes: number;
  audioBytes: number;
  downloadedBytes: number;
  cacheOnlyBytes: number;
  totalCacheBytes: number;
  totalCacheKB: number;
  totalCacheMB: number;
  itemCount: number;
  imagesCount: number;
  videosCount: number;
  audioCount: number;
  downloadedCount: number;
}

export interface DeviceStorageEstimate {
  quotaBytes?: number;
  usedBytes?: number;
  availableBytes?: number;
  percentUsed?: number;
  isLowStorage: boolean;
}

export const DEFAULT_STORAGE_PREFERENCES: StoragePreferences = {
  saveMediaToDevice: false,      // Local-first: don't automatically save media to device unless chosen
  autoDownload: false,           // Auto-download received media
  autoDownloadPhotos: 'never',   // 'never' | 'wifi_only' | 'always'
  autoDownloadVideos: 'never',   // 'never' | 'wifi_only' | 'always'
  autoDownloadVoiceNotes: 'wifi_only', // Voice notes small enough for Wi-Fi
  wifiOnly: true,                // Restrict auto-download to Wi-Fi connections
  saveToGallery: false,          // Optional save to device gallery
  cloudDelivery: true,           // Cloud backup for cross-device & offline recipient delivery
  localOnlyMedia: false,         // Disclosed: local-only is not synced to cloud
};

/**
 * Loads storage preferences from localStorage, falling back to defaults.
 */
export function getStoredStoragePreferences(): StoragePreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STORAGE_PREFERENCES, ...parsed };
    }
  } catch {}
  return DEFAULT_STORAGE_PREFERENCES;
}

/**
 * Saves storage preferences to localStorage.
 */
export function saveStoredStoragePreferences(prefs: Partial<StoragePreferences>): StoragePreferences {
  const current = getStoredStoragePreferences();
  const updated = { ...current, ...prefs };
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

/**
 * Reads cache metadata catalog from localStorage.
 */
export function getMetadataCatalog(): Record<string, CachedMediaItem> {
  try {
    const raw = localStorage.getItem(METADATA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMetadataCatalog(catalog: Record<string, CachedMediaItem>): void {
  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(catalog));
  } catch {}
}

/**
 * Checks whether the current device is on a Wi-Fi connection.
 */
export function isWifiConnection(): boolean {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      if (conn.saveData) return false;
      if (conn.type) {
        return conn.type === 'wifi' || conn.type === 'ethernet';
      }
      if (conn.effectiveType) {
        // '4g', '3g', '2g', 'slow-2g'
        return conn.effectiveType === '4g';
      }
    }
  }
  return true; // Default to allowing when connection API is unavailable
}

/**
 * Determines whether a specific media item should be auto-downloaded based on preferences and current connection.
 */
export function shouldAutoDownloadMedia(
  mediaType: 'image' | 'video' | 'audio',
  prefs?: StoragePreferences
): boolean {
  const currentPrefs = prefs || getStoredStoragePreferences();
  const isWifi = isWifiConnection();

  // If Wi-Fi only is enforced and we're not on Wi-Fi, reject auto-download
  if (currentPrefs.wifiOnly && !isWifi) {
    return false;
  }

  // Type-specific rule
  let rule: 'never' | 'wifi_only' | 'always' = 'never';
  if (mediaType === 'image') {
    rule = currentPrefs.autoDownloadPhotos;
  } else if (mediaType === 'video') {
    rule = currentPrefs.autoDownloadVideos;
  } else if (mediaType === 'audio') {
    rule = currentPrefs.autoDownloadVoiceNotes;
  }

  if (rule === 'always') return true;
  if (rule === 'wifi_only') return isWifi;
  return false;
}

/**
 * Queries device storage estimate using the StorageManager API.
 */
export async function getDeviceStorageEstimate(): Promise<DeviceStorageEstimate> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      const quota = est.quota || 0;
      const usage = est.usage || 0;
      const available = Math.max(0, quota - usage);
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
      const isLowStorage = percentUsed > 90 || available < 100 * 1024 * 1024; // Less than 100MB or 90%+ used
      return {
        quotaBytes: quota,
        usedBytes: usage,
        availableBytes: available,
        percentUsed: Number(percentUsed.toFixed(1)),
        isLowStorage,
      };
    } catch {
      // Non-fatal
    }
  }
  return { isLowStorage: false };
}

/**
 * Checks if a media item is already cached on the user's device.
 */
export async function isMediaCached(mediaUrl: string): Promise<boolean> {
  if (!mediaUrl) return false;
  const catalog = getMetadataCatalog();
  if (catalog[mediaUrl]) return true;

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME);
      const matched = await cache.match(mediaUrl);
      return Boolean(matched);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Fetches and saves a media item to local device cache.
 * If user has "Save media to device" enabled or explicit isExplicitDownload is true, marks it as downloaded.
 */
export async function downloadAndCacheMedia(
  mediaUrl: string,
  mediaType: 'image' | 'video' | 'audio',
  messageId?: string,
  authToken?: string,
  options?: { isExplicitDownload?: boolean; saveToDevice?: boolean }
): Promise<{ success: boolean; objectUrl?: string; sizeBytes?: number; error?: string; isFull?: boolean }> {
  if (!mediaUrl) return { success: false, error: 'No media URL provided' };

  try {
    // 1. Check storage capacity before starting
    const storageEst = await getDeviceStorageEstimate();
    if (storageEst.isLowStorage && (storageEst.availableBytes || 0) < 5 * 1024 * 1024) {
      return {
        success: false,
        error: 'Device storage is critically full. Please free up space before downloading media.',
        isFull: true,
      };
    }

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(mediaUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to download media (${response.status} ${response.statusText})`);
    }

    const blob = await response.blob();
    const sizeBytes = blob.size;

    // Cache the response in browser Cache API
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME);
        const clonedResponse = new Response(blob, {
          headers: response.headers,
        });
        await cache.put(mediaUrl, clonedResponse);
      } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
          return {
            success: false,
            error: 'Device storage quota exceeded for this application.',
            isFull: true,
          };
        }
        console.warn('[LocalCache] Cache API storage notice:', e);
      }
    }

    const prefs = getStoredStoragePreferences();
    const shouldSaveToDevice = Boolean(options?.saveToDevice || prefs.saveMediaToDevice || options?.isExplicitDownload);

    // Update catalog
    const catalog = getMetadataCatalog();
    catalog[mediaUrl] = {
      url: mediaUrl,
      messageId,
      mediaType,
      sizeBytes,
      downloadedAt: new Date().toISOString(),
      fileName: mediaUrl.split('/').pop() || `zangi_${mediaType}_${Date.now()}`,
      isDownloaded: shouldSaveToDevice || Boolean(options?.isExplicitDownload),
      savedToDevice: shouldSaveToDevice,
    };
    saveMetadataCatalog(catalog);

    // If explicit save or saveToGallery is requested, export to device
    if (options?.saveToDevice || (prefs.saveToGallery && options?.isExplicitDownload)) {
      await saveMediaToDevice(blob, catalog[mediaUrl].fileName);
    }

    const objectUrl = URL.createObjectURL(blob);
    return { success: true, objectUrl, sizeBytes };
  } catch (err: any) {
    return { success: false, error: err.message || 'Media download interrupted' };
  }
}

/**
 * Retrieves a locally cached Object URL for a media attachment.
 */
export async function getCachedMediaUrl(mediaUrl: string): Promise<string | null> {
  if (!mediaUrl) return null;
  if (typeof caches === 'undefined') return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const matched = await cache.match(mediaUrl);
    if (matched) {
      const blob = await matched.blob();
      return URL.createObjectURL(blob);
    }
  } catch {}
  return null;
}

/**
 * Triggers saving a media file to the user's device gallery / downloads folder.
 * Handles permission denial and platform fallbacks gracefully.
 */
export async function saveMediaToDevice(
  mediaUrlOrBlob: string | Blob,
  fileName: string = 'zangi_media'
): Promise<{ success: boolean; error?: string; permissionDenied?: boolean }> {
  try {
    let blob: Blob;
    if (typeof mediaUrlOrBlob === 'string') {
      // Check local cache first
      const cachedUrl = await getCachedMediaUrl(mediaUrlOrBlob);
      if (cachedUrl) {
        const res = await fetch(cachedUrl);
        blob = await res.blob();
      } else {
        const res = await fetch(mediaUrlOrBlob);
        blob = await res.blob();
      }
    } else {
      blob = mediaUrlOrBlob;
    }

    // Modern showSaveFilePicker if available in Chromium/Android Chrome
    if ('showSaveFilePicker' in window) {
      try {
        const ext = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '.jpg';
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Zan-Gi Media File',
              accept: { [blob.type || 'application/octet-stream']: [ext] },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true };
      } catch (pickerErr: any) {
        if (pickerErr.name === 'AbortError') {
          // User cancelled file picker
          return { success: false, error: 'Save cancelled by user' };
        }
        if (pickerErr.name === 'NotAllowedError') {
          return { success: false, error: 'Permission to save file was denied', permissionDenied: true };
        }
        // Fallback to anchor click
      }
    }

    // Standard download anchor trigger
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save to device gallery' };
  }
}

/**
 * Returns list of all downloaded media files in device storage.
 */
export function getDownloadedFilesList(): CachedMediaItem[] {
  const catalog = getMetadataCatalog();
  return Object.values(catalog).filter((item) => item.isDownloaded || item.savedToDevice);
}

/**
 * Deletes a single downloaded media file from local device storage.
 * Note: Must only be called after user confirmation in UI!
 */
export async function deleteDownloadedFile(mediaUrl: string): Promise<{ success: boolean; freedBytes: number }> {
  let freedBytes = 0;
  try {
    const catalog = getMetadataCatalog();
    if (catalog[mediaUrl]) {
      freedBytes = catalog[mediaUrl].sizeBytes || 0;
      delete catalog[mediaUrl];
      saveMetadataCatalog(catalog);
    }

    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(mediaUrl);
    }
    return { success: true, freedBytes };
  } catch (err) {
    console.warn('[LocalCache] Delete file exception:', err);
    return { success: false, freedBytes: 0 };
  }
}

/**
 * Calculates current device storage usage for cached and downloaded media.
 */
export async function getLocalCacheStorageUsage(): Promise<StorageUsageBreakdown> {
  const catalog = getMetadataCatalog();
  let imagesBytes = 0;
  let videosBytes = 0;
  let audioBytes = 0;
  let downloadedBytes = 0;
  let cacheOnlyBytes = 0;
  let count = 0;
  let imagesCount = 0;
  let videosCount = 0;
  let audioCount = 0;
  let downloadedCount = 0;

  for (const item of Object.values(catalog)) {
    count++;
    const sz = item.sizeBytes || 0;
    if (item.mediaType === 'image') {
      imagesBytes += sz;
      imagesCount++;
    } else if (item.mediaType === 'video') {
      videosBytes += sz;
      videosCount++;
    } else if (item.mediaType === 'audio') {
      audioBytes += sz;
      audioCount++;
    }

    if (item.isDownloaded || item.savedToDevice) {
      downloadedBytes += sz;
      downloadedCount++;
    } else {
      cacheOnlyBytes += sz;
    }
  }

  const totalCacheBytes = imagesBytes + videosBytes + audioBytes;
  return {
    imagesBytes,
    videosBytes,
    audioBytes,
    downloadedBytes,
    cacheOnlyBytes,
    totalCacheBytes,
    totalCacheKB: Number((totalCacheBytes / 1024).toFixed(1)),
    totalCacheMB: Number((totalCacheBytes / (1024 * 1024)).toFixed(2)),
    itemCount: count,
    imagesCount,
    videosCount,
    audioCount,
    downloadedCount,
  };
}

/**
 * Clears only cached images from local device storage while preserving other media and downloaded files.
 */
export async function clearImageCache(): Promise<{ success: boolean; freedBytes: number; clearedCount: number }> {
  let freedBytes = 0;
  let clearedCount = 0;
  try {
    const catalog = getMetadataCatalog();
    const updatedCatalog: Record<string, CachedMediaItem> = {};
    let cache: Cache | null = null;
    if (typeof caches !== 'undefined') {
      cache = await caches.open(CACHE_NAME);
    }

    for (const [url, item] of Object.entries(catalog)) {
      if (item.mediaType === 'image' && !item.isDownloaded && !item.savedToDevice) {
        freedBytes += item.sizeBytes || 0;
        clearedCount++;
        if (cache) await cache.delete(url);
      } else {
        updatedCatalog[url] = item;
      }
    }
    saveMetadataCatalog(updatedCatalog);
  } catch (err) {
    console.warn('[LocalCache] Clear image cache exception:', err);
  }
  return { success: true, freedBytes, clearedCount };
}

/**
 * Clears only cached videos from local device storage while preserving other media and downloaded files.
 */
export async function clearVideoCache(): Promise<{ success: boolean; freedBytes: number; clearedCount: number }> {
  let freedBytes = 0;
  let clearedCount = 0;
  try {
    const catalog = getMetadataCatalog();
    const updatedCatalog: Record<string, CachedMediaItem> = {};
    let cache: Cache | null = null;
    if (typeof caches !== 'undefined') {
      cache = await caches.open(CACHE_NAME);
    }

    for (const [url, item] of Object.entries(catalog)) {
      if (item.mediaType === 'video' && !item.isDownloaded && !item.savedToDevice) {
        freedBytes += item.sizeBytes || 0;
        clearedCount++;
        if (cache) await cache.delete(url);
      } else {
        updatedCatalog[url] = item;
      }
    }
    saveMetadataCatalog(updatedCatalog);
  } catch (err) {
    console.warn('[LocalCache] Clear video cache exception:', err);
  }
  return { success: true, freedBytes, clearedCount };
}

/**
 * Clears only cached audio and voice notes from local device storage.
 */
export async function clearAudioCache(): Promise<{ success: boolean; freedBytes: number; clearedCount: number }> {
  let freedBytes = 0;
  let clearedCount = 0;
  try {
    const catalog = getMetadataCatalog();
    const updatedCatalog: Record<string, CachedMediaItem> = {};
    let cache: Cache | null = null;
    if (typeof caches !== 'undefined') {
      cache = await caches.open(CACHE_NAME);
    }

    for (const [url, item] of Object.entries(catalog)) {
      if (item.mediaType === 'audio' && !item.isDownloaded && !item.savedToDevice) {
        freedBytes += item.sizeBytes || 0;
        clearedCount++;
        if (cache) await cache.delete(url);
      } else {
        updatedCatalog[url] = item;
      }
    }
    saveMetadataCatalog(updatedCatalog);
  } catch (err) {
    console.warn('[LocalCache] Clear audio cache exception:', err);
  }
  return { success: true, freedBytes, clearedCount };
}

/**
 * Enforces automatic storage ceiling limit (e.g. 50MB on mobile browsers).
 * Evicts oldest cached items (LRU) until within boundary without touching saved downloads.
 */
export async function enforceCacheLimit(maxBytes: number = 50 * 1024 * 1024): Promise<{ evictedCount: number; freedBytes: number }> {
  let freedBytes = 0;
  let evictedCount = 0;
  try {
    const usage = await getLocalCacheStorageUsage();
    if (usage.totalCacheBytes <= maxBytes) {
      return { evictedCount: 0, freedBytes: 0 };
    }

    const catalog = getMetadataCatalog();
    // Sort non-downloaded items by downloadedAt ascending (oldest first)
    const evictable = Object.entries(catalog)
      .filter(([_, item]) => !item.isDownloaded && !item.savedToDevice)
      .sort((a, b) => new Date(a[1].downloadedAt).getTime() - new Date(b[1].downloadedAt).getTime());

    let cache: Cache | null = null;
    if (typeof caches !== 'undefined') {
      cache = await caches.open(CACHE_NAME);
    }

    let currentTotal = usage.totalCacheBytes;
    for (const [url, item] of evictable) {
      if (currentTotal <= maxBytes) break;
      if (cache) await cache.delete(url);
      currentTotal -= item.sizeBytes || 0;
      freedBytes += item.sizeBytes || 0;
      delete catalog[url];
      evictedCount++;
    }
    saveMetadataCatalog(catalog);
  } catch (err) {
    console.warn('[LocalCache] Eviction error:', err);
  }
  return { evictedCount, freedBytes };
}

/**
 * Clears cached media files from device storage.
 * By default (preserveDownloaded = true), user's explicitly downloaded/saved files are kept safe!
 * Text messages and conversation records are strictly preserved!
 */
export async function clearAllLocalMediaCache(preserveDownloaded: boolean = true): Promise<{ success: boolean; freedBytes: number }> {
  let freedBytes = 0;
  try {
    const catalog = getMetadataCatalog();

    if (preserveDownloaded) {
      const updatedCatalog: Record<string, CachedMediaItem> = {};
      if (typeof caches !== 'undefined') {
        const cache = await caches.open(CACHE_NAME);
        for (const [url, item] of Object.entries(catalog)) {
          if (item.isDownloaded || item.savedToDevice) {
            updatedCatalog[url] = item; // preserve
          } else {
            freedBytes += item.sizeBytes || 0;
            await cache.delete(url);
          }
        }
      }
      saveMetadataCatalog(updatedCatalog);
    } else {
      // Full purge
      const usage = await getLocalCacheStorageUsage();
      freedBytes = usage.totalCacheBytes;
      if (typeof caches !== 'undefined') {
        await caches.delete(CACHE_NAME);
      }
      localStorage.removeItem(METADATA_KEY);
    }
  } catch (err) {
    console.warn('[LocalCache] Clear cache exception:', err);
  }
  return { success: true, freedBytes };
}
