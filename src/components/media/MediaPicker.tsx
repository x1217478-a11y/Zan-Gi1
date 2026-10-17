import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video,
  Camera,
  RotateCw,
  Crop,
  Check,
  X,
  AlertCircle,
  UploadCloud,
  Film,
  Sparkles,
  Maximize2,
  Trash2,
  RefreshCw,
  ArrowRight,
  Scissors,
  Layers,
  ShieldCheck,
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { compressImageLocally, ImageCompressionProgress } from '../../utils/imageCompressor';
import { compressVideoLocally, getVideoMetadata } from '../../utils/videoCompressor';
import { CreatorStudioModal } from '../studio/CreatorStudioModal';
import { PostMusicAttachment } from '../../types';

export interface UploadedMediaItem {
  id: string;
  url: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  duration?: number;
  musicAttachment?: PostMusicAttachment;
}

interface MediaPickerProps {
  mediaType: 'image' | 'video' | 'avatar' | 'banner' | 'all';
  allowMultiple?: boolean;
  maxFiles?: number;
  isBengali: boolean;
  onUploadSuccess: (items: UploadedMediaItem[]) => void;
  onCancel?: () => void;
  aspectRatioHint?: '1:1' | '4:5' | '16:9' | '3:1' | '9:16';
}

interface SelectedFileItem {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  rotation: number;
  aspectRatio: string;
  duration?: number;
  isCompressed?: boolean;
  originalSizeBytes?: number;
  compressedSizeBytes?: number;
  percentageSaved?: number;
  resolution?: string;
  targetAchieved?: 'preferred_15mb' | 'hard_60mb';
  musicAttachment?: PostMusicAttachment;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  mediaType,
  allowMultiple = false,
  maxFiles = 5,
  isBengali,
  onUploadSuccess,
  onCancel,
  aspectRatioHint = '1:1',
}) => {
  const { token } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeRatio, setActiveRatio] = useState<string>(aspectRatioHint);

  // Smart compression state
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<{
    percent: number;
    message: string;
    originalSize: number;
    currentSize?: number;
  }>({ percent: 0, message: '', originalSize: 0 });
  const compressionAbortRef = useRef<AbortController | null>(null);

  // Creator Studio modal state
  const [showStudio, setShowStudio] = useState(false);
  const [studioTargetFile, setStudioTargetFile] = useState<File | null>(null);

  const [quotaInfo, setQuotaInfo] = useState<{
    isUploadAllowed: boolean;
    status: string;
    storageUsedMB: number;
    storageRemainingGB: number;
    storagePercentOfLimit: number;
    warnings: string[];
    reason?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const isVideoMode = mediaType === 'video';
  const isAllMode = mediaType === 'all';
  const activeItem = selectedFiles[activeIndex];

  // Load live quota telemetry from server
  useEffect(() => {
    fetch('/api/media/quota')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setQuotaInfo(data);
      })
      .catch(() => {});
  }, []);

  // Revoke object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const handleFilesChosen = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    // Verify quota allowance
    if (quotaInfo && !quotaInfo.isUploadAllowed) {
      setErrorMessage(
        quotaInfo.reason ||
          (isBengali
            ? 'ফ্রি-টিয়ার কোটা সুরক্ষার জন্য নতুন মিডিয়া আপলোড সাময়িকভাবে বন্ধ রাখা হয়েছে।'
            : 'Media uploads are temporarily paused to protect the free tier allowance.')
      );
      return;
    }

    const newItems: SelectedFileItem[] = [];
    const maxAllowed = allowMultiple ? maxFiles - selectedFiles.length : 1;

    for (let i = 0; i < Math.min(fileList.length, maxAllowed); i++) {
      const rawFile = fileList[i];
      const isVid = rawFile.type.startsWith('video/') || isVideoMode;

      // Smart Photo Processing
      if (!isVid) {
        // If image is larger than 1.8 MB (up to 100-200 MB), run smart local compression
        if (rawFile.size > 1.8 * 1024 * 1024) {
          setIsCompressing(true);
          setCompressionProgress({
            percent: 5,
            message: isBengali
              ? `বড় ছবি (${(rawFile.size / (1024 * 1024)).toFixed(1)} MB) ব্রাউজারে স্বয়ংক্রিয়ভাবে কম্প্রেস করা হচ্ছে...`
              : `Automatically compressing ${(rawFile.size / (1024 * 1024)).toFixed(1)} MB photo locally...`,
            originalSize: rawFile.size,
          });

          const abortCtrl = new AbortController();
          compressionAbortRef.current = abortCtrl;

          try {
            const compResult = await compressImageLocally(rawFile, {
              maxTargetSizeBytes: 1.8 * 1024 * 1024, // Keep under 2 MB free tier standard
              maxDimension: 2560,
              onProgress: (p) => {
                setCompressionProgress({
                  percent: p.percent,
                  message: p.message,
                  originalSize: p.originalSizeBytes,
                  currentSize: p.currentSizeBytes,
                });
              },
              signal: abortCtrl.signal,
            });

            newItems.push({
              file: compResult.file,
              previewUrl: compResult.previewUrl,
              type: 'image',
              rotation: 0,
              aspectRatio: activeRatio,
              isCompressed: true,
              originalSizeBytes: rawFile.size,
            });
          } catch (err: any) {
            if (!abortCtrl.signal.aborted) {
              setErrorMessage(
                isBengali
                  ? `কম্প্রেশন ব্যর্থ হয়েছে: ${err.message}`
                  : `Photo compression failed: ${err.message}. Please retry or pick a different file.`
              );
            }
            continue;
          } finally {
            setIsCompressing(false);
          }
        } else {
          // Normal size photo
          const previewUrl = URL.createObjectURL(rawFile);
          newItems.push({
            file: rawFile,
            previewUrl,
            type: 'image',
            rotation: 0,
            aspectRatio: activeRatio,
          });
        }
      } else {
        // Smart Video Processing (accepts sources up to 180s / 3 minutes and up to 100-200 MB)
        try {
          const meta = await getVideoMetadata(rawFile);
          if (meta.duration > 300) {
            setErrorMessage(
              isBengali
                ? `ভিডিওর দৈর্ঘ্য ${Math.round(meta.duration)} সেকেন্ড। প্ল্যাটফর্মে সর্বোচ্চ ৩০০ সেকেন্ড (৫ মিনিট) অনুমোদিত। ক্রিয়েটর স্টুডিওতে ট্রিম করুন।`
                : `Video duration is ${Math.round(meta.duration)}s. Maximum allowed is 300s (5 minutes). Please trim in Creator Studio.`
            );
            setStudioTargetFile(rawFile);
            setShowStudio(true);
            return;
          }

          // If video is already within the preferred 15 MB target, no local re-encode is needed
          if (rawFile.size <= 15 * 1024 * 1024) {
            const previewUrl = URL.createObjectURL(rawFile);
            newItems.push({
              file: rawFile,
              previewUrl,
              type: 'video',
              rotation: 0,
              aspectRatio: meta.aspectRatio,
              duration: meta.duration,
              isCompressed: false,
              originalSizeBytes: rawFile.size,
              compressedSizeBytes: rawFile.size,
              percentageSaved: 0,
              resolution: `${meta.width}x${meta.height}`,
              targetAchieved: 'preferred_15mb',
            });
            continue;
          }

          // Automatically compress oversized videos locally before upload
          setIsCompressing(true);
          setCompressionProgress({
            percent: 10,
            message: isBengali
              ? `ভিডিও (${(rawFile.size / (1024 * 1024)).toFixed(1)} MB) লোকাল ব্রাউজারে স্বয়ংক্রিয়ভাবে অপ্টিমাইজ করা হচ্ছে (টার্গেট: <= ১৫ MB, সর্বোচ্চ: ৬০ MB)...`
              : `Optimizing ${(rawFile.size / (1024 * 1024)).toFixed(1)} MB video locally (Target <= 15 MB, Max 60 MB)...`,
            originalSize: rawFile.size,
          });

          const abortCtrl = new AbortController();
          compressionAbortRef.current = abortCtrl;

          try {
            const compVid = await compressVideoLocally(rawFile, {
              maxTargetSizeBytes: 14 * 1024 * 1024,
              hardMaxSizeBytes: 60 * 1024 * 1024,
              maxDurationSeconds: 300,
              onProgress: (p) => {
                setCompressionProgress({
                  percent: p.percent,
                  message: p.message,
                  originalSize: rawFile.size,
                  currentSize: p.currentSizeBytes,
                });
              },
              signal: abortCtrl.signal,
            });

            newItems.push({
              file: compVid.file,
              previewUrl: compVid.previewUrl,
              type: 'video',
              rotation: 0,
              aspectRatio: compVid.aspectRatio,
              duration: compVid.durationSeconds,
              isCompressed: true,
              originalSizeBytes: rawFile.size,
              compressedSizeBytes: compVid.compressedSizeBytes,
              percentageSaved: compVid.percentageSaved,
              resolution: `${compVid.width}x${compVid.height}`,
              targetAchieved: compVid.targetAchieved,
            });
          } catch (err: any) {
            if (!abortCtrl.signal.aborted) {
              if (rawFile.size <= 60 * 1024 * 1024) {
                // If original is within 60 MB, preserve original file safely!
                console.warn('Video compression fallback: keeping original file under 60 MB limit.');
                const previewUrl = URL.createObjectURL(rawFile);
                newItems.push({
                  file: rawFile,
                  previewUrl,
                  type: 'video',
                  rotation: 0,
                  aspectRatio: meta.aspectRatio,
                  duration: meta.duration,
                  isCompressed: false,
                  originalSizeBytes: rawFile.size,
                  compressedSizeBytes: rawFile.size,
                  percentageSaved: 0,
                  resolution: `${meta.width}x${meta.height}`,
                  targetAchieved: 'hard_60mb',
                });
              } else {
                setErrorMessage(
                  isBengali
                    ? `ভিডিওটি (${(rawFile.size / (1024 * 1024)).toFixed(1)} MB) ৬০ MB সীমার নিচে আনা সম্ভব হয়নি: ${err.message}। ক্রিয়েটর স্টুডিওতে ট্রিম করুন।`
                    : `Video (${(rawFile.size / (1024 * 1024)).toFixed(1)} MB) exceeds 60 MB ceiling: ${err.message}. Please trim in Creator Studio.`
                );
                setStudioTargetFile(rawFile);
              }
            }
            continue;
          } finally {
            setIsCompressing(false);
          }
        } catch (e: any) {
          setErrorMessage(e.message || 'Could not read video metadata.');
          continue;
        }
      }
    }

    if (newItems.length > 0) {
      if (allowMultiple) {
        setSelectedFiles((prev) => [...prev, ...newItems]);
      } else {
        selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
        setSelectedFiles(newItems);
        setActiveIndex(0);
      }
    }
  };

  const handleCancelCompression = () => {
    if (compressionAbortRef.current) {
      compressionAbortRef.current.abort();
    }
    setIsCompressing(false);
    setErrorMessage(isBengali ? 'কম্প্রেশন বাতিল করা হয়েছে।' : 'Compression was cancelled.');
  };

  const handleRotate = () => {
    if (!activeItem || activeItem.type !== 'image') return;
    setSelectedFiles((prev) =>
      prev.map((item, idx) =>
        idx === activeIndex
          ? { ...item, rotation: (item.rotation + 90) % 360 }
          : item
      )
    );
  };

  const handleAspectRatioChange = (ratio: string) => {
    setActiveRatio(ratio);
    if (!activeItem) return;
    setSelectedFiles((prev) =>
      prev.map((item, idx) =>
        idx === activeIndex ? { ...item, aspectRatio: ratio } : item
      )
    );
  };

  const handleRemoveItem = (index: number) => {
    const itemToRemove = selectedFiles[index];
    if (itemToRemove) URL.revokeObjectURL(itemToRemove.previewUrl);

    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
    if (activeIndex >= selectedFiles.length - 1) {
      setActiveIndex(Math.max(0, selectedFiles.length - 2));
    }
  };

  const handleCancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMessage(isBengali ? 'আপলোড বাতিল করা হয়েছে।' : 'Upload cancelled.');
    }
  };

  const handleStartUpload = () => {
    if (selectedFiles.length === 0) return;

    // Strict client-side verification before transmitting to server
    for (const item of selectedFiles) {
      if (item.type === 'video' && item.file.size > 60 * 1024 * 1024) {
        setErrorMessage(
          isBengali
            ? `ভিডিওর সাইজ (${(item.file.size / (1024 * 1024)).toFixed(1)} MB) প্ল্যাটফর্মের ৬০ MB সর্বোচ্চ সীমা অতিক্রম করে। লোকাল কম্প্রেশন ছাড়া আপলোড করা যাবে না।`
            : `Video size (${(item.file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 60 MB hard ceiling. Only compressed videos may be uploaded.`
        );
        return;
      }
      if (item.type === 'image' && item.file.size > 20 * 1024 * 1024) {
        setErrorMessage(
          isBengali
            ? `ছবির সাইজ (${(item.file.size / (1024 * 1024)).toFixed(1)} MB) ২০ MB সীমা অতিক্রম করে।`
            : `Photo size (${(item.file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 20 MB ceiling.`
        );
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    const formData = new FormData();
    selectedFiles.forEach((item) => {
      formData.append('files', item.file);
    });

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          const uploadedItems: UploadedMediaItem[] = (res.files || []).map((f: any, idx: number) => ({
            id: f.id,
            url: f.fileUrl || f.url || res.url || (res.urls && res.urls[idx]) || '',
            originalName: f.originalName,
            sizeBytes: f.sizeBytes,
            mimeType: f.mimeType,
            duration: selectedFiles[idx]?.duration,
            musicAttachment: selectedFiles[idx]?.musicAttachment,
          }));

          onUploadSuccess(uploadedItems);
        } catch {
          setErrorMessage(isBengali ? 'সার্ভার রেসপন্স প্রসেস করা যায়নি।' : 'Invalid server response.');
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          setErrorMessage(errRes.error || (isBengali ? 'আপলোড ব্যর্থ হয়েছে।' : 'Upload failed.'));
        } catch {
          setErrorMessage(isBengali ? `আপলোড ত্রুটি (স্ট্যাটাস: ${xhr.status})` : `Upload failed with status ${xhr.status}`);
        }
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setErrorMessage(isBengali ? 'নেটওয়ার্ক ত্রুটির কারণে আপলোড ব্যর্থ হয়েছে।' : 'Network connection failure.');
    };

    const targetUrl = `/api/media/upload?type=${mediaType}`;
    xhr.open('POST', targetUrl, true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    if (activeItem?.duration) {
      xhr.setRequestHeader('x-media-duration', String(Math.round(activeItem.duration)));
    }
    xhr.send(formData);
  };

  // Studio export callback
  const handleStudioExportComplete = (result: {
    file: File;
    previewUrl: string;
    coverBlob?: Blob;
    coverUrl?: string;
    durationSeconds?: number;
    aspectRatio: string;
    originalSizeBytes?: number;
    compressedSizeBytes?: number;
    percentageSaved?: number;
    resolution?: string;
    targetAchieved?: 'preferred_15mb' | 'hard_60mb';
    musicAttachment?: PostMusicAttachment;
  }) => {
    setShowStudio(false);
    setStudioTargetFile(null);

    const newItem: SelectedFileItem = {
      file: result.file,
      previewUrl: result.previewUrl,
      type: mediaType === 'video' ? 'video' : 'image',
      rotation: 0,
      aspectRatio: result.aspectRatio || activeRatio,
      duration: result.durationSeconds,
      isCompressed: true,
      originalSizeBytes: result.originalSizeBytes || studioTargetFile?.size || result.file.size,
      compressedSizeBytes: result.compressedSizeBytes || result.file.size,
      percentageSaved: result.percentageSaved,
      resolution: result.resolution,
      targetAchieved: result.targetAchieved,
      musicAttachment: result.musicAttachment,
    };

    if (allowMultiple) {
      setSelectedFiles((prev) => [...prev, newItem]);
    } else {
      selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setSelectedFiles([newItem]);
      setActiveIndex(0);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={
          isAllMode
            ? 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime'
            : isVideoMode
            ? 'video/mp4,video/webm,video/quicktime'
            : 'image/jpeg,image/png,image/webp,image/gif'
        }
        multiple={allowMultiple && !isVideoMode}
        onChange={(e) => handleFilesChosen(e.target.files)}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={isAllMode ? 'image/*,video/*' : isVideoMode ? 'video/*' : 'image/*'}
        capture="environment"
        onChange={(e) => handleFilesChosen(e.target.files)}
        className="hidden"
      />

      {/* Error Announcement */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-2 animate-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-semibold">{errorMessage}</p>
            {studioTargetFile && (
              <button
                type="button"
                onClick={() => setShowStudio(true)}
                className="mt-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold flex items-center gap-1.5"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>{isBengali ? 'ক্রিয়েটর স্টুডিওতে ট্রিম ও এডিট করুন' : 'Open in Creator Studio to Trim'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Free Tier Storage Allowance Telemetry Bar */}
      {quotaInfo && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>R2 Standard Free Tier Protection</span>
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">
              {quotaInfo.storageRemainingGB} GB free allowance
            </span>
          </div>

          {(!quotaInfo.isUploadAllowed || quotaInfo.warnings.length > 0) && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                !quotaInfo.isUploadAllowed
                  ? 'bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'bg-amber-50 border border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {!quotaInfo.isUploadAllowed
                    ? (isBengali ? 'মিডিয়া আপলোড সাময়িক স্থগিত' : 'Media Uploads Paused')
                    : (isBengali ? 'স্টোরেজ সতর্কতা' : 'Storage Warning')}
                </p>
                <p className="text-[11px] mt-0.5">
                  {!quotaInfo.isUploadAllowed
                    ? (quotaInfo.reason ||
                      (isBengali
                        ? '৮ জিবি সেফটি ক্যাপের কারণে মিডিয়া আপলোড স্থগিত। টেক্সট পোস্ট সম্পূর্ণ চালু আছে।'
                        : '8 GB free-tier safety cap engaged. Text posts remain active.'))
                    : quotaInfo.warnings[0]}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compression Progress Card */}
      {isCompressing && (
        <div className="p-3.5 bg-gradient-to-r from-cyan-950/50 to-violet-950/50 border border-cyan-800/60 rounded-2xl space-y-2 text-cyan-200">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>{isBengali ? 'স্মার্ট লোকাল কম্প্রেশন চলছে...' : 'Smart Local Device Compression...'}</span>
            </span>
            <span className="font-mono text-cyan-400">{Math.round(compressionProgress.percent)}%</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">{compressionProgress.message}</p>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 rounded-full transition-all duration-200"
              style={{ width: `${compressionProgress.percent}%` }}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCancelCompression}
              className="text-[10px] text-rose-400 hover:underline font-semibold"
            >
              {isBengali ? 'বাতিল করুন' : 'Cancel Compression'}
            </button>
          </div>
        </div>
      )}

      {/* No File Selected: Launch Card & Creator Studio Button */}
      {selectedFiles.length === 0 ? (
        <div className="space-y-2.5">
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-cyan-500 rounded-2xl p-6 text-center transition-all bg-slate-50/70 dark:bg-slate-900/40">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-2 shadow-xs">
              {isAllMode ? (
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-5 h-5" />
                  <Video className="w-5 h-5" />
                </div>
              ) : isVideoMode ? (
                <Video className="w-6 h-6" />
              ) : (
                <ImageIcon className="w-6 h-6" />
              )}
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              {isAllMode
                ? (isBengali ? 'স্টোরির ছবি বা ভিডিও নির্বাচন' : 'Select Story Photo or Video')
                : isVideoMode
                ? (isBengali ? 'রিলস ও শর্ট ভিডিও আপলোড' : 'Upload Video / Reel (Up to 150s)')
                : (isBengali ? 'স্মার্ট ছবি নির্বাচন ও কম্প্রেশন' : 'Select Photo (Smart Auto-Compress)')}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs mx-auto">
              {isAllMode
                ? (isBengali
                    ? 'ছবি বা ছোট ভিডিও নির্বাচন করুন এবং পছন্দের ব্যাকগ্রাউন্ড মিউজিক যোগ করুন'
                    : 'Choose a photo or short clip and attach background music')
                : isVideoMode
                ? (isBengali
                    ? '১০০-২০০ MB মূল ভিডিও স্বয়ংক্রিয়ভাবে ১৫ MB তে কম্প্রেস ও অপ্টিমাইজ হবে'
                    : 'Large 100-200 MB files compressed locally before R2 upload')
                : (isBengali
                    ? '২০০ MB পর্যন্ত বড় ছবি ডিভাইসে স্বয়ংক্রিয়ভাবে অপ্টিমাইজ হয়ে ২ MB সীমার নিচে আসবে'
                    : 'Up to 200 MB originals automatically compressed below 2 MB')}
            </p>

            {/* Actions: System Picker, Camera, Creator Studio */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                type="button"
                disabled={Boolean(quotaInfo && !quotaInfo.isUploadAllowed)}
                onClick={() => fileInputRef.current?.click()}
                className={`px-4 py-2 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 text-xs ${
                  quotaInfo && !quotaInfo.isUploadAllowed
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-700'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isBengali ? 'গ্যালারি থেকে নিন' : 'Choose from Gallery'}</span>
              </button>

              <button
                type="button"
                disabled={Boolean(quotaInfo && !quotaInfo.isUploadAllowed)}
                onClick={() => cameraInputRef.current?.click()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors flex items-center gap-1.5 text-xs"
              >
                <Camera className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>{isBengali ? 'ক্যামেরা' : 'Camera'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Files Selected: Active Preview & Editing Controls */
        <div className="space-y-3">
          {/* Main Media Preview Canvas */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center aspect-video max-h-72 w-full shadow-inner">
            {Boolean(activeItem.previewUrl && activeItem.previewUrl.trim()) ? (
              activeItem.type === 'video' ? (
                <video
                  src={activeItem.previewUrl}
                  controls
                  playsInline
                  className="max-h-72 w-full object-contain"
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <img
                    src={activeItem.previewUrl}
                    alt="Selected Preview"
                    style={{
                      transform: `rotate(${activeItem.rotation}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                    className={`max-h-72 object-contain ${
                      activeItem.aspectRatio === '1:1'
                        ? 'aspect-square'
                        : activeItem.aspectRatio === '4:5'
                        ? 'aspect-[4/5]'
                        : activeItem.aspectRatio === '16:9'
                        ? 'aspect-video'
                        : ''
                    }`}
                  />
                </div>
              )
            ) : null}

            {/* Top Preview Action Overlay */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
              {/* Creator Studio Open Button */}
              <button
                type="button"
                onClick={() => {
                  setStudioTargetFile(activeItem.file);
                  setShowStudio(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:opacity-90 text-white text-[10px] font-bold shadow-md flex items-center gap-1"
                title="Open in Creator Studio"
              >
                <Scissors className="w-3 h-3" />
                <span>Studio ✂️</span>
              </button>

              {activeItem.type === 'image' && (
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors"
                  title="Rotate 90 degrees"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemoveItem(activeIndex)}
                className="p-1.5 rounded-full bg-rose-600/80 hover:bg-rose-700 text-white backdrop-blur-xs transition-colors"
                title="Remove media"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* File info pill bottom left */}
            <div className="absolute bottom-2 left-2 bg-black/70 text-white backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1.5">
              <span>{(activeItem.file.size / (1024 * 1024)).toFixed(2)} MB</span>
              {activeItem.isCompressed && (
                <span className="text-emerald-400 font-bold">✓ Smart Optimized</span>
              )}
              {activeItem.duration && (
                <span className="text-cyan-300 font-bold">({Math.round(activeItem.duration)}s)</span>
              )}
            </div>
          </div>

          {/* Telemetry & Compression Summary Card */}
          {activeItem && (activeItem.isCompressed || activeItem.type === 'video') && (
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isBengali ? 'মিডিয়া অপ্টিমাইজেশন সামারি' : 'Local Optimization Telemetry'}</span>
                </span>
                {activeItem.targetAchieved === 'preferred_15mb' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    {isBengali ? '✓ ১৫ MB প্রিফার্ড টার্গেট অর্জিত' : '✓ Preferred 15 MB Target'}
                  </span>
                ) : activeItem.file.size <= 60 * 1024 * 1024 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                    {isBengali ? '✓ ৬০ MB সীমার মধ্যে' : '✓ Within 60 MB Ceiling'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    {isBengali ? '⚠️ সীমা অতিক্রম' : '⚠️ Limit Exceeded'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                  <p className="text-[10px] text-slate-400 font-sans">{isBengali ? 'মূল সাইজ' : 'Original Size'}</p>
                  <p className="font-bold text-slate-300">
                    {activeItem.originalSizeBytes
                      ? `${(activeItem.originalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                      : `${(activeItem.file.size / (1024 * 1024)).toFixed(2)} MB`}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                  <p className="text-[10px] text-slate-400 font-sans">{isBengali ? 'অপ্টিমাইজড সাইজ' : 'Compressed Size'}</p>
                  <p className="font-bold text-emerald-400">
                    {(activeItem.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                  <p className="text-[10px] text-slate-400 font-sans">{isBengali ? 'সেভিংস' : 'Data Saved'}</p>
                  <p className="font-bold text-cyan-400">
                    {activeItem.percentageSaved !== undefined
                      ? `${activeItem.percentageSaved}% saved`
                      : activeItem.originalSizeBytes && activeItem.originalSizeBytes > activeItem.file.size
                      ? `${Math.round(((activeItem.originalSizeBytes - activeItem.file.size) / activeItem.originalSizeBytes) * 100)}% saved`
                      : 'Optimized'}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                  <p className="text-[10px] text-slate-400 font-sans">
                    {activeItem.type === 'video' ? (isBengali ? 'রেজোলিউশন ও দৈর্ঘ্য' : 'Res & Duration') : (isBengali ? 'অনুপাত' : 'Aspect Ratio')}
                  </p>
                  <p className="font-bold text-slate-300 truncate">
                    {activeItem.type === 'video'
                      ? `${activeItem.resolution || activeItem.aspectRatio} • ${Math.round(activeItem.duration || 0)}s`
                      : activeItem.aspectRatio}
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight pt-0.5">
                {isBengali
                  ? '🛡️ ক্লাউডফ্লেয়ার R2 ফ্রি-টিয়ার সুরক্ষার জন্য মূল ফাইল অপরিবর্তিত রেখে শুধুমাত্র অপ্টিমাইজড বাইট সার্ভারে পাঠানো হয়।'
                  : '🛡️ Cloudflare R2 standard protection: Only compressed bytes are transmitted. Your local original file is preserved untouched.'}
              </p>
            </div>
          )}

          {/* Quick Aspect Ratio Selector (for images) */}
          {activeItem.type === 'image' && (
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Crop className="w-3 h-3 text-cyan-600" />
                <span>{isBengali ? 'অনুপাত:' : 'Aspect Ratio:'}</span>
              </span>
              <div className="flex gap-1">
                {['original', '1:1', '4:5', '16:9'].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => handleAspectRatioChange(ratio)}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-colors ${
                      activeItem.aspectRatio === ratio
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Multiple Item Thumbnail Bar */}
          {allowMultiple && selectedFiles.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
              {selectedFiles.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 relative transition-transform ${
                    idx === activeIndex ? 'border-cyan-500 scale-105 shadow-xs' : 'border-slate-300 dark:border-slate-700 opacity-60'
                  }`}
                >
                  {Boolean(item.previewUrl && item.previewUrl.trim()) && (
                    <img src={item.previewUrl} alt="Thumb" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
              {selectedFiles.length < maxFiles && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 text-slate-500 hover:text-cyan-600 flex items-center justify-center shrink-0"
                >
                  +
                </button>
              )}
            </div>
          )}

          {/* Upload Progress Bar (Live XHR progress) */}
          {isUploading && (
            <div className="space-y-1.5 p-3 bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-2xl animate-in fade-in">
              <div className="flex justify-between text-[11px] font-bold text-cyan-900 dark:text-cyan-200">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
                  <span>{isBengali ? 'R2 স্টোরেজে নিরাপদ আপলোড হচ্ছে...' : 'Uploading securely to R2...'}</span>
                </span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-cyan-200/80 dark:bg-cyan-900/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-600 rounded-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="text-[10px] text-rose-600 hover:underline font-semibold"
                >
                  {isBengali ? 'বাতিল করুন' : 'Cancel upload'}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons: Replace, Studio, Cancel, Start Upload */}
          {!isUploading && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-[11px] transition-colors"
                >
                  {isBengali ? 'পরিবর্তন' : 'Replace'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudioTargetFile(activeItem.file);
                    setShowStudio(true);
                  }}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-cyan-600 dark:text-cyan-400 font-bold rounded-xl text-[11px] transition-colors flex items-center gap-1"
                >
                  <Scissors className="w-3 h-3" />
                  <span>{isBengali ? 'স্টুডিওতে সাজান' : 'Open Studio'}</span>
                </button>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold rounded-xl text-[11px]"
                  >
                    {isBengali ? 'বাতিল' : 'Cancel'}
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={Boolean(quotaInfo && !quotaInfo.isUploadAllowed)}
                onClick={handleStartUpload}
                className={`px-4 py-1.5 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 ${
                  quotaInfo && !quotaInfo.isUploadAllowed
                    ? 'bg-slate-400 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 to-violet-600 hover:opacity-95 text-white shadow-md shadow-cyan-500/20'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>
                  {isBengali
                    ? `সার্ভারে আপলোড (${selectedFiles.length})`
                    : `Upload & Attach (${selectedFiles.length})`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Creator Studio Fullscreen Modal */}
      {showStudio && (studioTargetFile || activeItem?.file) && (
        <CreatorStudioModal
          initialFile={studioTargetFile || activeItem.file}
          mediaType={isVideoMode || activeItem?.type === 'video' ? 'video' : 'image'}
          isBengali={isBengali}
          onExportComplete={handleStudioExportComplete}
          onClose={() => {
            setShowStudio(false);
            setStudioTargetFile(null);
          }}
        />
      )}
    </div>
  );
};
