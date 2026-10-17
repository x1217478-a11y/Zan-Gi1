import React, { useState } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Send,
  Wand2,
  CheckCircle2,
  Tag,
  AlertCircle,
  X,
  PlaySquare,
  Globe,
  Lock,
  Users,
  Film,
  Calendar,
  Clock,
  Music,
  Volume2,
  Trash2,
  Info
} from 'lucide-react';
import { Post, PostType, PostMusicAttachment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { MediaPicker, UploadedMediaItem } from '../media/MediaPicker';
import { MusicPickerModal } from '../media/MusicPickerModal';

interface CreateViewProps {
  isBengali: boolean;
  onPostCreated: (newPost: any) => void;
  onCancel: () => void;
  onViewScheduled?: () => void;
}

export const CreateView: React.FC<CreateViewProps> = ({
  isBengali,
  onPostCreated,
  onCancel,
  onViewScheduled,
}) => {
  const { user, token, createScheduledPost } = useAuth();
  const { isDark } = useTheme();

  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType | 'story'>('image');
  const [audience, setAudience] = useState<'public' | 'friends' | 'only_me'>('public');
  const [hashtags, setHashtags] = useState('ZanGiBD, CreatorStudio, FutureAI');
  const [uploadedMediaItems, setUploadedMediaItems] = useState<UploadedMediaItem[]>([]);
  const [musicAttachment, setMusicAttachment] = useState<PostMusicAttachment | null>(null);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [alsoPublishToReels, setAlsoPublishToReels] = useState(true);

  // Quick Mention options
  const quickMentions = ['fahim', 'nusrat', 'owner'];
  const quickTags = ['ZanGiBD', 'বাংলাAI', 'Dhaka2026', 'CreatorEconomy'];

  const insertMention = (username: string) => {
    setContent((prev) => (prev ? `${prev} @${username} ` : `@${username} `));
  };

  const insertHashtag = (tag: string) => {
    setHashtags((prev) => {
      const existing = prev.split(',').map((t) => t.trim().toLowerCase());
      if (existing.includes(tag.toLowerCase())) return prev;
      return prev ? `${prev}, ${tag}` : tag;
    });
  };

  // Scheduling State
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future by default
    return d.toISOString().slice(0, 16); // format: YYYY-MM-DDTHH:mm
  });
  const [scheduleSuccessNotice, setScheduleSuccessNotice] = useState<string | null>(null);

  // AI Assistant State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiLang, setAiLang] = useState<'bn' | 'en' | 'banglish'>('bn');
  const [aiTone, setAiTone] = useState<'trendy' | 'poetic' | 'professional' | 'funny'>('trendy');
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleGenerateAiCaption = async () => {
    setAiGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic || content,
          language: aiLang,
          tone: aiTone,
          postType: postType === 'short_video' ? 'reel' : 'post',
        }),
      });
      const data = await res.json();
      if (data.caption) {
        setContent(data.caption);
      }
      if (Array.isArray(data.hashtags) && data.hashtags.length > 0) {
        setHashtags(data.hashtags.join(', '));
      }
      setShowAiModal(false);
    } catch {
      setContent(
        aiLang === 'bn'
          ? 'নতুন দিগন্তের উন্মোচন Zan-Gi তে! 🚀 বাংলা ও ইংরেজি কনটেন্ট ক্রিয়েটরদের জন্য তৈরি এই AI সোশ্যাল প্ল্যাটফর্মে আপনার সৃজনশীলতা প্রকাশ করুন।'
          : 'Connecting creativity and technology inside Zan-Gi! 🚀 Testing our new AI-first smart feed tools.'
      );
    } finally {
      setAiGenerating(false);
    }
  };

  const handleMediaUploaded = (items: UploadedMediaItem[]) => {
    const valid = (items || []).filter((it) => it && typeof it.url === 'string' && it.url.trim().length > 0);
    setUploadedMediaItems((prev) => [...prev, ...valid]);
    const withMusic = valid.find((it) => it.musicAttachment);
    if (withMusic?.musicAttachment && !musicAttachment) {
      setMusicAttachment(withMusic.musicAttachment);
    }
    setPublishError(null);
  };

  const handleRemoveMedia = (index: number) => {
    setUploadedMediaItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePublish = async () => {
    if (!content.trim() && uploadedMediaItems.length === 0) {
      setPublishError(isBengali ? 'দয়া করে কিছু লিখুন অথবা একটি ছবি/ভিডিও যুক্ত করুন।' : 'Please enter text or attach media.');
      return;
    }

    if (!token) {
      setPublishError(isBengali ? 'পোস্ট করার জন্য প্রথমে লগইন করা আবশ্যক।' : 'You must be logged in to publish.');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    // AI Safety Pre-check
    if (content.trim()) {
      try {
        const modRes = await fetch('/api/ai/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content.trim() }),
        });
        const modData = await modRes.json();
        if (modData.flagged) {
          setIsPublishing(false);
          setPublishError(
            isBengali
              ? 'নিরাপত্তা সতর্কতা: আপনার পোস্টের কনটেন্ট কমিউনিটি গাইডলাইনের সাথে সামঞ্জস্যপূর্ণ নয় (' +
                (modData.reason || 'আপত্তিকর ভাষা শনাক্ত') +
                ')। অনুগ্রহ করে পরিমার্জন করুন।'
              : 'Content Safety Warning: Post violates community standards (' +
                (modData.reason || 'Flagged') +
                '). Please revise before posting.'
          );
          return;
        }
      } catch {
        // Proceed if moderation network error
      }
    }

    const parsedTags = hashtags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const mediaUrls = uploadedMediaItems
      .map((m) => m.url)
      .filter((u): u is string => typeof u === 'string' && u.trim().length > 0);

    // If Scheduling is active, send to scheduled post endpoint
    if (isScheduling) {
      try {
        const targetDate = new Date(scheduleDate);
        if (isNaN(targetDate.getTime())) {
          throw new Error('Please select a valid date and time');
        }

        const res = await createScheduledPost({
          content: content.trim(),
          postType: postType === 'short_video' ? 'short_video' : uploadedMediaItems.length > 0 ? 'image' : 'text',
          mediaUrls,
          thumbnailUrl: mediaUrls[0],
          scheduledAt: targetDate.toISOString(),
          hashtags: parsedTags,
          isAiAssisted: true,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to schedule post');
        }

        setScheduleSuccessNotice(
          isBengali
            ? `পোস্ট সফলভাবে শিডিউল করা হয়েছে (${targetDate.toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })})!`
            : `Post successfully scheduled for ${targetDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}!`
        );

        setTimeout(() => {
          if (onViewScheduled) onViewScheduled();
          else onCancel();
        }, 1500);
      } catch (err: any) {
        setPublishError(err.message || 'Error scheduling post');
        setIsPublishing(false);
      }
      return;
    }

    // Direct Instant Publishing
    try {
      if (postType === 'story') {
        const storyRes = await fetch('/api/stories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mediaUrl: mediaUrls[0] || '/src/assets/images/zangi_feed_cybercity_1791614814919.jpg',
            caption: content.trim() || undefined,
            audioTrack: musicAttachment?.track,
            audioUrl: musicAttachment?.track?.audioUrl,
            audioVolume: musicAttachment?.musicVolume,
          }),
        });
        const storyData = await storyRes.json();
        if (!storyRes.ok) {
          throw new Error(storyData.error || 'Failed to publish story');
        }
        setPublishSuccess(true);
        setTimeout(() => {
          onPostCreated(storyData.story);
        }, 700);
        return;
      }

      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          postType: postType === 'short_video' ? 'short_video' : uploadedMediaItems.length > 0 ? 'image' : 'text',
          mediaUrls,
          thumbnailUrl: mediaUrls[0],
          hashtags: parsedTags,
          isAiAssisted: true,
          audience,
          audioTrack: musicAttachment?.track,
          audioUrl: musicAttachment?.track?.audioUrl,
          audioTitle: musicAttachment?.track?.title,
          audioVolume: musicAttachment?.musicVolume,
          originalVolume: musicAttachment?.originalVolume,
          audioStartTime: musicAttachment?.startTime,
          musicAttachment: musicAttachment || undefined,
        }),
      });

      const postData = await postRes.json();
      if (!postRes.ok) {
        throw new Error(postData.error || 'Failed to publish post');
      }

      // If short video, also publish to reels
      if (postType === 'short_video' && mediaUrls.length > 0 && alsoPublishToReels) {
        await fetch('/api/reels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            caption: content.trim(),
            captionBn: content.trim(),
            videoUrl: mediaUrls[0],
            thumbnailUrl: mediaUrls[0],
            hashtags: parsedTags,
            durationSeconds: Math.round(uploadedMediaItems[0]?.duration || 60),
            audioTitle: musicAttachment?.track?.title || 'Original Audio',
            audioTrack: musicAttachment?.track,
            audioUrl: musicAttachment?.track?.audioUrl,
            audioVolume: musicAttachment?.musicVolume,
            originalVolume: musicAttachment?.originalVolume,
            audioStartTime: musicAttachment?.startTime,
          }),
        }).catch(() => {});
      }

      setPublishSuccess(true);
      setTimeout(() => {
        onPostCreated(postData.post);
      }, 700);
    } catch (err: any) {
      setPublishError(err.message || 'Error publishing post');
      setIsPublishing(false);
    }
  };

  return (
    <div
      className={`flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 pb-10 select-none flex flex-col justify-between w-full transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
      }`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3.5 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">
                {isBengali ? 'আসল কনটেন্ট তৈরি ও পাবলিশ' : 'Create & Publish Content'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isBengali
                  ? 'Zan-Gi ক্লাউড স্টোরেজে সুরক্ষিতভাবে সংরক্ষিত হবে'
                  : 'Persisted to high-performance Zan-Gi cloud store'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onViewScheduled && (
              <button
                type="button"
                onClick={onViewScheduled}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isBengali ? 'শিডিউলড' : 'Scheduled'}</span>
              </button>
            )}
            <button
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-slate-200 font-semibold px-2.5 py-1 rounded-xl hover:bg-slate-800 transition-colors"
            >
              {isBengali ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {publishError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-start gap-2 animate-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">{publishError}</p>
          </div>
        )}

        {/* Success Confirmation */}
        {publishSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="font-bold">
              {isBengali ? 'পোস্ট সফলভাবে প্রকাশিত হয়েছে! ফিডে রিডাইরেক্ট হচ্ছে...' : 'Post published successfully! Redirecting...'}
            </p>
          </div>
        )}

        {/* Schedule Success Notice */}
        {scheduleSuccessNotice && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <p className="font-bold">{scheduleSuccessNotice}</p>
          </div>
        )}

        {/* Author Header & Audience Privacy Selector */}
        <div className={`flex items-center justify-between p-3 rounded-2xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <img
              src={(user?.avatarUrl && user.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-cyan-500/50"
            />
            <div>
              <span className="text-xs font-bold block">{user?.displayName || 'Creator'}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 font-medium">{isBengali ? 'দর্শকদের ধরন:' : 'Audience:'}</span>
                <div className={`inline-flex rounded-lg p-0.5 border text-[10px] font-bold ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setAudience('public')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                      audience === 'public' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Globe className="w-2.5 h-2.5" />
                    <span>{isBengali ? 'পাবলিক' : 'Public'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudience('friends')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                      audience === 'friends' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-2.5 h-2.5" />
                    <span>{isBengali ? 'বন্ধুরা' : 'Friends'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudience('only_me')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                      audience === 'only_me' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Lock className="w-2.5 h-2.5" />
                    <span>{isBengali ? 'ব্যক্তিগত' : 'Only Me'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Post Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPostType('image')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
              postType === 'image'
                ? 'border-blue-500 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 shadow-xs'
                : isDark
                ? 'border-slate-800 text-slate-400 hover:bg-slate-900'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate">{isBengali ? 'ফটো পোস্ট' : 'Photo Post'}</span>
          </button>

          <button
            type="button"
            onClick={() => setPostType('short_video')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
              postType === 'short_video'
                ? 'border-violet-500 bg-gradient-to-r from-violet-600/20 to-purple-600/20 text-violet-400 shadow-xs'
                : isDark
                ? 'border-slate-800 text-slate-400 hover:bg-slate-900'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-purple-400" />
            <span className="truncate">{isBengali ? 'রিলস / ভিডিও' : 'Reel / Video'}</span>
          </button>

          <button
            type="button"
            onClick={() => setPostType('story')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
              postType === 'story'
                ? 'border-pink-500 bg-gradient-to-r from-pink-600/20 to-rose-600/20 text-pink-400 shadow-xs'
                : isDark
                ? 'border-slate-800 text-slate-400 hover:bg-slate-900'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span className="truncate">{isBengali ? 'স্টোরি (২৪ ঘণ্টা)' : '24h Story'}</span>
          </button>
        </div>

        {/* Clear Media & Music Behavior Disclosure */}
        <div className={`p-2.5 rounded-2xl text-[11px] leading-relaxed flex items-start gap-2 border ${
          postType === 'story'
            ? 'bg-pink-950/20 border-pink-500/30 text-pink-300'
            : postType === 'short_video'
            ? 'bg-violet-950/20 border-violet-500/30 text-violet-300'
            : musicAttachment
            ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-300'
            : isDark
            ? 'bg-slate-900/40 border-slate-800 text-slate-400'
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
          <div>
            {postType === 'story' ? (
              <span>
                {isBengali
                  ? '⏳ ২৪ ঘণ্টার স্টোরি: ছবি বা ভিডিওর সাথে ব্যাকগ্রাউন্ড মিউজিক ট্র্যাক যুক্ত করে শেয়ার করুন। ২৪ ঘণ্টা পর স্বয়ংক্রিয়ভাবে অদৃশ্য হবে।'
                  : '⏳ 24h Story: Upload photo or clip with soundtrack. Vanishes automatically after 24 hours.'}
              </span>
            ) : postType === 'short_video' ? (
              <span>
                {isBengali
                  ? '🎬 রিলস ও শর্ট ভিডিও: ভিডিও সাউন্ড এবং ব্যাকগ্রাউন্ড মিউজিক ট্র্যাক একসাথে মিক্স হয়ে রিলস ট্যাব ও ফিডে প্রকাশিত হবে।'
                  : '🎬 Reel / Short Video: Video audio will be mixed with soundtrack and published to Reels and Feed.'}
              </span>
            ) : musicAttachment ? (
              <span>
                {isBengali
                  ? '🎵 ফটো পোস্ট ও মিউজিক ট্র্যাক: স্থির ছবির সাথে অডিও ট্র্যাক যুক্ত থাকবে। এটি ভিডিওতে রূপান্তরিত না হয়ে অনুমোদিত ফটো পোস্ট হিসেবে প্রকাশিত হবে এবং ফিডে দর্শকরা অডিও প্লেয়ার দিয়ে গান শুনতে পারবেন।'
                  : '🎵 Photo Post with Soundtrack: Attaches an audio soundtrack to your photo. Published as a photo post with an interactive feed audio player.'}
              </span>
            ) : (
              <span>
                {isBengali
                  ? '🖼️ সাধারণ ফটো / মিডিয়া পোস্ট: একক বা একাধিক ছবি দিয়ে ফিডে পোস্ট করুন। নিচের "মিউজিক যোগ করুন" বাটনে ট্যাপ করে ব্যাকগ্রাউন্ড গানও যুক্ত করতে পারেন।'
                  : '🖼️ Standard Photo Post: Attach images to feed. Tap "Add Music" below to attach a soundtrack.'}
              </span>
            )}
          </div>
        </div>

        {/* Content Input Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-400">
              {isBengali ? 'আপনার বার্তা / ক্যাপশন' : 'Your Caption or Thoughts'}
            </label>
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
            >
              <Wand2 className="w-3 h-3" />
              <span>{isBengali ? 'AI ক্যাপশন তৈরি' : 'AI Caption Studio'}</span>
            </button>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder={
              isBengali
                ? 'আজকে আপনি কী তৈরি করছেন? বাংলা অথবা ইংরেজিতে লিখুন...'
                : 'What are you building or sharing today? Type in Bengali or English...'
            }
            className={`w-full rounded-2xl p-3.5 text-xs focus:outline-none transition-all resize-none border leading-relaxed ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
            }`}
          />

          {/* Quick Mentions Row */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] text-slate-400 font-semibold">{isBengali ? 'মেনশন:' : 'Mention:'}</span>
            {quickMentions.map((qm) => (
              <button
                key={qm}
                type="button"
                onClick={() => insertMention(qm)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  isDark ? 'bg-slate-800/80 border-slate-700 text-cyan-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-blue-600 hover:bg-slate-200'
                }`}
              >
                @{qm}
              </button>
            ))}
          </div>
        </div>

        {/* Media Uploader Integration with Smart Compression & Creator Studio */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400">
            {isBengali
              ? 'স্মার্ট মিডিয়া আপলোড ও ক্রিয়েটর স্টুডিও (স্মার্ট অটো-কম্প্রেশন • সর্বোচ্চ ১৫০ সে. রিলস)'
              : 'Attach Media & Creator Studio (Smart Local Compression • Up to 150s Reels)'}
          </label>
          <MediaPicker
            mediaType={postType === 'short_video' ? 'video' : postType === 'story' ? 'all' : 'image'}
            onUploadSuccess={handleMediaUploaded}
            isBengali={isBengali}
            allowMultiple={postType === 'image'}
            maxFiles={postType === 'image' ? 4 : 1}
            aspectRatioHint={postType === 'short_video' || postType === 'story' ? '9:16' : '1:1'}
          />

          {/* Uploaded Media Previews */}
          {uploadedMediaItems.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {uploadedMediaItems.map((item, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shrink-0 group"
                >
                  {Boolean(item.url && item.url.trim()) && (
                    <img src={item.url} alt="Attached" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs opacity-90 hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Music / Soundtrack Integration */}
          <div className="pt-1">
            {!musicAttachment ? (
              <button
                type="button"
                onClick={() => setShowMusicModal(true)}
                className={`w-full py-2.5 px-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white'
                    : 'bg-slate-50 border-slate-200 hover:border-blue-400 text-slate-700 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                    <Music className="w-3.5 h-3.5" />
                  </div>
                  <span>{isBengali ? 'মিউজিক বা ব্যাকগ্রাউন্ড অডিও যোগ করুন' : 'Add Music or Background Soundtrack'}</span>
                </div>
                <span className="text-[11px] text-cyan-400 font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                  {isBengali ? 'লাইব্রেরি ব্রাউজ' : 'Browse Library'}
                </span>
              </button>
            ) : (
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDark
                    ? 'bg-pink-950/20 border-pink-500/40 text-pink-200'
                    : 'bg-pink-50 border-pink-300 text-pink-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={musicAttachment.track.coverUrl || '/src/assets/images/zangi_creator_art_1791614801925.jpg'}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover border border-pink-500/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <span className="text-xs font-bold truncate">
                        {isBengali ? musicAttachment.track.titleBn || musicAttachment.track.title : musicAttachment.track.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {isBengali ? musicAttachment.track.artistBn || musicAttachment.track.artist : musicAttachment.track.artist}
                      {' • '}
                      <span className="uppercase text-[9px] font-bold tracking-wider text-pink-400">
                        {musicAttachment.track.category}
                      </span>
                    </span>
                    <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-0.5">
                      <span>{isBengali ? 'সাউন্ড:' : 'Music:'} {Math.round(musicAttachment.musicVolume * 100)}%</span>
                      <span>•</span>
                      <span>{isBengali ? 'ভিডিও অডিও:' : 'Original:'} {Math.round(musicAttachment.originalVolume * 100)}%</span>
                      {musicAttachment.startTime > 0 && (
                        <>
                          <span>•</span>
                          <span>{isBengali ? 'শুরু:' : 'Start:'} {musicAttachment.startTime}s</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMusicModal(true)}
                    className="text-[11px] px-2.5 py-1 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-bold border border-pink-500/30 transition-colors"
                  >
                    {isBengali ? 'পরিবর্তন' : 'Change'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMusicAttachment(null)}
                    className="w-7 h-7 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition-colors"
                    title={isBengali ? 'গান সরান' : 'Remove Music'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hashtags Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Tag className="w-3 h-3 text-cyan-400" />
            <span>Hashtags ({isBengali ? 'কমা দিয়ে আলাদা করুন' : 'comma separated'})</span>
          </label>
          <input
            type="text"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className={`w-full rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none transition-all border ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
            }`}
          />
          {/* Quick Hashtag Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] text-slate-400 font-semibold">{isBengali ? 'ট্রেন্ডিং:' : 'Trending:'}</span>
            {quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertHashtag(tag)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  isDark ? 'bg-slate-800/80 border-slate-700 text-cyan-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-blue-600 hover:bg-slate-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* SCHEDULE POST SECTION */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-xs font-bold block">
                  {isBengali ? 'ভবিষ্যতের জন্য শিডিউল করুন' : 'Schedule for Later'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isBengali
                    ? 'নির্দিষ্ট তারিখে স্বয়ংক্রিয়ভাবে প্রকাশ করা হবে'
                    : 'Auto-publish automatically at scheduled timestamp'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsScheduling(!isScheduling)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                isScheduling ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isScheduling ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {isScheduling && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 animate-in fade-in">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isBengali ? 'প্রকাশের তারিখ ও সময়' : 'Publish Date & Time'}</span>
              </label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-cyan-300 focus:border-cyan-400'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                }`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Publish CTA Button */}
      <div className={`pt-4 border-t mt-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing || (!content.trim() && uploadedMediaItems.length === 0)}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 disabled:opacity-40 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
        >
          {isScheduling ? <Calendar className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          <span>
            {isPublishing
              ? isBengali
                ? 'সার্ভারে সংরক্ষণ হচ্ছে...'
                : 'Processing on Server...'
              : isScheduling
              ? isBengali
                ? 'পোস্ট শিডিউল করুন'
                : 'Schedule Post'
              : isBengali
              ? 'সোশ্যাল ইউনিভার্সে প্রকাশ করুন'
              : 'Publish to Social Universe'}
          </span>
        </button>
      </div>

      {/* AI Studio Assistant Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border animate-in zoom-in-95 ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2 text-cyan-400">
                <Sparkles className="w-5 h-5" />
                <h4 className="text-sm font-black">
                  {isBengali ? 'Zan-Gi AI কন্টেন্ট স্টুডিও' : 'Zan-Gi AI Caption Studio'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  {isBengali ? 'পোস্টের মূল বিষয় / আইডিয়া' : 'Topic / Core Idea'}
                </label>
                <input
                  type="text"
                  placeholder={
                    isBengali
                      ? 'যেমন: ঢাকা টেক কনফারেন্স, ভোরের নদী ভ্রমণ...'
                      : 'e.g. Dhaka Tech Fest, Meghna river drone shot...'
                  }
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  {isBengali ? 'ভাষা নির্বাচন' : 'Language'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'bn', label: 'বাংলা' },
                    { id: 'en', label: 'English' },
                    { id: 'banglish', label: 'Banglish' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setAiLang(l.id as any)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        aiLang === l.id
                          ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  {isBengali ? 'টোন ও মেজাজ' : 'Tone'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'trendy', label: '🔥 ট্রেন্ডি (Viral)' },
                    { id: 'poetic', label: '🌿 নান্দনিক (Poetic)' },
                    { id: 'professional', label: '💼 প্রফেশনাল' },
                    { id: 'funny', label: '😄 মজাদার (Humor)' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAiTone(t.id as any)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border text-left transition-all ${
                        aiTone === t.id
                          ? 'border-indigo-400 bg-indigo-500/10 text-indigo-300'
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateAiCaption}
                disabled={aiGenerating}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5"
              >
                <Wand2 className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-spin' : ''}`} />
                <span>
                  {aiGenerating
                    ? isBengali
                      ? 'AI তৈরি করছে...'
                      : 'Generating Caption...'
                    : isBengali
                    ? 'ক্যাপশন তৈরি ও অ্যাপ্লাই করুন'
                    : 'Apply AI Caption'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music Picker Modal */}
      <MusicPickerModal
        isOpen={showMusicModal}
        onClose={() => setShowMusicModal(false)}
        onSelectTrack={(attachment) => {
          setMusicAttachment(attachment);
          setShowMusicModal(false);
        }}
        currentAttachment={musicAttachment}
        isBengali={isBengali}
        videoPreviewUrl={uploadedMediaItems[0]?.url}
      />
    </div>
  );
};
