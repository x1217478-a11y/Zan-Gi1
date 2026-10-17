import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Crop,
  RotateCw,
  Type,
  Music,
  Sliders,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Check,
  X,
  AlertCircle,
  Download,
  Maximize2,
  RefreshCw,
  Film,
  Image as ImageIcon,
  Flame,
  Layers,
  ArrowRight,
  ShieldCheck,
  SplitSquareVertical,
  FlipHorizontal,
  Bookmark,
  Undo2,
  Redo2,
  Loader2,
  Save
} from 'lucide-react';
import { compressImageLocally } from '../../utils/imageCompressor';
import { compressVideoLocally, extractVideoCoverFrame } from '../../utils/videoCompressor';
import { MUSIC_TRACKS } from '../../data/musicTracks';
import { MusicTrack, PostMusicAttachment } from '../../types';

export interface CreatorStudioProps {
  initialFile: File;
  mediaType: 'image' | 'video';
  isBengali: boolean;
  onExportComplete: (result: {
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
  }) => void;
  onClose: () => void;
}

export type StudioTab = 'trim' | 'ratio' | 'rotate' | 'filters' | 'text' | 'audio' | 'cover';

interface TextOverlay {
  id: string;
  text: string;
  xPercent: number; // 0 - 100
  yPercent: number; // 0 - 100
  fontSize: number; // 14 - 36
  color: string;
  bgColor: string; // 'transparent' | 'rgba(0,0,0,0.7)' | '#06b6d4' | '#f43f5e'
  isBox: boolean;
}

const FILTER_PRESETS = [
  { id: 'normal', nameBn: 'স্বাভাবিক', nameEn: 'Original', css: 'none' },
  { id: 'cyberpunk', nameBn: 'সাইবারপাংক', nameEn: 'Cyberpunk', css: 'hue-rotate(190deg) contrast(1.2) saturate(1.4)' },
  { id: 'cinematic', nameBn: 'সিনেমাটিক', nameEn: 'Cinematic', css: 'contrast(1.15) saturate(1.1) brightness(0.95)' },
  { id: 'warm', nameBn: 'গোল্ডেন আওয়ার', nameEn: 'Warm Glow', css: 'sepia(0.35) saturate(1.3) contrast(1.05)' },
  { id: 'emerald', nameBn: 'ঢাকা এমেরাল্ড', nameEn: 'Dhaka Teal', css: 'hue-rotate(40deg) saturate(1.2) contrast(1.1)' },
  { id: 'retro', nameBn: 'ভিন্টেজ', nameEn: 'Retro Film', css: 'sepia(0.5) contrast(0.9) brightness(1.05)' },
  { id: 'noir', nameBn: 'মনোক্রোম', nameEn: 'Crisp Noir', css: 'grayscale(1) contrast(1.3)' },
  { id: 'vivid', nameBn: 'উজ্জ্বল ভাইব্রেন্ট', nameEn: 'Vivid Pop', css: 'saturate(1.6) contrast(1.1)' },
];

const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', ratio: 'auto', desc: 'Native' },
  { id: '9:16', label: '9:16', ratio: '9/16', desc: 'Reels / Shorts' },
  { id: '1:1', label: '1:1', ratio: '1/1', desc: 'Square Post' },
  { id: '4:5', label: '4:5', ratio: '4/5', desc: 'Portrait Feed' },
  { id: '16:9', label: '16:9', ratio: '16/9', desc: 'Landscape Cinema' },
];

const LEGAL_AUDIO_TRACKS = [
  {
    id: 'none',
    nameBn: 'কোনো ব্যাকগ্রাউন্ড অডিও নয়',
    nameEn: 'No Music (Original Audio Only)',
    genre: 'Original',
    duration: '0:00',
  },
  {
    id: 'dhaka_beats',
    nameBn: 'ঢাকা সাইবার বিটস (Lo-Fi 120bpm)',
    nameEn: 'Dhaka Cyber Beats (Royalty Free)',
    genre: 'Lo-Fi Chill',
    duration: '2:15',
    license: 'Creative Commons 0',
  },
  {
    id: 'sunset_synth',
    nameBn: 'সানসেট সিন্থ লাউঞ্জ',
    nameEn: 'Sunset Synth Lounge (Royalty Free)',
    genre: 'Ambient',
    duration: '1:45',
    license: 'Creative Commons 0',
  },
  {
    id: 'acoustic_bengal',
    nameBn: 'বেঙ্গল ড্রিম অ্যাকোস্টিক',
    nameEn: 'Bengal Dream Acoustic (Royalty Free)',
    genre: 'Folk Chill',
    duration: '2:30',
    license: 'Creative Commons 0',
  },
  {
    id: 'electric_pulse',
    nameBn: 'ইলেকট্রিক পালস অ্যানার্জি',
    nameEn: 'Electric Pulse Energy (Royalty Free)',
    genre: 'Future Bass',
    duration: '1:50',
    license: 'Creative Commons 0',
  },
];

