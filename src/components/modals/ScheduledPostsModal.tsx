import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  PlaySquare,
  X,
  ExternalLink
} from 'lucide-react';
import { ScheduledPost } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface ScheduledPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBengali: boolean;
  onOpenCreate?: () => void;
}

export const ScheduledPostsModal: React.FC<ScheduledPostsModalProps> = ({
  isOpen,
  onClose,
  isBengali,
  onOpenCreate,
}) => {
  const { token, getScheduledPosts, cancelScheduledPost, triggerScheduledRunner } = useAuth();
  const { isDark } = useTheme();

  const [scheduledList, setScheduledList] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'published' | 'cancelled'>('all');

  const fetchScheduled = async () => {
    if (!token) return;
    setIsLoading(true);
    const res = await getScheduledPosts();
    setIsLoading(false);
    if (res.success && Array.isArray(res.scheduledPosts)) {
      setScheduledList(res.scheduledPosts);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScheduled();
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleCancel = async (id: string) => {
    const res = await cancelScheduledPost(id);
    if (res.success) {
      setActionMessage(isBengali ? 'শিডিউলড পোস্ট বাতিল করা হয়েছে।' : 'Scheduled post cancelled.');
      fetchScheduled();
      setTimeout(() => setActionMessage(null), 3000);
    } else {
      setActionMessage(res.error || 'Failed to cancel');
    }
  };

  const handleForceTrigger = async () => {
    setIsLoading(true);
    const res = await triggerScheduledRunner();
    setIsLoading(false);
    if (res.success) {
      setActionMessage(
        isBengali
          ? `রানার চালানো হয়েছে (${res.publishedCount || 0} টি পোস্ট প্রকাশিত)।`
          : `Scheduler executed (${res.publishedCount || 0} posts published now).`
      );
      fetchScheduled();
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const filteredItems = scheduledList.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl flex flex-col max-h-[88vh] overflow-hidden ${
          isDark
            ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-blue-950/40'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
        }`}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5">
                <span>{isBengali ? 'শিডিউলড পোস্ট ম্যানেজার' : 'Scheduled Posts'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Auto-Publish
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {isBengali
                  ? 'ভবিষ্যতের নির্ধারিত সময়ে স্বয়ংক্রিয়ভাবে প্রকাশ করার কনটেন্ট'
                  : 'Queued posts scheduled for automatic publishing'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Notice */}
        {actionMessage && (
          <div className="mx-4 mt-3 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Action Controls & Filters */}
        <div className="p-3 sm:px-4 border-b border-slate-800/40 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950/40 p-1 rounded-2xl border border-slate-800/60 text-xs">
            {(['all', 'pending', 'published', 'cancelled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all capitalize ${
                  filter === tab
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleForceTrigger}
              title="Run Scheduler Queue Now"
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isBengali ? 'চেক রানার' : 'Trigger Run'}</span>
            </button>
            {onOpenCreate && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCreate();
                }}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-xs flex items-center gap-1 hover:opacity-95 transition-opacity"
              >
                <Plus className="w-3 h-3" />
                <span>{isBengali ? 'নতুন শিডিউল' : 'New Schedule'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-48">
          {filteredItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 rounded-3xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-500">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-300">
                {isBengali ? 'কোনো শিডিউলড পোস্ট নেই' : 'No scheduled posts in this view'}
              </h4>
              <p className="text-[11px] text-slate-500 max-w-xs">
                {isBengali
                  ? 'নতুন পোস্ট তৈরি করার সময় একটি নির্দিষ্ট তারিখ ও সময় নির্বাচন করে স্বয়ংক্রিয়ভাবে শিডিউল করুন।'
                  : 'Create a new post and choose "Schedule Post" to queue publishing for any specific date and time.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const schedDate = new Date(item.scheduledAt);
              const isPast = schedDate.getTime() <= Date.now();
              const dateFormatted = schedDate.toLocaleString(isBengali ? 'bn-BD' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isDark
                      ? 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          item.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : item.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{dateFormatted}</span>
                      </span>
                    </div>

                    {item.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(item.id)}
                        title="Cancel this scheduled post"
                        className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="mt-2 text-xs font-medium text-slate-200 line-clamp-2 leading-relaxed">
                    {item.content || '(Media only)'}
                  </p>

                  {/* Media thumbnails preview */}
                  {item.mediaUrls && item.mediaUrls.filter((u) => Boolean(u && u.trim())).length > 0 && (
                    <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1">
                      {item.mediaUrls
                        .filter((u) => Boolean(u && u.trim()))
                        .map((url, idx) => (
                          <div
                            key={idx}
                            className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700/80 shrink-0 bg-slate-900"
                          >
                            <img src={url} alt="Media" className="w-full h-full object-cover" />
                          </div>
                        ))}
                    </div>
                  )}

                  {item.hashtags && item.hashtags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.hashtags.slice(0, 4).map((tag, idx) => (
                        <span key={idx} className="text-[10px] text-cyan-400 font-semibold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
