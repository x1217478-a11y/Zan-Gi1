import React, { useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Sparkles,
  Info,
  TrendingUp,
  RefreshCw,
  Award,
  Plus,
  Flag,
  CheckCircle2,
  X,
  Flame,
  Calendar,
  Send,
  Users,
  UserPlus,
  Eye,
  Globe,
  Lock,
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sliders,
  Trash2
} from 'lucide-react';
import { Post, Story, AdConfiguration, PostMusicAttachment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { MediaPicker, UploadedMediaItem } from '../media/MediaPicker';
import { FullScreenPhotoViewer } from '../media/FullScreenPhotoViewer';
import { MusicPickerModal } from '../media/MusicPickerModal';

interface HomeScreenViewProps {
  posts: Post[];
  stories: Story[];
  adConfig: AdConfiguration;
  isBengali: boolean;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onOpenComments: (post: Post) => void;
  onRefresh: () => void;
  onShowInterstitial: () => void;
  onOpenCreate?: () => void;
  onSelectTag?: (tag: string) => void;
  onOpenScheduled?: () => void;
  onOpenFriends?: () => void;
  pendingRequestsCount?: number;
  onViewProfile?: (userId: string) => void;
}

export const HomeScreenView: React.FC<HomeScreenViewProps> = ({
  posts,
  stories,
  adConfig,
  isBengali,
  onLike,
  onBookmark,
  onOpenComments,
  onRefresh,
  onShowInterstitial,
  onOpenCreate,
  onSelectTag,
  onOpenScheduled,
  onOpenFriends,
  pendingRequestsCount,
  onViewProfile,
}) => {
  const { user, token, reportPost } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'for_you' | 'following' | 'ai_tech' | 'creators'>('for_you');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [newStoryMedia, setNewStoryMedia] = useState<UploadedMediaItem[]>([]);
  const [newStoryCaption, setNewStoryCaption] = useState('');
  const [isPublishingStory, setIsPublishingStory] = useState(false);
  const [storyPublishSuccess, setStoryPublishSuccess] = useState(false);
  const [newStoryMusic, setNewStoryMusic] = useState<PostMusicAttachment | null>(null);
  const [showStoryMusicModal, setShowStoryMusicModal] = useState(false);

  // Audio Playback Refs & State
  const storyAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isStoryAudioPlaying, setIsStoryAudioPlaying] = useState(true);
  const [isStoryAudioMuted, setIsStoryAudioMuted] = useState(false);

  const feedAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playingPostAudioId, setPlayingPostAudioId] = useState<string | null>(null);
  const [isFeedAudioPlaying, setIsFeedAudioPlaying] = useState(false);

  const [activeExplainPost, setActiveExplainPost] = useState<Post | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [aiPulse, setAiPulse] = useState<{ summaryBn?: string; summaryEn?: string; topTopics?: string[] } | null>(null);
  const [reportPostTarget, setReportPostTarget] = useState<Post | null>(null);
  const [reportReason, setReportReason] = useState('Inappropriate or offensive content');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Full-screen photo viewer state
  const [activePhotoViewer, setActivePhotoViewer] = useState<{
    photos: string[];
    index: number;
    post?: Post;
  } | null>(null);

  // Synchronize Story Audio Playback
  useEffect(() => {
    if (selectedStory?.audioUrl) {
      if (storyAudioRef.current) {
        storyAudioRef.current.src = selectedStory.audioUrl;
        storyAudioRef.current.volume = isStoryAudioMuted ? 0 : (selectedStory.audioVolume ?? 0.8);
        storyAudioRef.current.loop = true;
        storyAudioRef.current.play()
          .then(() => setIsStoryAudioPlaying(true))
          .catch(() => setIsStoryAudioPlaying(false));
      }
    } else {
      if (storyAudioRef.current) {
        storyAudioRef.current.pause();
        storyAudioRef.current.src = '';
      }
    }

    return () => {
      if (storyAudioRef.current) {
        storyAudioRef.current.pause();
        storyAudioRef.current.src = '';
      }
    };
  }, [selectedStory, isStoryAudioMuted]);

  // Handle Feed Post Audio Playback Toggle
  const togglePlayPostAudio = (post: Post) => {
    const audioSrc = post.audioUrl || post.audioTrack?.audioUrl || post.musicAttachment?.track?.audioUrl;
    if (!audioSrc) return;

    if (playingPostAudioId === post.id && isFeedAudioPlaying) {
      feedAudioRef.current?.pause();
      setIsFeedAudioPlaying(false);
    } else {
      if (feedAudioRef.current) {
        feedAudioRef.current.src = audioSrc;
        feedAudioRef.current.volume = post.audioVolume ?? post.musicAttachment?.musicVolume ?? 0.8;
        if (post.musicAttachment?.startTime) {
          feedAudioRef.current.currentTime = post.musicAttachment.startTime;
        }
        feedAudioRef.current.play()
          .then(() => {
            setPlayingPostAudioId(post.id);
            setIsFeedAudioPlaying(true);
          })
          .catch((err) => console.warn('Audio playback error:', err));
      }
    }
  };

  // Record post views with anti-inflation deduplication
  useEffect(() => {
    posts.forEach((p) => {
      fetch(`/api/posts/${p.id}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).catch(() => {});
    });
  }, [posts.length, token]);

  useEffect(() => {
    fetch('/api/ai/trending-summary')
      .then((res) => res.json())
      .then((data) => setAiPulse(data))
      .catch(() => {});
  }, []);

  const handlePublishStory = async () => {
    if (!token || newStoryMedia.length === 0) return;
    setIsPublishingStory(true);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mediaUrl: newStoryMedia[0].url,
          caption: newStoryCaption.trim() || undefined,
          audioTrack: newStoryMusic?.track,
          audioUrl: newStoryMusic?.track?.audioUrl,
          audioVolume: newStoryMusic?.musicVolume,
        }),
      });
      if (res.ok) {
        setStoryPublishSuccess(true);
        setTimeout(() => {
          setIsCreatingStory(false);
          setStoryPublishSuccess(false);
          setNewStoryMedia([]);
          setNewStoryCaption('');
          setNewStoryMusic(null);
          onRefresh();
        }, 1200);
      }
    } catch (err) {
      console.warn('Failed to publish story:', err);
    } finally {
      setIsPublishingStory(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportPostTarget) return;
    const res = await reportPost(reportPostTarget.id, reportReason);
    if (res.success) {
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportPostTarget(null);
      }, 1500);
    }
  };

  const handleSharePost = (post: Post) => {
    if (navigator.share) {
      navigator.share({
        title: 'Zan-Gi Post',
        text: post.content,
      }).catch(() => {
        setShareToast(isBengali ? 'লিংক ক্লিপবোর্ডে কপি হয়েছে' : 'Post link copied to clipboard!');
        setTimeout(() => setShareToast(null), 2500);
      });
    } else {
      navigator.clipboard.writeText(`https://zan-gi.app/p/${post.id}: ${post.content}`);
      setShareToast(isBengali ? 'লিংক ক্লিপবোর্ডে কপি হয়েছে' : 'Post link copied to clipboard!');
      setTimeout(() => setShareToast(null), 2500);
    }
  };

  const tabs = [
    { id: 'for_you', labelEn: 'For You', labelBn: 'আপনার জন্য' },
    { id: 'following', labelEn: 'Following', labelBn: 'অনুসরণ' },
    { id: 'ai_tech', labelEn: 'AI & Tech', labelBn: 'এআই ও টেক' },
    { id: 'trending', labelEn: 'Trending', labelBn: 'ট্রেন্ডিং' },
  ];

  return (
    <div
      className={`flex-1 overflow-y-auto overflow-x-hidden pb-8 select-none w-full relative transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Share Toast Feedback */}
      {shareToast && (
        <div className="sticky top-12 z-40 mx-auto w-fit bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-4 py-2 rounded-2xl shadow-xl animate-in fade-in duration-200 font-bold border border-blue-400/30">
          {shareToast}
        </div>
      )}

      {/* Feed Sub-Tabs (Clean, no redundant circular buttons) */}
      <div
        className={`sticky top-0 z-20 backdrop-blur-xl border-b px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar transition-colors ${
          isDark ? 'bg-slate-950/90 border-slate-800/80' : 'bg-white/95 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 w-full justify-between sm:justify-start">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-600/25'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {isBengali ? tab.labelBn : tab.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stories Bar */}
      <div
        className={`py-3 px-3.5 border-b transition-colors ${
          isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          {/* Create Story Prompt */}
          <button
            onClick={() => setIsCreatingStory(true)}
            className="flex flex-col items-center gap-1 shrink-0 w-16 text-center group"
          >
            <div className="w-14 h-14 rounded-full p-0.5 border-2 border-dashed border-cyan-500/60 flex items-center justify-center transition-transform group-active:scale-95 bg-cyan-500/10">
              <Plus className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-[10px] font-bold text-cyan-400 truncate w-full">
              {isBengali ? 'স্টোরি যোগ' : 'Add Story'}
            </span>
          </button>

          {stories.map((story) => (
            <button
              key={story.id}
              onClick={() => {
                setSelectedStory(story);
                if (token) {
                  fetch(`/api/stories/${story.id}/view`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                  }).catch(() => {});
                }
              }}
              className="flex flex-col items-center gap-1 shrink-0 w-16 text-center group"
            >
              <div
                className={`w-14 h-14 rounded-full p-0.5 transition-transform group-active:scale-95 ${
                  story.hasUnseen
                    ? 'bg-gradient-to-tr from-cyan-400 via-blue-600 to-violet-600 shadow-md shadow-blue-500/20'
                    : isDark
                    ? 'bg-slate-800'
                    : 'bg-slate-300'
                }`}
              >
                <img
                  src={(story.mediaUrl && story.mediaUrl.trim()) || (story.author?.avatarUrl && story.author.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                  alt={story.author.displayName}
                  className={`w-full h-full rounded-full object-cover border-2 ${
                    isDark ? 'border-slate-950' : 'border-white'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medium truncate w-full ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {story.author.displayName.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Create Story Modal */}
      {isCreatingStory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>{isBengali ? 'নতুন স্টোরি তৈরি করুন' : 'Create 24h Story'}</span>
              </span>
              <button
                onClick={() => setIsCreatingStory(false)}
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-semibold text-slate-300 block">
                {isBengali ? 'স্টোরি মিডিয়া (ছবি বা ভিডিও)' : 'Story Media (Photo or Video)'}
              </label>
              <MediaPicker
                mediaType="all"
                isBengali={isBengali}
                onUploadSuccess={(items: UploadedMediaItem[]) => setNewStoryMedia(items)}
                maxFiles={1}
              />

              {/* Story Music Soundtrack Selection */}
              <div className="pt-1">
                {!newStoryMusic ? (
                  <button
                    type="button"
                    onClick={() => setShowStoryMusicModal(true)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-pink-500/50 text-slate-300 hover:text-white flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                        <Music className="w-3 h-3" />
                      </div>
                      <span>{isBengali ? 'ব্যাকগ্রাউন্ড মিউজিক যোগ করুন 🎵' : 'Add Background Music 🎵'}</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10">
                      {isBengali ? 'ব্রাউজ' : 'Browse'}
                    </span>
                  </button>
                ) : (
                  <div className="p-2.5 rounded-xl bg-pink-950/20 border border-pink-500/40 text-pink-200 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={newStoryMusic.track.coverUrl || '/src/assets/images/zangi_creator_art_1791614801925.jpg'}
                        alt=""
                        className="w-7 h-7 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold truncate block text-xs">
                          {isBengali ? newStoryMusic.track.titleBn || newStoryMusic.track.title : newStoryMusic.track.title}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {isBengali ? newStoryMusic.track.artistBn || newStoryMusic.track.artist : newStoryMusic.track.artist}
                          {' • '}
                          {Math.round(newStoryMusic.musicVolume * 100)}% {isBengali ? 'সাউন্ড' : 'vol'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowStoryMusicModal(true)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-bold"
                      >
                        {isBengali ? 'বদলান' : 'Change'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewStoryMusic(null)}
                        className="p-1 rounded-md bg-slate-800 hover:text-rose-400 text-slate-400"
                        title={isBengali ? 'মুছে ফেলুন' : 'Remove'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  {isBengali ? 'ক্যাপশন (ঐচ্ছিক)' : 'Caption (Optional)'}
                </label>
                <input
                  type="text"
                  value={newStoryCaption}
                  onChange={(e) => setNewStoryCaption(e.target.value)}
                  placeholder={isBengali ? 'স্টোরির ক্যাপশন লিখুন...' : 'Add a caption...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {storyPublishSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs text-center font-bold">
                  ✓ {isBengali ? 'স্টোরি সফলভাবে প্রকাশিত হয়েছে!' : 'Story successfully published!'}
                </div>
              )}

              <button
                type="button"
                disabled={newStoryMedia.length === 0 || isPublishingStory}
                onClick={handlePublishStory}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold hover:opacity-95 transition-opacity shadow-md shadow-blue-500/20"
              >
                {isPublishingStory
                  ? (isBengali ? 'প্রকাশিত হচ্ছে...' : 'Publishing...')
                  : (isBengali ? 'স্টোরি শেয়ার করুন' : 'Publish Story')}
              </button>
            </div>
          </div>

          {/* Music Picker Modal for Stories */}
          <MusicPickerModal
            isOpen={showStoryMusicModal}
            onClose={() => setShowStoryMusicModal(false)}
            onSelectTrack={(attachment) => {
              setNewStoryMusic(attachment);
              setShowStoryMusicModal(false);
            }}
            currentAttachment={newStoryMusic}
            isBengali={isBengali}
            videoPreviewUrl={newStoryMedia[0]?.url}
          />
        </div>
      )}

      {/* Interactive Story Modal if tapped */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 text-white animate-in zoom-in-95 duration-200">
          {/* Hidden Story Background Audio */}
          <audio ref={storyAudioRef} />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={(selectedStory.author?.avatarUrl && selectedStory.author.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                alt=""
                className="w-9 h-9 rounded-full object-cover border-2 border-cyan-400"
              />
              <div>
                <span className="text-xs font-bold block">{selectedStory.author.displayName}</span>
                <span className="text-[10px] text-slate-400">@{selectedStory.author.username}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Soundtrack Mute/Play Controls */}
              {selectedStory.audioUrl && (
                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-pink-500/30 text-xs text-pink-300">
                  <Music className="w-3 h-3 text-pink-400 animate-pulse" />
                  <span className="text-[10px] font-bold max-w-[120px] truncate">
                    {selectedStory.audioTrack?.title || 'Soundtrack'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (storyAudioRef.current) {
                        const next = !isStoryAudioMuted;
                        setIsStoryAudioMuted(next);
                        storyAudioRef.current.muted = next;
                      }
                    }}
                    className="p-1 hover:text-white"
                  >
                    {isStoryAudioMuted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3 text-pink-400" />}
                  </button>
                </div>
              )}

              <button
                onClick={() => setSelectedStory(null)}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-bold transition-colors"
              >
                {isBengali ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>

          <div className="my-auto text-center space-y-3">
            {(() => {
              const url = selectedStory.mediaUrl || '';
              const isVideo = url.match(/\.(mp4|webm|mov)$/i);
              return isVideo ? (
                <video
                  src={url}
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[380px] w-auto mx-auto rounded-3xl object-cover shadow-2xl border border-white/10"
                />
              ) : (
                <img
                  src={url || '/src/assets/images/zangi_feed_cybercity_1791614814919.jpg'}
                  alt=""
                  className="max-h-[380px] w-auto mx-auto rounded-3xl object-cover shadow-2xl border border-white/10"
                />
              );
            })()}

            {selectedStory.caption && (
              <p className="text-xs font-semibold bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl inline-block border border-white/15">
                {selectedStory.caption}
              </p>
            )}
          </div>
          <div className="text-center text-[11px] text-slate-400">
            Zan-Gi Ephemeral Story • Safe Media Stream
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="p-3 sm:p-4 space-y-3.5">
        {/* Hidden Audio Element for Feed Post Soundtrack Playback */}
        <audio
          ref={feedAudioRef}
          onEnded={() => {
            setIsFeedAudioPlaying(false);
            setPlayingPostAudioId(null);
          }}
        />

        {/* Quick Post Prompt Bar */}
        <div
          onClick={onOpenCreate}
          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <img
              src={(user?.avatarUrl && user.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover border border-cyan-500/40 shrink-0"
            />
            <span className="text-xs text-slate-400 truncate">
              {isBengali ? 'নতুন কিছু শেয়ার বা শিডিউল করুন...' : "What's on your mind? Share or schedule..."}
            </span>
          </div>
          <button className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-xs shrink-0 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            <span>{isBengali ? 'পোস্ট' : 'Post'}</span>
          </button>
        </div>

        {/* Prominent Facebook-style Friends & Discovery Entry Card */}
        {onOpenFriends && (
          <div
            onClick={onOpenFriends}
            className={`cursor-pointer rounded-3xl p-3.5 border transition-all flex items-center justify-between shadow-xs group ${
              isDark
                ? 'bg-gradient-to-r from-blue-950/50 via-slate-900 to-indigo-950/40 border-blue-900/40 hover:border-cyan-500/50'
                : 'bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-cyan-50/80 border-blue-200/80 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs group-hover:text-cyan-400 transition-colors">
                    {isBengali ? 'বন্ধু ও নতুন পরিচিতি' : 'Find Friends & Connections'}
                  </h4>
                  {Boolean(pendingRequestsCount && pendingRequestsCount > 0) && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[9px] animate-pulse">
                      {pendingRequestsCount} {isBengali ? 'নতুন' : 'new'}
                    </span>
                  )}
                </div>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isBengali
                    ? 'মিউচুয়াল বন্ধু খুঁজুন, ফ্রেন্ড রিকোয়েস্ট পাঠান ও গ্রহণ করুন'
                    : 'Discover people, mutual friends & manage requests'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-600/30 group-hover:opacity-95 transition-opacity shrink-0 flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isBengali ? 'খুঁজুন' : 'Find'}</span>
            </button>
          </div>
        )}

        {/* Zan-Gi AI Community Daily Pulse */}
        {aiPulse && (
          <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 rounded-3xl p-4 text-white shadow-lg shadow-indigo-900/30 space-y-2 border border-white/10">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-200">
                {isBengali ? 'Zan-Gi AI কমিউনিটি পালস' : 'Zan-Gi AI Community Pulse'}
              </h4>
            </div>
            <p className="text-xs text-white/95 leading-relaxed font-medium">
              {isBengali ? aiPulse.summaryBn : aiPulse.summaryEn}
            </p>
            {aiPulse.topTopics && aiPulse.topTopics.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {aiPulse.topTopics.map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectTag && onSelectTag(tag)}
                    className="px-2.5 py-0.5 bg-white/20 hover:bg-white/30 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-xs transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Banner Ad Slot if Ads Enabled */}
        {adConfig.adsEnabled && (
          <div
            className={`rounded-2xl p-3 flex items-center justify-between border ${
              isDark
                ? 'bg-slate-900/50 border-slate-800'
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                Ad
              </span>
              <div>
                <p className="text-xs font-bold">Google AdMob Placement</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {adConfig.bannerAdUnitId.slice(0, 24)}...
                </p>
              </div>
            </div>
            <button
              onClick={onShowInterstitial}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
            >
              Test Interstitial
            </button>
          </div>
        )}

        {posts.map((post) => {
          const isSponsored = post.postType === 'sponsored_native_ad';

          return (
            <article
              key={post.id}
              className={`rounded-3xl border transition-all p-4 sm:p-5 space-y-3.5 ${
                isSponsored
                  ? isDark
                    ? 'border-indigo-500/30 bg-indigo-950/20'
                    : 'border-indigo-200 bg-indigo-50/30'
                  : isDark
                  ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80 shadow-md shadow-black/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              {/* Algorithm Recommendation Reason */}
              {post.recommendationReason && (
                <div
                  className={`flex items-center justify-between text-[11px] px-3 py-1.5 rounded-xl border ${
                    isDark
                      ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                      : 'bg-slate-50 border-slate-100 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-medium">{post.recommendationReason}</span>
                  </div>
                  <button
                    onClick={() => setActiveExplainPost(post)}
                    title="Why am I seeing this?"
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Author Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={(post.author?.avatarUrl && post.author.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                    alt={post.author.displayName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700/80"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">{post.author.displayName}</span>
                      {post.author.isVerified && (
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-black">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <span>@{post.author.username}</span>
                      <span className="mx-1">·</span>
                      <span>{post.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isSponsored ? (
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                      {isBengali ? 'বিজ্ঞাপন' : 'Sponsored Ad'}
                    </span>
                  ) : post.isDemoData ? (
                    <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      DEMO POST
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      ✓ Verified
                    </span>
                  )}

                  <button
                    onClick={() => setReportPostTarget(post)}
                    title="Report post"
                    className="p-1 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-xs leading-relaxed whitespace-pre-line font-normal">
                {post.content}
              </p>

              {/* Media Image or Video Attachment */}
              {Boolean(post.mediaUrl && post.mediaUrl.trim()) && (
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-md">
                  {(() => {
                    const mediaSrc = post.mediaUrl!.trim();
                    const cleanUrl = mediaSrc.toLowerCase().split('?')[0];
                    const isVideo =
                      !cleanUrl.match(/\.(png|jpe?g|webp|gif|svg)$/i) &&
                      (post.postType === 'short_video' ||
                        cleanUrl.endsWith('.mp4') ||
                        cleanUrl.endsWith('.webm') ||
                        cleanUrl.endsWith('.mov') ||
                        cleanUrl.includes('sample/') ||
                        cleanUrl.includes('/videos/'));

                    return isVideo ? (
                      <video
                        controls
                        playsInline
                        className="w-full max-h-[380px] sm:max-h-[420px] object-contain"
                      >
                        <source
                          src={mediaSrc}
                          type={cleanUrl.endsWith('.webm') ? 'video/webm' : 'video/mp4'}
                        />
                      </video>
                    ) : (
                      <img
                        src={mediaSrc}
                        alt="Attachment"
                        onClick={() =>
                          setActivePhotoViewer({
                            photos: post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls : [mediaSrc],
                            index: 0,
                            post,
                          })
                        }
                        className="w-full max-h-[380px] sm:max-h-[420px] object-cover hover:scale-[1.01] transition-transform duration-300 cursor-pointer"
                      />
                    );
                  })()}
                </div>
              )}

              {/* Attached Music Soundtrack Player Bar */}
              {(post.audioUrl || post.audioTrack || post.musicAttachment) && (() => {
                const track = post.audioTrack || post.musicAttachment?.track;
                const trackTitle = isBengali
                  ? (track?.titleBn || track?.title || 'অডিও ট্র্যাক')
                  : (track?.title || 'Soundtrack');
                const trackArtist = isBengali
                  ? (track?.artistBn || track?.artist || 'শিল্পী')
                  : (track?.artist || 'Artist');
                const isThisPlaying = playingPostAudioId === post.id && isFeedAudioPlaying;
                const isPhotoWithMusic = Boolean(post.mediaUrl && !post.mediaUrl.match(/\.(mp4|webm|mov)$/i));

                return (
                  <div
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isThisPlaying
                        ? 'bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-indigo-950/40 border-pink-500/50 shadow-md shadow-pink-500/10'
                        : isDark
                        ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        : 'bg-pink-50/70 border-pink-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => togglePlayPostAudio(post)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          isThisPlaying
                            ? 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30 scale-105'
                            : 'bg-pink-500/15 hover:bg-pink-500/25 text-pink-400'
                        }`}
                        title={isThisPlaying ? (isBengali ? 'থামান' : 'Pause') : (isBengali ? 'চালান' : 'Play')}
                      >
                        {isThisPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Music className={`w-3.5 h-3.5 shrink-0 ${isThisPlaying ? 'text-pink-400 animate-pulse' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold truncate text-slate-200">
                            {trackTitle}
                          </span>
                          {isPhotoWithMusic ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30 shrink-0">
                              {isBengali ? 'ফটো + গান 🎵' : 'Photo + Music 🎵'}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                              {isBengali ? 'ভিডিও অডিও 🎬' : 'Video Audio 🎬'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="truncate">{trackArtist}</span>
                          {track?.category && (
                            <>
                              <span>•</span>
                              <span className="uppercase text-[9px] font-semibold text-pink-400">
                                {track.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isThisPlaying && (
                        <div className="flex items-center gap-0.5 h-3">
                          <span className="w-0.5 h-3 bg-pink-400 animate-pulse rounded-full"></span>
                          <span className="w-0.5 h-2 bg-pink-400 animate-pulse delay-75 rounded-full"></span>
                          <span className="w-0.5 h-3.5 bg-pink-400 animate-pulse delay-150 rounded-full"></span>
                          <span className="w-0.5 h-1.5 bg-pink-400 animate-pulse delay-100 rounded-full"></span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => togglePlayPostAudio(post)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors ${
                          isThisPlaying
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isThisPlaying ? (isBengali ? 'পজ' : 'Pause') : (isBengali ? 'শুনুন' : 'Play')}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Hashtags */}
              {post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {post.hashtags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onSelectTag?.(tag)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg transition-colors ${
                        isDark
                          ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                          : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Sponsored Native Ad Call to Action */}
              {isSponsored && (
                <div className={`p-3 rounded-2xl flex items-center justify-between border ${
                  isDark
                    ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
                    : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
                }`}>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{isBengali ? 'Google AdMob Native অ্যাড' : 'Google AdMob Native Unit'}</span>
                    </p>
                    <p className="font-mono text-[10px] text-slate-400">
                      ID: {adConfig.nativeAdUnitId.slice(0, 24)}...
                    </p>
                  </div>
                  <a
                    href="https://admob.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all shrink-0"
                  >
                    {isBengali ? 'ভিজিট করুন' : 'Learn More'}
                  </a>
                </div>
              )}

              {/* Action Toolbar */}
              <div
                className={`flex items-center justify-between pt-3 border-t text-slate-400 ${
                  isDark ? 'border-slate-800/80' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Like Button */}
                  <button
                    onClick={() => onLike(post.id)}
                    className="flex items-center gap-1.5 text-xs hover:text-red-500 transition-colors group"
                  >
                    <Heart
                      className={`w-4 h-4 transition-transform group-active:scale-125 ${
                        post.isLiked ? 'fill-red-500 text-red-500' : ''
                      }`}
                    />
                    <span className={post.isLiked ? 'text-red-500 font-bold' : ''}>
                      {post.likesCount}
                    </span>
                  </button>

                  {/* Comments Button */}
                  <button
                    onClick={() => onOpenComments(post)}
                    className="flex items-center gap-1.5 text-xs hover:text-cyan-400 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentsCount}</span>
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={() => handleSharePost(post)}
                    className="flex items-center gap-1 text-xs hover:text-indigo-400 transition-colors"
                    title="Share Post"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{post.sharesCount}</span>
                  </button>
                </div>

                {/* Bookmark Button */}
                <button
                  onClick={() => onBookmark(post.id)}
                  className={`p-1.5 rounded-xl transition-colors ${
                    post.isSaved
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
                  }`}
                  title={post.isSaved ? 'Saved to bookmarks' : 'Save bookmark'}
                >
                  <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-amber-400' : ''}`} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Report Post Modal */}
      {reportPostTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border animate-in zoom-in-95 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold flex items-center gap-2 text-rose-400">
                <Flag className="w-4 h-4" />
                <span>{isBengali ? 'পোস্ট রিপোর্ট করুন' : 'Report Post'}</span>
              </h4>
              <button
                onClick={() => setReportPostTarget(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold text-center">
                ✓ {isBengali ? 'রিপোর্ট সফলভাবে জমা হয়েছে।' : 'Report submitted successfully.'}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  {isBengali
                    ? 'এই পোস্টটি কেন রিপোর্ট করছেন তা নির্বাচন করুন:'
                    : 'Select a reason for reporting this post to Zan-Gi moderation:'}
                </p>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="Inappropriate or offensive content">Inappropriate or offensive</option>
                  <option value="Spam or misleading advertisement">Spam or misleading</option>
                  <option value="Harassment or hate speech">Harassment or hate speech</option>
                  <option value="Copyright infringement">Copyright infringement</option>
                </select>

                <button
                  onClick={handleReportSubmit}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  {isBengali ? 'রিপোর্ট জমা দিন' : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
