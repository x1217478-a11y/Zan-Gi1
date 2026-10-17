import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  Music2,
  Plus,
  Coins,
  ChevronDown,
  ChevronUp,
  PlusSquare,
  X,
  AlertCircle,
  Send,
  Video,
  RefreshCw,
  Music,
  Trash2
} from 'lucide-react';
import { Reel, PostMusicAttachment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { MediaPicker, UploadedMediaItem } from '../media/MediaPicker';
import { MusicPickerModal } from '../media/MusicPickerModal';

interface ReelsViewProps {
  isBengali: boolean;
  onOpenComments: (reelId: string) => void;
  onCoinTip: (amount: number) => void;
}

const isVideoSource = (url?: string): boolean => {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  if (
    clean.endsWith('.png') ||
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.gif')
  ) {
    return false;
  }
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.ogg') ||
    clean.includes('sample/') ||
    clean.includes('/videos/') ||
    clean.startsWith('blob:') ||
    clean.startsWith('data:video')
  );
};

export const ReelsView: React.FC<ReelsViewProps> = ({
  isBengali,
  onOpenComments,
  onCoinTip,
}) => {
  const { user, token } = useAuth();

  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const shouldAutoplay = user?.mediaPreferences?.autoplay ?? true;
  const [isPlaying, setIsPlaying] = useState(shouldAutoplay);
  const [isMuted, setIsMuted] = useState(true); // Default muted to permit mobile autoplay
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [tippedNotice, setTippedNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reel Creation Drawer State
  const [isCreatingReel, setIsCreatingReel] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [newReelCaption, setNewReelCaption] = useState('');
  const [newReelMusic, setNewReelMusic] = useState<PostMusicAttachment | null>(null);
  const [showMusicPickerForReel, setShowMusicPickerForReel] = useState(false);
  const [isPublishingReel, setIsPublishingReel] = useState(false);
  const [reelError, setReelError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  const fetchReels = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/reels', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.reels && Array.isArray(data.reels) && data.reels.length > 0) {
          setReels(data.reels);
        }
      }
    } catch (e) {
      console.warn('Failed to load reels from server:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, [token]);

  const currentReel = reels[currentIndex];

  // Video & Background Audio playback management on index/state change
  useEffect(() => {
    // 1. Manage Video
    if (videoRef.current && isVideoSource(currentReel?.videoUrl)) {
      setVideoError(null);
      setVideoProgress(0);
      try {
        videoRef.current.currentTime = 0;
        videoRef.current.volume = isMuted ? 0 : (currentReel.originalVolume !== undefined ? currentReel.originalVolume : 0.8);
      } catch {}
      if (isPlaying) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            setIsPlaying(false);
          });
        }
      }
    } else {
      setIsPlaying(false);
    }

    // 2. Manage Attached Music Track (Real WebAudio/HTML5 Audio integration)
    if (bgAudioRef.current) {
      if (currentReel?.audioUrl) {
        bgAudioRef.current.src = currentReel.audioUrl;
        bgAudioRef.current.currentTime = currentReel.audioStartTime || 0;
        bgAudioRef.current.volume = isMuted ? 0 : (currentReel.audioVolume !== undefined ? currentReel.audioVolume : 0.8);
        bgAudioRef.current.muted = isMuted;
        bgAudioRef.current.loop = true;
        if (isPlaying) {
          bgAudioRef.current.play().catch(() => {});
        } else {
          bgAudioRef.current.pause();
        }
      } else {
        bgAudioRef.current.pause();
        bgAudioRef.current.src = '';
      }
    }
  }, [currentIndex, reels, isPlaying, isMuted]);

  const togglePlayPause = () => {
    if (!videoRef.current || !isVideoSource(currentReel?.videoUrl)) return;
    if (videoRef.current.paused) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            if (bgAudioRef.current && currentReel?.audioUrl) {
              bgAudioRef.current.play().catch(() => {});
            }
          })
          .catch(() => setIsPlaying(false));
      }
    } else {
      videoRef.current.pause();
      if (bgAudioRef.current) bgAudioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
      videoRef.current.volume = next ? 0 : (currentReel?.originalVolume ?? 0.8);
    }
    if (bgAudioRef.current) {
      bgAudioRef.current.muted = next;
      bgAudioRef.current.volume = next ? 0 : (currentReel?.audioVolume ?? 0.8);
      if (!next && isPlaying && currentReel?.audioUrl) {
        bgAudioRef.current.play().catch(() => {});
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 1;
      setVideoProgress((current / duration) * 100);
      setVideoDuration(duration);
    }
  };

  const handleLike = async (reelId: string) => {
    if (!token) {
      setTippedNotice(isBengali ? 'লাইক দেওয়ার জন্য অনুগ্রহ করে লগইন করুন।' : 'Please sign in to like this reel.');
      setTimeout(() => setTippedNotice(null), 2500);
      return;
    }

    // Optimistic UI update
    setReels((prev) =>
      prev.map((r) => {
        if (r.id === reelId) {
          const next = !r.isLiked;
          return {
            ...r,
            isLiked: next,
            likesCount: next ? r.likesCount + 1 : Math.max(0, r.likesCount - 1),
          };
        }
        return r;
      })
    );

    try {
      await fetch(`/api/reels/${reelId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.warn('Like failed:', e);
    }
  };

  const handleFollowToggle = async (authorId: string) => {
    if (!token) {
      setTippedNotice(isBengali ? 'অনুসরণ করতে লগইন করুন।' : 'Please sign in to follow.');
      setTimeout(() => setTippedNotice(null), 2500);
      return;
    }

    setReels((prev) =>
      prev.map((r) =>
        r.author.id === authorId
          ? { ...r, author: { ...r.author, isFollowing: !r.author.isFollowing } }
          : r
      )
    );

    try {
      await fetch(`/api/users/${authorId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.warn('Follow failed:', e);
    }
  };

  const handleTip = async () => {
    if (!token) {
      setTippedNotice(isBengali ? 'টিপ দেওয়ার জন্য লগইন করুন।' : 'Please sign in to tip creator.');
      setTimeout(() => setTippedNotice(null), 2500);
      return;
    }
    const currentReel = reels[currentIndex];
    if (!currentReel || !currentReel.author?.id) return;
    if (currentReel.author.id === user?.id) {
      setTippedNotice(isBengali ? 'নিজের রিলসে টিপ দেওয়া যাবে না।' : 'You cannot tip your own reel.');
      setTimeout(() => setTippedNotice(null), 2500);
      return;
    }

    try {
      const res = await fetch('/api/social/tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: currentReel.author.id,
          amountCoins: 10,
          note: `Reel tip: "${currentReel.caption?.slice(0, 30)}..."`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onCoinTip(10);
        setTippedNotice(isBengali ? '+১০ কয়েন টিপ সফলভাবে পাঠানো হয়েছে! 🪙' : '+10 Coins tipped to creator! 🪙');
      } else {
        setTippedNotice(data.error || 'Failed to send tip');
      }
    } catch (err: any) {
      setTippedNotice(err.message || 'Error processing tip');
    }
    setTimeout(() => setTippedNotice(null), 3000);
  };

  const handleNext = () => {
    if (reels.length === 0) return;
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0); // loop
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handlePublishNewReel = async () => {
    if (!uploadedVideoUrl) {
      setReelError(isBengali ? 'একটি ভিডিও ফাইল আপলোড করা আবশ্যক।' : 'A video file is required.');
      return;
    }
    if (!token) {
      setReelError(isBengali ? 'রিলস পোস্ট করার জন্য লগইন করুন।' : 'Please log in to post reels.');
      return;
    }

    setIsPublishingReel(true);
    setReelError(null);

    try {
      const res = await fetch('/api/reels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caption: newReelCaption.trim() || 'My new Zan-Gi Reel ✨',
          videoUrl: uploadedVideoUrl,
          hashtags: ['ZanGiReels', 'BanglaShorts', 'AI2026'],
          durationSeconds: Math.round(videoDuration || 15),
          audioTitle: newReelMusic?.track.title || 'Original Audio',
          audioTrack: newReelMusic?.track,
          audioUrl: newReelMusic?.track.audioUrl,
          audioVolume: newReelMusic?.musicVolume,
          originalVolume: newReelMusic?.originalVolume,
          audioStartTime: newReelMusic?.startTime,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create reel');

      setIsPublishingReel(false);
      setIsCreatingReel(false);
      setUploadedVideoUrl(null);
      setNewReelCaption('');

      // Refresh reels list and jump to the newly published reel
      await fetchReels();
      setCurrentIndex(0);
    } catch (err: any) {
      setReelError(err.message || 'Error publishing reel');
      setIsPublishingReel(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-slate-950 text-white flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex-1 bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-3">
        <Video className="w-12 h-12 text-slate-600" />
        <h4 className="font-bold text-sm">{isBengali ? 'কোনো রিলস নেই' : 'No Reels Available'}</h4>
        <button
          onClick={() => setIsCreatingReel(true)}
          className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-bold"
        >
          {isBengali ? '+ প্রথম রিল আপলোড করুন' : '+ Upload First Reel'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-slate-950 text-white relative flex flex-col select-none overflow-hidden">
      {/* Tipped Toast */}
      {tippedNotice && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-full text-xs shadow-xl animate-in fade-in duration-200 flex items-center gap-1.5">
          <Coins className="w-4 h-4" />
          <span>{tippedNotice}</span>
        </div>
      )}

      {/* Main HTML5 Video Canvas */}
      <div
        onClick={togglePlayPause}
        className="flex-1 relative flex items-center justify-center overflow-hidden cursor-pointer bg-black group"
      >
        {Boolean(currentReel?.videoUrl && isVideoSource(currentReel.videoUrl)) ? (
          <video
            ref={videoRef}
            src={currentReel.videoUrl}
            playsInline
            loop
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onError={() => setVideoError(isBengali ? 'ভিডিও লোড করা সম্ভব হয়নি।' : 'Video playback interrupted or format unsupported.')}
            className="w-full h-full object-contain"
          >
            <source
              src={currentReel.videoUrl}
              type={currentReel.videoUrl?.endsWith('.webm') ? 'video/webm' : 'video/mp4'}
            />
          </video>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
            <img
              src={(currentReel?.thumbnailUrl && currentReel.thumbnailUrl.trim()) || (currentReel?.videoUrl && currentReel.videoUrl.trim()) || '/src/assets/images/zangi_feed_cybercity_1791614814919.jpg'}
              alt="Reel content"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Video Error Banner if format failed */}
        {videoError && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-30">
            <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
            <p className="text-xs text-slate-200 mb-3">{videoError}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              {isBengali ? 'পরবর্তী রিল দেখুন' : 'Next Reel'}
            </button>
          </div>
        )}

        {/* Ambient Dark Gradient Overlays for readable text */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85 pointer-events-none" />

        {/* Play/Pause Center Indicator */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center text-white scale-110 transition-transform">
              <Play className="w-8 h-8 ml-1 fill-white" />
            </div>
          </div>
        )}

        {/* Top Controls: Sound toggle & Create Reel button */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {/* Create Reel Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCreatingReel(true);
            }}
            className="px-3 py-1.5 rounded-full bg-blue-600/90 hover:bg-blue-600 backdrop-blur-md flex items-center gap-1.5 text-xs font-bold shadow-md"
            title="Upload New Reel"
          >
            <PlusSquare className="w-3.5 h-3.5" />
            <span>{isBengali ? 'রিল তৈরি' : 'Add Reel'}</span>
          </button>

          {/* Sound Mute/Unmute */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Reel Position Navigator (Up / Down) */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold">
          <span>{currentIndex + 1} / {reels.length}</span>
          <div className="flex gap-1 ml-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              disabled={currentIndex === 0}
              className="p-1 hover:text-cyan-400 disabled:opacity-30"
              title="Previous Reel"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="p-1 hover:text-cyan-400"
              title="Next Reel"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          {currentReel.isDemoData && (
            <span className="text-[8px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-mono font-bold ml-1">
              DEMO
            </span>
          )}
        </div>

        {/* Right Interaction Rail */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 bottom-14 z-30 flex flex-col items-center gap-3.5 text-white"
        >
          {/* Creator Avatar with follow (+) */}
          <div className="relative group">
            <img
              src={(currentReel.author?.avatarUrl && currentReel.author.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
              alt={currentReel.author.displayName}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-lg"
            />
            {user?.id !== currentReel.author.id && (
              <button
                onClick={() => handleFollowToggle(currentReel.author.id)}
                className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
                  currentReel.author.isFollowing
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 text-white ring-2 ring-black'
                }`}
                title="Follow Creator"
              >
                {currentReel.author.isFollowing ? '✓' : '+'}
              </button>
            )}
          </div>

          {/* Like */}
          <button
            onClick={() => handleLike(currentReel.id)}
            className="flex flex-col items-center gap-0.5 group"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-transform active:scale-125 ${
                currentReel.isLiked ? 'bg-rose-500/20 text-rose-500' : 'bg-black/40 text-white'
              }`}
            >
              <Heart
                className={`w-5 h-5 transition-all ${
                  currentReel.isLiked ? 'fill-rose-500 stroke-rose-500 scale-110' : ''
                }`}
              />
            </div>
            <span className="text-[11px] font-bold shadow-xs">
              {currentReel.likesCount}
            </span>
          </button>

          {/* Comments */}
          <button
            onClick={() => onOpenComments(currentReel.id)}
            className="flex flex-col items-center gap-0.5 group"
          >
            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold shadow-xs">
              {currentReel.commentsCount}
            </span>
          </button>

          {/* Tip Coins */}
          <button
            onClick={handleTip}
            className="flex flex-col items-center gap-0.5 group"
            title="Tip Creator 10 Zan-Gi Coins"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 border border-amber-400/40 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-amber-300">Tip</span>
          </button>

          {/* Share */}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Zan-Gi Reel',
                  text: currentReel.caption,
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(window.location.href);
                setTippedNotice(isBengali ? 'লিংক কপি করা হয়েছে!' : 'Link copied to clipboard!');
                setTimeout(() => setTippedNotice(null), 2500);
              }
            }}
            className="flex flex-col items-center gap-0.5"
          >
            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold shadow-xs">
              {currentReel.sharesCount}
            </span>
          </button>
        </div>

        {/* Bottom Creator Info & Caption Overlay */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-3 right-16 bottom-3 z-30 space-y-1.5 text-left"
        >
          {/* Author handle */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight drop-shadow-md text-white">
              @{currentReel.author.username}
            </span>
            {currentReel.author.isVerified && (
              <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                ✓
              </span>
            )}
            <span className="text-[11px] text-slate-300">• {currentReel.author.displayName}</span>
          </div>

          {/* Caption */}
          <p className="text-xs text-white/95 leading-relaxed drop-shadow-sm line-clamp-2">
            {isBengali ? currentReel.captionBn || currentReel.caption : currentReel.caption}
          </p>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {currentReel.hashtags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-semibold text-cyan-300 drop-shadow-sm"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Audio track tag */}
          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-300">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 max-w-[220px] truncate">
              <Music2 className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">{currentReel.audioTitle}</span>
            </div>
          </div>
        </div>

        {/* Video Scrubber / Progress Bar at very bottom */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 z-40">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-100"
            style={{ width: `${videoProgress}%` }}
          />
        </div>
      </div>

      {/* CREATE REEL MODAL */}
      {isCreatingReel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm">
                  {isBengali ? 'নতুন রিলস ভিডিও আপলোড' : 'Create & Upload Reel'}
                </h3>
              </div>
              <button
                onClick={() => setIsCreatingReel(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reelError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reelError}</span>
              </div>
            )}

            {!uploadedVideoUrl ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  {isBengali ? 'আপনার ফোন বা কম্পিউটার থেকে আসল ভিডিও নির্বাচন করুন (MP4 বা WebM):' : 'Choose a short vertical video file (MP4 or WebM, max 60MB):'}
                </p>
                <MediaPicker
                  mediaType="video"
                  isBengali={isBengali}
                  onUploadSuccess={(items) => {
                    if (items.length > 0) {
                      setUploadedVideoUrl(items[0].url);
                      if (items[0].duration) setVideoDuration(items[0].duration);
                    }
                  }}
                  onCancel={() => setIsCreatingReel(false)}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="aspect-[9/16] max-h-56 mx-auto rounded-2xl overflow-hidden bg-black shadow-md flex items-center justify-center">
                  {Boolean(uploadedVideoUrl && isVideoSource(uploadedVideoUrl)) ? (
                    <video src={uploadedVideoUrl} controls className="w-full h-full object-contain" />
                  ) : Boolean(uploadedVideoUrl && uploadedVideoUrl.trim()) ? (
                    <img src={uploadedVideoUrl} alt="Preview" className="w-full h-full object-contain" />
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBengali ? 'রিলস ক্যাপশন' : 'Reel Caption'}
                  </label>
                  <textarea
                    rows={3}
                    value={newReelCaption}
                    onChange={(e) => setNewReelCaption(e.target.value)}
                    placeholder="Write a captivating short-video caption..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Reel Background Music & Dual Audio Mix Selection */}
                <div className="pt-0.5">
                  {!newReelMusic ? (
                    <button
                      type="button"
                      onClick={() => setShowMusicPickerForReel(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-pink-500/15 text-pink-500 flex items-center justify-center">
                          <Music className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold">
                          {isBengali ? 'ব্যাকগ্রাউন্ড মিউজিক যোগ করুন 🎵' : 'Add Background Music 🎵'}
                        </span>
                      </div>
                      <span className="text-[11px] text-pink-600 font-bold px-2 py-0.5 rounded-md bg-pink-50 border border-pink-200">
                        {isBengali ? 'লাইব্রেরি' : 'Browse'}
                      </span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-pink-50 border border-pink-200 text-pink-900 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={newReelMusic.track.coverUrl || '/src/assets/images/zangi_creator_art_1791614801925.jpg'}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-pink-300"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <Music className="w-3 h-3 text-pink-500 shrink-0" />
                            <span className="font-bold truncate text-xs">
                              {isBengali ? newReelMusic.track.titleBn || newReelMusic.track.title : newReelMusic.track.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {isBengali ? newReelMusic.track.artistBn || newReelMusic.track.artist : newReelMusic.track.artist}
                            {' • '}
                            {Math.round(newReelMusic.musicVolume * 100)}% {isBengali ? 'সাউন্ড' : 'vol'}
                            {newReelMusic.startTime > 0 && ` • ${newReelMusic.startTime}s`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowMusicPickerForReel(true)}
                          className="text-[10px] px-2 py-1 rounded-md bg-pink-100 hover:bg-pink-200 text-pink-700 font-bold"
                        >
                          {isBengali ? 'বদলান' : 'Change'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewReelMusic(null)}
                          className="p-1 rounded-md bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600"
                          title={isBengali ? 'মুছে ফেলুন' : 'Remove'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedVideoUrl(null);
                      setNewReelMusic(null);
                    }}
                    className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
                  >
                    {isBengali ? 'অন্য ভিডিও দিন' : 'Change Video'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishNewReel}
                    disabled={isPublishingReel}
                    className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isPublishingReel ? (isBengali ? 'সংরক্ষণ হচ্ছে...' : 'Publishing...') : (isBengali ? 'রিলস প্রকাশ করুন' : 'Publish Reel')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Music Picker Modal for Reel */}
      <MusicPickerModal
        isOpen={showMusicPickerForReel}
        onClose={() => setShowMusicPickerForReel(false)}
        onSelectTrack={(attachment) => {
          setNewReelMusic(attachment);
          setShowMusicPickerForReel(false);
        }}
        currentAttachment={newReelMusic}
        isBengali={isBengali}
        videoPreviewUrl={uploadedVideoUrl || undefined}
      />
    </div>
  );
};
