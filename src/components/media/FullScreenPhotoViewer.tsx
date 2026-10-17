import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Eye,
  Check,
  Send,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Post, Comment } from '../../types';
import { useAuth } from '../../context/AuthContext';

export interface FullScreenPhotoViewerProps {
  photos: string[];
  initialIndex?: number;
  post?: Post;
  isBengali: boolean;
  onClose: () => void;
  onLikePost?: (postId: string) => void;
  onAddComment?: (postId: string, text: string) => void;
}

export const FullScreenPhotoViewer: React.FC<FullScreenPhotoViewerProps> = ({
  photos,
  initialIndex = 0,
  post,
  isBengali,
  onClose,
  onLikePost,
  onAddComment,
}) => {
  const { user, token } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [shareToast, setShareToast] = useState(false);
  const [isLiked, setIsLiked] = useState(post?.isLiked || false);
  const [likesCount, setLikesCount] = useState(post?.likesCount || 0);
  const [commentsList, setCommentsList] = useState<Comment[]>(post?.comments || []);

  // Soundtrack Audio state for photo posts with music
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const audioTrackUrl = post?.audioUrl || post?.audioTrack?.audioUrl || post?.musicAttachment?.track?.audioUrl;
  const audioTrackTitle = isBengali
    ? (post?.audioTrack?.titleBn || post?.musicAttachment?.track?.titleBn || post?.audioTrack?.title || post?.musicAttachment?.track?.title || 'অডিও ট্র্যাক')
    : (post?.audioTrack?.title || post?.musicAttachment?.track?.title || 'Soundtrack');

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const toggleSoundtrack = () => {
    if (!audioTrackUrl) return;
    if (isPlayingAudio) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioTrackUrl);
      } else {
        audioRef.current.src = audioTrackUrl;
      }
      audioRef.current.loop = true;
      audioRef.current.volume = isAudioMuted ? 0 : (post?.audioVolume ?? post?.musicAttachment?.musicVolume ?? 0.8);
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
    }
  };

  const currentPhoto = photos[currentIndex] || '';

  // Record photo view to backend once opened
  useEffect(() => {
    if (post?.id) {
      fetch(`/api/posts/${post.id}/photo-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ photoIdx: currentIndex }),
      }).catch(() => {});
    }
  }, [post?.id, currentIndex, token]);

  // Keyboard navigation & escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length]);

  const handleNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setZoomLevel(1);
      setRotation(0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setZoomLevel(1);
      setRotation(0);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleLike = () => {
    if (post) {
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? Math.max(0, prev - 1) : prev + 1));
      if (onLikePost) onLikePost(post.id);
    }
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !post) return;
    const newComment: Comment = {
      id: `comm_${Date.now()}`,
      author: user || {
        id: 'me',
        username: 'me',
        displayName: 'You',
        avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
        followersCount: 0,
        followingCount: 0,
        creatorCoins: 0,
        bio: '',
        isVerified: false,
      },
      text: commentInput.trim(),
      timestamp: isBengali ? 'এইমাত্র' : 'Just now',
      likesCount: 0,
    };
    setCommentsList((prev) => [...prev, newComment]);
    if (onAddComment) onAddComment(post.id, commentInput.trim());
    setCommentInput('');
  };

  const handleShare = () => {
    const url = window.location.origin;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = currentPhoto;
    a.download = `zangi_photo_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between text-white animate-in fade-in duration-200 select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          {post && (
            <div className="flex items-center gap-2.5">
              <img
                src={post.author.avatarUrl || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-cyan-400"
              />
              <div>
                <span className="text-xs font-bold block">{post.author.displayName}</span>
                <span className="text-[10px] text-slate-400">
                  {post.timestamp} {photos.length > 1 && `• ${currentIndex + 1} / ${photos.length}`}
                </span>
              </div>
            </div>
          )}

          {/* Attached Music Player Pill for Photo Post */}
          {audioTrackUrl && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs">
              <button
                type="button"
                onClick={toggleSoundtrack}
                className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                title={isPlayingAudio ? 'Pause' : 'Play Music'}
              >
                {isPlayingAudio ? <Pause className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current ml-0.5" />}
              </button>
              <Music className={`w-3.5 h-3.5 text-pink-400 shrink-0 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
              <span className="text-[11px] font-bold max-w-[90px] sm:max-w-[140px] truncate">
                {audioTrackTitle}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Share Toast */}
      {shareToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-cyan-600 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>{isBengali ? 'লিংক ক্লিপবোর্ডে কপি করা হয়েছে!' : 'Link copied to clipboard!'}</span>
        </div>
      )}

      {/* Main Photo Canvas Area */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Previous Button */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-xl"
            title="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-3 sm:right-6 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-xl"
            title="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* The Photo */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200"
          style={{
            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            cursor: zoomLevel > 1 ? 'grab' : 'zoom-in',
          }}
          onClick={() => (zoomLevel === 1 ? handleZoomIn() : setZoomLevel(1))}
        >
          <img
            src={currentPhoto}
            alt=""
            className="max-h-[75vh] max-w-[95vw] object-contain rounded-lg shadow-2xl pointer-events-auto"
          />
        </div>
      </div>

      {/* Bottom Information & Reaction Bar */}
      <div className="p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-20 space-y-3">
        {post?.content && (
          <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 max-w-3xl mx-auto text-center font-medium">
            {post.content}
          </p>
        )}

        <div className="flex items-center justify-between max-w-md mx-auto pt-1 border-t border-white/10">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              isLiked ? 'text-rose-400 bg-rose-500/20' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likesCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-cyan-400" />
            <span>{commentsList.length} {isBengali ? 'মন্তব্য' : 'Comments'}</span>
          </button>

          {post?.photoViewsCount !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400">
              <Eye className="w-4 h-4 text-slate-400" />
              <span>{post.photoViewsCount + 1} {isBengali ? 'ভিউ' : 'views'}</span>
            </div>
          )}
        </div>

        {/* Sliding Comments Tray */}
        {showComments && (
          <div className="max-w-md mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2.5 max-h-48 overflow-y-auto">
            <div className="space-y-2">
              {commentsList.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-2">
                  {isBengali ? 'এখনও কোনো মন্তব্য নেই। প্রথম মন্তব্য করুন!' : 'No comments yet. Be the first to comment!'}
                </p>
              ) : (
                commentsList.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-xs">
                    <img
                      src={c.author.avatarUrl || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                    <div className="bg-slate-800/80 rounded-xl px-2.5 py-1.5 flex-1">
                      <span className="font-bold text-[11px] text-cyan-300 block">{c.author.displayName}</span>
                      <p className="text-[11px] text-slate-200">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendComment} className="flex items-center gap-2 pt-1 border-t border-slate-800">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={isBengali ? 'একটি মন্তব্য লিখুন...' : 'Write a comment...'}
                className="flex-1 bg-slate-800 text-xs px-3 py-1.5 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                className="p-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
