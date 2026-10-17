import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Search,
  Play,
  Pause,
  Sliders,
  Volume2,
  VolumeX,
  Check,
  X,
  Star,
  Sparkles,
  Flame,
  Globe,
  Radio,
  Clock,
  RotateCcw
} from 'lucide-react';
import { MusicTrack, PostMusicAttachment } from '../../types';
import { MUSIC_TRACKS, getFavoriteMusicIds, toggleFavoriteMusicId } from '../../data/musicTracks';
import { useTheme } from '../../context/ThemeContext';

interface MusicPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (attachment: PostMusicAttachment) => void;
  currentAttachment?: PostMusicAttachment | null;
  isBengali: boolean;
  videoPreviewUrl?: string; // Optional video URL to preview dual audio mix
}

type CategoryTab = 'all' | 'trending' | 'bangla' | 'hindi' | 'english' | 'instrumental' | 'favorites';

export const MusicPickerModal: React.FC<MusicPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectTrack,
  currentAttachment,
  isBengali,
  videoPreviewUrl,
}) => {
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(
    currentAttachment ? currentAttachment.track : null
  );

  // Trimming & Volume State
  const [startTime, setStartTime] = useState<number>(currentAttachment?.startTime || 0);
  const [originalVolume, setOriginalVolume] = useState<number>(
    currentAttachment?.originalVolume !== undefined ? currentAttachment.originalVolume : 0.8
  );
  const [musicVolume, setMusicVolume] = useState<number>(
    currentAttachment?.musicVolume !== undefined ? currentAttachment.musicVolume : 0.8
  );

  // Audio preview playback state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isPlayingMix, setIsPlayingMix] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mixVideoRef = useRef<HTMLVideoElement | null>(null);

  // Load favorites
  useEffect(() => {
    setFavoriteIds(getFavoriteMusicIds());
  }, [isOpen]);

  // Sync initial attachment when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentAttachment) {
        setSelectedTrack(currentAttachment.track);
        setStartTime(currentAttachment.startTime);
        setOriginalVolume(currentAttachment.originalVolume);
        setMusicVolume(currentAttachment.musicVolume);
      }
    } else {
      stopAudio();
    }
  }, [isOpen, currentAttachment]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (mixVideoRef.current) {
      mixVideoRef.current.pause();
      mixVideoRef.current.currentTime = 0;
    }
    setPlayingTrackId(null);
    setIsPlayingMix(false);
    setPlaybackProgress(0);
  };

  const handleTogglePlay = (track: MusicTrack) => {
    if (playingTrackId === track.id) {
      // Pause
      stopAudio();
    } else {
      // Play
      stopAudio();
      setSelectedTrack(track);
      setPlayingTrackId(track.id);

      if (!audioRef.current) {
        audioRef.current = new Audio(track.audioUrl);
      } else {
        audioRef.current.src = track.audioUrl;
      }
      audioRef.current.currentTime = startTime;
      audioRef.current.volume = musicVolume;
      audioRef.current.play().catch(() => setPlayingTrackId(null));

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          const progress = (audioRef.current.currentTime / (track.durationSeconds || 16)) * 100;
          setPlaybackProgress(progress);
        }
      };

      audioRef.current.onended = () => {
        setPlayingTrackId(null);
        setPlaybackProgress(0);
      };
    }
  };

  // Preview Dual Audio Mix (Video + Background Music together)
  const handleToggleMixPreview = () => {
    if (!selectedTrack) return;

    if (isPlayingMix) {
      stopAudio();
    } else {
      setIsPlayingMix(true);
      setPlayingTrackId(selectedTrack.id);

      // Start music
      if (!audioRef.current) {
        audioRef.current = new Audio(selectedTrack.audioUrl);
      } else {
        audioRef.current.src = selectedTrack.audioUrl;
      }
      audioRef.current.currentTime = startTime;
      audioRef.current.volume = musicVolume;
      audioRef.current.play().catch(() => {});

      // If video element provided, play in sync
      if (mixVideoRef.current) {
        mixVideoRef.current.currentTime = 0;
        mixVideoRef.current.volume = originalVolume;
        mixVideoRef.current.play().catch(() => {});
      }

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          const progress = (audioRef.current.currentTime / (selectedTrack.durationSeconds || 16)) * 100;
          setPlaybackProgress(progress);
        }
      };

      audioRef.current.onended = () => {
        stopAudio();
      };
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleFavoriteMusicId(trackId);
    setFavoriteIds(updated);
  };

  // Filtered tracks
  const filteredTracks = MUSIC_TRACKS.filter((track) => {
    // 1. Tab filter
    if (activeTab === 'favorites') {
      if (!favoriteIds.includes(track.id)) return false;
    } else if (activeTab !== 'all') {
      if (track.category !== activeTab) return false;
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = track.title.toLowerCase().includes(q) || (track.titleBn && track.titleBn.toLowerCase().includes(q));
      const matchArtist = track.artist.toLowerCase().includes(q) || (track.artistBn && track.artistBn.toLowerCase().includes(q));
      return matchTitle || matchArtist;
    }

    return true;
  });

  const handleApply = () => {
    if (!selectedTrack) return;
    stopAudio();
    onSelectTrack({
      track: selectedTrack,
      startTime,
      endTime: startTime + (selectedTrack.durationSeconds || 16),
      originalVolume,
      musicVolume,
    });
    onClose();
  };

  if (!isOpen) return null;

  const tabs: Array<{ id: CategoryTab; labelEn: string; labelBn: string; icon: React.ReactNode }> = [
    { id: 'all', labelEn: 'All', labelBn: 'সব গান', icon: <Music className="w-3.5 h-3.5" /> },
    { id: 'trending', labelEn: 'Trending', labelBn: 'ট্রেন্ডিং', icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'bangla', labelEn: 'Bangla', labelBn: 'বাংলা', icon: <span className="text-xs">🇧🇩</span> },
    { id: 'hindi', labelEn: 'Hindi', labelBn: 'হিন্দি', icon: <span className="text-xs">🇮🇳</span> },
    { id: 'english', labelEn: 'English', labelBn: 'ইংরেজি', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'instrumental', labelEn: 'Instrumental', labelBn: 'ইন্সট্রুমেন্টাল', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'favorites', labelEn: 'Favorites', labelBn: 'প্রিয়', icon: <Star className="w-3.5 h-3.5 text-amber-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-3xl border flex flex-col max-h-[92vh] overflow-hidden shadow-2xl transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xs">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isBengali ? 'Zan-Gi মিউজিক লাইব্রেরি' : 'Zan-Gi Music Library'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isBengali
                  ? '১০০% রয়্যালটি-ফ্রি গান, ট্রিম ও ডুয়াল ভলিউম মিক্সিং'
                  : '100% royalty-free tracks, trimming & volume mixing'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopAudio();
              onClose();
            }}
            className="w-8 h-8 rounded-full hover:bg-slate-800/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 pb-2">
          <div className={`relative flex items-center rounded-2xl border px-3 py-2 ${
            isDark ? 'bg-slate-950/60 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder={isBengali ? 'গানের নাম বা শিল্পী খুঁজুন...' : 'Search by track name or artist...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white text-xs">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-slate-950/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {t.icon}
              <span>{isBengali ? t.labelBn : t.labelEn}</span>
              {t.id === 'favorites' && favoriteIds.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {favoriteIds.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[160px]">
          {filteredTracks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
              <Music className="w-8 h-8 mx-auto text-slate-500 mb-2" />
              <p>{isBengali ? 'কোনো গান খুঁজে পাওয়া যায়নি।' : 'No tracks found matching your search.'}</p>
              {activeTab === 'favorites' && (
                <p className="text-[11px] text-slate-500">
                  {isBengali ? 'গানের পাশে থাকা স্টার আইকন ট্যাপ করে ফেভারিটে যোগ করুন।' : 'Tap the star icon next to any song to add it to favorites.'}
                </p>
              )}
            </div>
          ) : (
            filteredTracks.map((track) => {
              const isSelected = selectedTrack?.id === track.id;
              const isPlaying = playingTrackId === track.id;
              const isFav = favoriteIds.includes(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    setSelectedTrack(track);
                    handleTogglePlay(track);
                  }}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/40'
                        : 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/40'
                      : isDark
                      ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Play/Pause Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePlay(track);
                      }}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs ${
                        isPlaying
                          ? 'bg-gradient-to-tr from-cyan-400 to-blue-600 text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                      )}
                    </button>

                    {/* Track info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold truncate">
                          {isBengali && track.titleBn ? track.titleBn : track.title}
                        </h4>
                        {track.category === 'trending' && (
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-400 font-black text-[9px] uppercase tracking-wider shrink-0">
                            Hot
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="truncate">
                          {isBengali && track.artistBn ? track.artistBn : track.artist}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px] shrink-0">0:{track.durationSeconds || 16}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Favorite & Selected check */}
                  <div className="flex items-center gap-1.5 pl-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(track.id, e)}
                      className={`p-1.5 rounded-xl transition-colors ${
                        isFav
                          ? 'text-amber-400 hover:bg-amber-400/15'
                          : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/30'
                      }`}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Track Mixer & Trimmer Drawer (Bottom) */}
        {selectedTrack && (
          <div className={`p-4 border-t space-y-3.5 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold">
                  {isBengali ? 'অডিও মিক্সার ও ট্রিম' : 'Audio Mixer & Trim Settings'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-cyan-400">
                {isBengali && selectedTrack.titleBn ? selectedTrack.titleBn : selectedTrack.title}
              </div>
            </div>

            {/* Hidden video element if videoPreviewUrl is supplied */}
            {videoPreviewUrl && (
              <video
                ref={mixVideoRef}
                src={videoPreviewUrl}
                playsInline
                className="hidden"
              />
            )}

            {/* Audio Progress Bar during preview */}
            {playingTrackId === selectedTrack.id && (
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-100"
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
            )}

            {/* Trim Start Time Selector */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{isBengali ? 'গানের শুরুর সময় (Start Offset):' : 'Audio Start Offset:'}</span>
                <span className="font-mono text-white font-bold">{startTime}s / 16s</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={startTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setStartTime(val);
                  if (audioRef.current) {
                    audioRef.current.currentTime = val;
                  }
                }}
                className="w-full accent-cyan-500 cursor-pointer h-1.5"
              />
            </div>

            {/* Dual Volume Sliders */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Original Video Sound Volume */}
              <div className="p-2.5 rounded-2xl bg-black/20 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="truncate">{isBengali ? 'আসল ভিডিও সাউন্ড' : 'Original Audio'}</span>
                  <span className="font-mono text-cyan-400 font-bold">{Math.round(originalVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={originalVolume}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setOriginalVolume(val);
                    if (mixVideoRef.current) mixVideoRef.current.volume = val;
                  }}
                  className="w-full accent-blue-500 cursor-pointer h-1.5"
                />
              </div>

              {/* Music Volume */}
              <div className="p-2.5 rounded-2xl bg-black/20 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="truncate">{isBengali ? 'মিউজিক ভলিউম' : 'Music Volume'}</span>
                  <span className="font-mono text-cyan-400 font-bold">{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMusicVolume(val);
                    if (audioRef.current) audioRef.current.volume = val;
                  }}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5"
                />
              </div>
            </div>

            {/* Actions: Combined Preview and Apply */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleToggleMixPreview}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isPlayingMix ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlayingMix ? (isBengali ? 'পজ' : 'Pause Mix') : (isBengali ? 'মিক্স প্রিভিউ' : 'Test Mix')}</span>
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isBengali ? 'ভিডিওতে গানটি যুক্ত করুন' : 'Attach Music to Video'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