export const CreatorStudioModal: React.FC<CreatorStudioProps> = ({
  initialFile,
  mediaType,
  isBengali,
  onExportComplete,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>(mediaType === 'video' ? 'trim' : 'filters');
  const [previewUrl, setPreviewUrl] = useState<string>(() => {
    try {
      return initialFile ? URL.createObjectURL(initialFile) : '';
    } catch {
      return '';
    }
  });
  const [aspectRatio, setAspectRatio] = useState<string>('original');
  const [rotation, setRotation] = useState<number>(0);
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [isFlippedV, setIsFlippedV] = useState(false);
  const [activeFilter, setActiveFilter] = useState('normal');

  // Video-specific states
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedMusicId, setSelectedMusicId] = useState<string>('none');
  const [musicVolume, setMusicVolume] = useState<number>(70);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [audioCategory, setAudioCategory] = useState<'all' | 'trending' | 'bangla' | 'hindi' | 'english' | 'instrumental'>('all');
  const [musicTrimStart, setMusicTrimStart] = useState<number>(0);
  const [studioPlayingTrackId, setStudioPlayingTrackId] = useState<string | null>(null);
  const studioAudioRef = useRef<HTMLAudioElement | null>(null);
  const [splitPoints, setSplitPoints] = useState<number[]>([]);

  useEffect(() => {
    return () => {
      if (studioAudioRef.current) {
        studioAudioRef.current.pause();
        studioAudioRef.current.src = '';
      }
    };
  }, []);

  const handleToggleStudioAudio = (track: MusicTrack) => {
    if (studioPlayingTrackId === track.id) {
      if (studioAudioRef.current) {
        studioAudioRef.current.pause();
      }
      setStudioPlayingTrackId(null);
    } else {
      if (studioAudioRef.current) {
        studioAudioRef.current.pause();
      }
      studioAudioRef.current = new Audio(track.audioUrl);
      studioAudioRef.current.volume = musicVolume / 100;
      studioAudioRef.current.currentTime = musicTrimStart;
      studioAudioRef.current.play().catch(() => setStudioPlayingTrackId(null));
      setStudioPlayingTrackId(track.id);
      studioAudioRef.current.onended = () => setStudioPlayingTrackId(null);
    }
  };

  // Cover selection
  const [coverTime, setCoverTime] = useState<number>(0);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>('');

  // Text overlays
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [newText, setNewText] = useState('');
  const [selectedTextColor, setSelectedTextColor] = useState('#ffffff');
  const [selectedTextBg, setSelectedTextBg] = useState('rgba(0,0,0,0.75)');
  const [selectedFontSize, setSelectedFontSize] = useState(20);

  // Undo / Redo history state
  interface StudioStateSnapshot {
    aspectRatio: string;
    rotation: number;
    isFlippedH: boolean;
    isFlippedV: boolean;
    activeFilter: string;
    startTime: number;
    endTime: number;
    isMuted: boolean;
    selectedMusicId: string;
    musicVolume: number;
    textOverlays: TextOverlay[];
  }

  const [history, setHistory] = useState<StudioStateSnapshot[]>([
    {
      aspectRatio: 'original',
      rotation: 0,
      isFlippedH: false,
      isFlippedV: false,
      activeFilter: 'normal',
      startTime: 0,
      endTime: 0,
      isMuted: false,
      selectedMusicId: 'none',
      musicVolume: 70,
      textOverlays: [],
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const recordSnapshot = (patch: Partial<StudioStateSnapshot>) => {
    const currentSnap: StudioStateSnapshot = {
      aspectRatio,
      rotation,
      isFlippedH,
      isFlippedV,
      activeFilter,
      startTime,
      endTime,
      isMuted,
      selectedMusicId,
      musicVolume,
      textOverlays,
      ...patch,
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentSnap);
    if (newHistory.length > 25) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setAspectRatio(prev.aspectRatio);
      setRotation(prev.rotation);
      setIsFlippedH(prev.isFlippedH);
      setIsFlippedV(prev.isFlippedV);
      setActiveFilter(prev.activeFilter);
      setStartTime(prev.startTime);
      setEndTime(prev.endTime);
      setIsMuted(prev.isMuted);
      setSelectedMusicId(prev.selectedMusicId);
      setMusicVolume(prev.musicVolume);
      setTextOverlays(prev.textOverlays);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setAspectRatio(next.aspectRatio);
      setRotation(next.rotation);
      setIsFlippedH(next.isFlippedH);
      setIsFlippedV(next.isFlippedV);
      setActiveFilter(next.activeFilter);
      setStartTime(next.startTime);
      setEndTime(next.endTime);
      setIsMuted(next.isMuted);
      setSelectedMusicId(next.selectedMusicId);
      setMusicVolume(next.musicVolume);
      setTextOverlays(next.textOverlays);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Draft Preservation & Restoration
  const DRAFT_STORAGE_KEY = `zg_studio_draft_${initialFile.name}_${initialFile.size}`;
  const [hasDraftAvailable, setHasDraftAvailable] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) setHasDraftAvailable(true);
    } catch {}
  }, [DRAFT_STORAGE_KEY]);

  const handleRestoreDraft = () => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
        if (typeof parsed.rotation === 'number') setRotation(parsed.rotation);
        if (parsed.activeFilter) setActiveFilter(parsed.activeFilter);
        if (typeof parsed.startTime === 'number') setStartTime(parsed.startTime);
        if (typeof parsed.endTime === 'number') setEndTime(parsed.endTime);
        if (parsed.textOverlays) setTextOverlays(parsed.textOverlays);
        setHasDraftAvailable(false);
      }
    } catch {}
  };

  // Auto-save draft parameters to session storage
  useEffect(() => {
    try {
      const draftData = {
        aspectRatio,
        rotation,
        isFlippedH,
        isFlippedV,
        activeFilter,
        startTime,
        endTime,
        textOverlays,
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    } catch {}
  }, [aspectRatio, rotation, isFlippedH, isFlippedV, activeFilter, startTime, endTime, textOverlays, DRAFT_STORAGE_KEY]);

  // Export & compression states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{
    percent: number;
    message: string;
    stage: string;
  }>({ percent: 0, message: '', stage: '' });
  const [exportError, setExportError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize preview
  useEffect(() => {
    const url = URL.createObjectURL(initialFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [initialFile]);

  // Read video duration and generate initial cover
  const handleVideoMetadataLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 0;
      setVideoDuration(dur);
      setEndTime(Math.min(dur, 180)); // Clamp to 180s (3 min) max
      extractVideoCoverFrame(initialFile, 0.5)
        .then((res) => {
          setCoverPreviewUrl(res.dataUrl);
        })
        .catch(() => {});
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (curr >= endTime) {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = startTime;
    }
  };

  const handleSeek = (timeSec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timeSec;
    setCurrentTime(timeSec);
  };

  const handleSplitAtPlayhead = () => {
    if (mediaType !== 'video') return;
    if (currentTime > startTime + 1 && currentTime < endTime - 1) {
      setSplitPoints((prev) => [...prev, Math.round(currentTime * 10) / 10].sort((a, b) => a - b));
    }
  };

  const handleAddTextOverlay = () => {
    if (!newText.trim()) return;
    const newOverlay: TextOverlay = {
      id: `txt_${Date.now()}`,
      text: newText.trim(),
      xPercent: 50,
      yPercent: 50,
      fontSize: selectedFontSize,
      color: selectedTextColor,
      bgColor: selectedTextBg,
      isBox: selectedTextBg !== 'transparent',
    };
    setTextOverlays((prev) => [...prev, newOverlay]);
    setNewText('');
  };

  const handleRemoveTextOverlay = (id: string) => {
    setTextOverlays((prev) => prev.filter((item) => item.id !== id));
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  // Compute CSS transform
  const getStageTransform = () => {
    const transforms: string[] = [];
    if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
    if (isFlippedH) transforms.push('scaleX(-1)');
    if (isFlippedV) transforms.push('scaleY(-1)');
    return transforms.length > 0 ? transforms.join(' ') : 'none';
  };

  // Export & Final Processing
  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportProgress({ percent: 5, message: 'Preparing smart export pipeline...', stage: 'init' });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (mediaType === 'image') {
        setExportProgress({ percent: 20, message: 'Optimizing photo & color grade...', stage: 'processing' });

        const compressed = await compressImageLocally(initialFile, {
          maxTargetSizeBytes: 1.8 * 1024 * 1024, // strictly under 2 MB free tier
          maxDimension: 2560,
          onProgress: (p) => {
            setExportProgress({
              percent: Math.min(95, Math.max(25, p.percent)),
              message: p.message,
              stage: p.stage,
            });
          },
          signal: controller.signal,
        });

        setExportProgress({ percent: 100, message: 'Ready!', stage: 'complete' });

        onExportComplete({
          file: compressed.file,
          previewUrl: compressed.previewUrl,
          aspectRatio,
          musicAttachment: selectedTrack
            ? {
                track: selectedTrack,
                startTime: musicTrimStart,
                endTime: musicTrimStart + (selectedTrack.durationSeconds || 16),
                originalVolume: 0,
                musicVolume: musicVolume / 100,
              }
            : undefined,
        });
      } else {
        // Video processing with trimming and max 150s duration
        setExportProgress({ percent: 10, message: 'Compressing video & syncing audio...', stage: 'compressing' });

        const compressed = await compressVideoLocally(initialFile, {
          maxTargetSizeBytes: 14 * 1024 * 1024, // safely under 15 MB free tier
          maxDurationSeconds: 180,              // strictly capped to 180s (3 minutes)
          startTime,
          endTime,
          audioTrackMuted: isMuted,
          onProgress: (p) => {
            setExportProgress({
              percent: Math.min(95, Math.max(15, p.percent)),
              message: p.message,
              stage: p.stage,
            });
          },
          signal: controller.signal,
        });

        // Generate final cover if requested
        let finalCoverBlob: Blob | undefined;
        let finalCoverUrl: string | undefined;
        try {
          const coverRes = await extractVideoCoverFrame(compressed.previewUrl, coverTime || 0.5);
          finalCoverBlob = coverRes.blob;
          finalCoverUrl = coverRes.dataUrl;
        } catch {
          // Fallback to thumbnail from result
          finalCoverUrl = compressed.thumbnailUrl;
        }

        setExportProgress({ percent: 100, message: 'Video exported successfully!', stage: 'complete' });

        onExportComplete({
          file: compressed.file,
          previewUrl: compressed.previewUrl,
          coverBlob: finalCoverBlob,
          coverUrl: finalCoverUrl,
          durationSeconds: compressed.durationSeconds,
          aspectRatio,
          originalSizeBytes: compressed.originalSizeBytes,
          compressedSizeBytes: compressed.compressedSizeBytes,
          percentageSaved: compressed.percentageSaved,
          resolution: `${compressed.width}x${compressed.height}`,
          targetAchieved: compressed.targetAchieved,
          musicAttachment: selectedTrack
            ? {
                track: selectedTrack,
                startTime: musicTrimStart,
                endTime: musicTrimStart + (selectedTrack.durationSeconds || 16),
                originalVolume: isMuted ? 0 : 0.8,
                musicVolume: musicVolume / 100,
              }
            : undefined,
        });
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setExportError(err.message || 'Export failed. Please adjust trimming or resolution and retry.');
        setIsExporting(false);
      }
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
    setExportError(isBengali ? 'এক্সপোর্ট বাতিল করা হয়েছে।' : 'Export cancelled.');
  };

  const activeFilterCss = FILTER_PRESETS.find((f) => f.id === activeFilter)?.css || 'none';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col text-slate-100 overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-900/90 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
                  Zan-Gi
                </span>{' '}
                Creator Studio
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                {mediaType === 'video' ? 'Reel & Clip Editor' : 'Photo Studio'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {isBengali ? 'ডিভাইসে লোকাল প্রসেসিং • ফ্রি-টিয়ার সুরক্ষিত' : 'Local device processing • Free-tier protected'}
            </p>
          </div>
        </div>

        {/* Free-tier safety status badge, Undo/Redo & Export button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Draft restore button if available */}
          {hasDraftAvailable && (
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-[11px] font-bold flex items-center gap-1 hover:bg-amber-500/30 transition-colors"
              title="Restore draft"
            >
              <Save className="w-3 h-3" />
              <span>{isBengali ? 'ড্রাফট রিস্টোর' : 'Restore Draft'}</span>
            </button>
          )}

          {/* Undo / Redo controls */}
          <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/70">
            <button
              type="button"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-25 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title={isBengali ? 'পূর্বাবস্থায় ফেরান (Undo)' : 'Undo'}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-25 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title={isBengali ? 'পুনরায় করুন (Redo)' : 'Redo'}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-3 py-1 bg-emerald-950/50 border border-emerald-800/40 rounded-full text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{mediaType === 'video' ? 'Target: < 15 MB' : 'Target: < 2 MB'}</span>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isBengali ? 'এক্সপোর্ট ও প্রয়োগ' : 'Export & Apply'}</span>
          </button>
        </div>
      </header>

      {/* Main Canvas / Preview Stage */}
      <main className="flex-1 relative flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 overflow-hidden">
        <div
          ref={stageContainerRef}
          className="relative max-w-full max-h-[62vh] sm:max-h-[68vh] rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 bg-black flex items-center justify-center transition-all"
          style={{
            aspectRatio: aspectRatio === 'original' ? undefined : aspectRatio,
            filter: activeFilterCss,
            transform: getStageTransform(),
          }}
        >
          {Boolean(previewUrl && previewUrl.trim()) ? (
            mediaType === 'video' ? (
              <video
                ref={videoRef}
                src={previewUrl}
                onLoadedMetadata={handleVideoMetadataLoaded}
                onTimeUpdate={handleTimeUpdate}
                playsInline
                muted={isMuted}
                className="max-w-full max-h-[62vh] sm:max-h-[68vh] object-contain"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[62vh] sm:max-h-[68vh] object-contain"
              />
            )
          ) : (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          {/* Text Overlays Layer */}
          {textOverlays.map((item) => (
            <div
              key={item.id}
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 font-bold px-3 py-1 rounded-lg text-center"
              style={{
                left: `${item.xPercent}%`,
                top: `${item.yPercent}%`,
                fontSize: `${item.fontSize}px`,
                color: item.color,
                backgroundColor: item.bgColor,
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              {item.text}
            </div>
          ))}

          {/* Video Floating Play/Pause Overlay */}
          {mediaType === 'video' && (
            <button
              onClick={togglePlayPause}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/35 transition-colors group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-cyan-500/80 group-hover:bg-cyan-400 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                {isPlaying ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-1" />}
              </div>
            </button>
          )}
        </div>

        {/* Video Scrubber Overlay for quick timeline scrub */}
        {mediaType === 'video' && videoDuration > 0 && (
          <div className="absolute bottom-4 inset-x-8 max-w-lg mx-auto bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-2xl px-4 py-2 flex items-center gap-3 text-xs shadow-xl z-10">
            <button onClick={togglePlayPause} className="text-cyan-400 hover:text-white">
              {isPlaying ? <Pause className="w-4 h-4 fill-cyan-400" /> : <Play className="w-4 h-4 fill-cyan-400" />}
            </button>
            <span className="text-[11px] font-mono text-slate-300 min-w-[36px]">
              {formatSeconds(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={videoDuration}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="flex-1 accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono text-slate-400 min-w-[36px]">
              {formatSeconds(videoDuration)}
            </span>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-400 hover:text-white"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </main>

      {/* Bottom Tool Deck & Timeline Drawer */}
      <footer className="bg-slate-900 border-t border-slate-800 flex flex-col z-20">
        {/* Tab Selection Navigation */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800/80 overflow-x-auto scrollbar-none">
          {mediaType === 'video' && (
            <button
              onClick={() => setActiveTab('trim')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'trim'
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>{isBengali ? 'ট্রিম ও স্প্লিট' : 'Trim & Split'}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('ratio')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'ratio'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>{isBengali ? 'অনুপাত (Aspect)' : 'Aspect Ratio'}</span>
          </button>

          <button
            onClick={() => setActiveTab('rotate')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'rotate'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isBengali ? 'ঘূর্ণন (Rotate)' : 'Rotate & Flip'}</span>
          </button>

          <button
            onClick={() => setActiveTab('filters')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'filters'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isBengali ? 'ফিল্টার' : 'Filters'}</span>
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'text'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>{isBengali ? 'টেক্সট ওভারলে' : 'Text Overlay'}</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'audio'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>{isBengali ? 'অডিও ও গান 🎵' : 'Audio & Music 🎵'}</span>
          </button>

          {mediaType === 'video' && (
            <button
              onClick={() => setActiveTab('cover')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'cover'
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isBengali ? 'কভার ফ্রেম' : 'Cover Thumbnail'}</span>
            </button>
          )}
        </div>

        {/* Tab Specific Control Drawer Panel */}
        <div className="p-3 max-h-48 overflow-y-auto">
          {/* TAB: TRIM & SPLIT */}
          {activeTab === 'trim' && mediaType === 'video' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">
                  {isBengali ? 'সময়সীমা নির্বাচন (সর্বোচ্চ ১৫০ সেকেন্ড)' : 'Duration Range (Max 150 seconds)'}
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {formatSeconds(Math.max(0, endTime - startTime))} / 2:30
                </span>
              </div>

              {/* Auto Trim & Timeline Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStartTime(0);
                    setEndTime(Math.min(videoDuration, 150));
                    handleSeek(0);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{isBengali ? '⚡ অটো ট্রিম (১ম ১৫০ সে.)' : '⚡ Auto Trim (First 150s)'}</span>
                </button>

                {videoDuration > 150 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newStart = Math.max(0, videoDuration - 150);
                      setStartTime(newStart);
                      setEndTime(videoDuration);
                      handleSeek(newStart);
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs transition-colors"
                  >
                    <span>{isBengali ? 'শেষের ১৫০ সে.' : 'Last 150s'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStartTime(0);
                    setEndTime(Math.min(videoDuration, 60));
                    handleSeek(0);
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs transition-colors"
                >
                  <span>{isBengali ? '৬০ সে. রিলস' : '60s Reels'}</span>
                </button>
              </div>

              {/* Range Sliders for Start & End */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {isBengali ? 'শুরুর সময়:' : 'Start Trim:'} {formatSeconds(startTime)}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, endTime - 1)}
                    step={0.5}
                    value={startTime}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setStartTime(val);
                      handleSeek(val);
                    }}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    {isBengali ? 'শেষের সময়:' : 'End Trim:'} {formatSeconds(endTime)}
                  </label>
                  <input
                    type="range"
                    min={startTime + 1}
                    max={Math.min(videoDuration, startTime + 150)}
                    step={0.5}
                    value={endTime}
                    onChange={(e) => setEndTime(Number(e.target.value))}
                    className="w-full accent-violet-400"
                  />
                </div>
              </div>

              {/* Split at cursor action */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-xs">
                <button
                  onClick={handleSplitAtPlayhead}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <SplitSquareVertical className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isBengali ? 'বর্তমান মুহূর্তে স্প্লিট করুন' : 'Split at Current Playhead'}</span>
                </button>
                {splitPoints.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    {splitPoints.length} {isBengali ? 'টি স্প্লিট মার্কার সেট করা হয়েছে' : 'split marks set'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB: ASPECT RATIO */}
          {activeTab === 'ratio' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400">
                {isBengali ? 'প্ল্যাটফর্মের আদর্শ অ্যাসপেক্ট রেশিও বেছে নিন' : 'Choose platform canvas aspect ratio'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {ASPECT_RATIOS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAspectRatio(item.ratio)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      aspectRatio === item.ratio
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-extrabold text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-400">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ROTATE & FLIP */}
          {activeTab === 'rotate' && (
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors"
              >
                <RotateCw className="w-4 h-4 text-cyan-400" />
                <span>Rotate 90° ({rotation}°)</span>
              </button>

              <button
                onClick={() => setIsFlippedH(!isFlippedH)}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                  isFlippedH ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                <FlipHorizontal className="w-4 h-4" />
                <span>Flip Horizontal</span>
              </button>

              <button
                onClick={() => setIsFlippedV(!isFlippedV)}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                  isFlippedV ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                <FlipHorizontal className="w-4 h-4 rotate-90" />
                <span>Flip Vertical</span>
              </button>

              {(rotation !== 0 || isFlippedH || isFlippedV) && (
                <button
                  onClick={() => {
                    setRotation(0);
                    setIsFlippedH(false);
                    setIsFlippedV(false);
                  }}
                  className="px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 rounded-xl"
                >
                  Reset Orientation
                </button>
              )}
            </div>
          )}

          {/* TAB: FILTERS */}
          {activeTab === 'filters' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FILTER_PRESETS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      activeFilter === filter.id
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 font-bold'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs">{isBengali ? filter.nameBn : filter.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: TEXT OVERLAYS */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={isBengali ? 'ক্যাপশন বা টেক্সট লিখুন...' : 'Add text overlay...'}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTextOverlay()}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleAddTextOverlay}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1"
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Text styling presets */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[11px]">Size:</span>
                  <input
                    type="range"
                    min={14}
                    max={40}
                    value={selectedFontSize}
                    onChange={(e) => setSelectedFontSize(Number(e.target.value))}
                    className="w-20 accent-cyan-400"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">{selectedFontSize}px</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">Style:</span>
                  {[
                    { bg: 'transparent', label: 'Plain' },
                    { bg: 'rgba(0,0,0,0.75)', label: 'Dark Box' },
                    { bg: '#06b6d4', label: 'Cyan Pill' },
                    { bg: '#f43f5e', label: 'Rose Pill' },
                  ].map((style) => (
                    <button
                      key={style.label}
                      onClick={() => setSelectedTextBg(style.bg)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        selectedTextBg === style.bg
                          ? 'border-cyan-400 text-cyan-300'
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Existing active text tags */}
              {textOverlays.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {textOverlays.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs"
                    >
                      <span>"{item.text}"</span>
                      <button
                        onClick={() => handleRemoveTextOverlay(item.id)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ROYALTY FREE AUDIO & MUSIC LIBRARY */}
          {activeTab === 'audio' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                    <Music className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-200 block">
                      {isBengali ? 'Zan-Gi রয়্যালটি-ফ্রি অডিও ও মিউজিক ট্র্যাক' : 'Zan-Gi Royalty-Free Audio & Music Tracks'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isBengali ? '১০০% কপিরাইট নিরাপদ • ১২টি প্রিমিয়াম ট্র্যাক' : '100% Copyright Safe • 12 Premium Tracks'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {mediaType === 'video' && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        checked={isMuted}
                        onChange={(e) => setIsMuted(e.target.checked)}
                        className="accent-cyan-400 rounded"
                      />
                      <span>{isBengali ? 'মূল ভিডিও নিঃশব্দ' : 'Mute Original Video'}</span>
                    </label>
                  )}
                  {selectedTrack && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrack(null);
                        setSelectedMusicId('none');
                        if (studioAudioRef.current) studioAudioRef.current.pause();
                        setStudioPlayingTrackId(null);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-[11px] font-semibold transition-colors"
                    >
                      {isBengali ? 'গান সরান' : 'Remove Track'}
                    </button>
                  )}
                </div>
              </div>

              {/* Sliders: Music Volume & Trim Start */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400">{isBengali ? 'মিউজিক ভলিউম:' : 'Music Volume:'}</span>
                    <span className="font-mono text-cyan-400 font-bold">{musicVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={musicVolume}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMusicVolume(val);
                      if (studioAudioRef.current) studioAudioRef.current.volume = val / 100;
                    }}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400">{isBengali ? 'গানের শুরুর সেকেন্ড (Trim):' : 'Track Start Offset (Trim):'}</span>
                    <span className="font-mono text-pink-400 font-bold">{musicTrimStart}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={musicTrimStart}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMusicTrimStart(val);
                      if (studioAudioRef.current) studioAudioRef.current.currentTime = val;
                    }}
                    className="w-full accent-pink-400"
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {[
                  { id: 'all', labelBn: 'সবগুলো', labelEn: 'All Tracks' },
                  { id: 'trending', labelBn: '🔥 ট্রেন্ডিং', labelEn: '🔥 Trending' },
                  { id: 'bangla', labelBn: '🇧🇩 বাংলা ফোক', labelEn: '🇧🇩 Bangla Folk' },
                  { id: 'hindi', labelBn: '🇮🇳 হিন্দি ফিউশন', labelEn: '🇮🇳 Hindi Fusion' },
                  { id: 'english', labelEn: '🌐 English Lo-Fi', labelBn: '🌐 ইংরেজি লো-ফাই' },
                  { id: 'instrumental', labelEn: '📻 Instrumental', labelBn: '📻 ইন্সট্রুমেন্টাল' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setAudioCategory(cat.id as any)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors ${
                      audioCategory === cat.id
                        ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isBengali ? cat.labelBn : cat.labelEn}
                  </button>
                ))}
              </div>

              {/* Tracks Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar">
                {MUSIC_TRACKS
                  .filter((t) => audioCategory === 'all' || t.category === audioCategory)
                  .map((track) => {
                    const isSelected = selectedTrack?.id === track.id;
                    const isPlayingTrack = studioPlayingTrackId === track.id;

                    return (
                      <div
                        key={track.id}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                          isSelected
                            ? 'bg-pink-950/40 border-pink-500 text-pink-200 shadow-md shadow-pink-500/10'
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleStudioAudio(track)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                              isPlayingTrack
                                ? 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white scale-105'
                                : 'bg-slate-800 hover:bg-slate-700 text-pink-400'
                            }`}
                            title={isPlayingTrack ? 'Pause' : 'Play Preview'}
                          >
                            {isPlayingTrack ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                          </button>

                          <div className="min-w-0">
                            <span className="text-xs font-bold truncate block text-slate-200">
                              {isBengali ? track.titleBn || track.title : track.title}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {isBengali ? track.artistBn || track.artist : track.artist} • <span className="uppercase text-[9px] text-pink-400">{track.category}</span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTrack(null);
                              setSelectedMusicId('none');
                            } else {
                              setSelectedTrack(track);
                              setSelectedMusicId(track.id);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-pink-500 text-white shadow-xs'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? (isBengali ? '✓ নির্বাচিত' : '✓ Selected') : (isBengali ? 'যুক্ত করুন' : 'Add Track')}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB: COVER THUMBNAIL */}
          {activeTab === 'cover' && mediaType === 'video' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-300 font-bold">
                {isBengali ? 'ভিডিওর কভার ফটো নির্বাচন করুন' : 'Scrub to select reel cover frame'}
              </p>
              <div className="flex items-center gap-3">
                {Boolean(coverPreviewUrl && coverPreviewUrl.trim()) && (
                  <img
                    src={coverPreviewUrl}
                    alt="Cover thumbnail"
                    className="w-16 h-24 object-cover rounded-xl border border-cyan-500/80 shadow-md"
                  />
                )}
                <div className="flex-1 space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.2}
                    value={coverTime}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCoverTime(val);
                      handleSeek(val);
                      extractVideoCoverFrame(initialFile, val)
                        .then((res) => setCoverPreviewUrl(res.dataUrl))
                        .catch(() => {});
                    }}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Frame at {formatSeconds(coverTime)}</span>
                    <span>Total {formatSeconds(videoDuration)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* Exporting / Compressing Modal Modal Overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center mx-auto text-cyan-400 animate-pulse">
              <Film className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-white">
                {isBengali ? 'স্মার্ট এনকোডিং ও কম্প্রেশন চলছে...' : 'Smart Compression & Encoding...'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{exportProgress.message}</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-300 rounded-full"
                  style={{ width: `${exportProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Free-Tier Protected</span>
                <span className="font-bold text-cyan-400">{Math.round(exportProgress.percent)}%</span>
              </div>
            </div>

            {exportError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs text-left">
                {exportError}
              </div>
            )}

            <button
              onClick={handleCancelExport}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              {isBengali ? 'বাতিল করুন' : 'Cancel Export'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
