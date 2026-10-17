import React, { useState, useEffect } from 'react';
import { X, Send, Heart, AlertCircle, Sparkles } from 'lucide-react';
import { Post, Comment, User } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface CommentsSheetProps {
  post: Post | null;
  onClose: () => void;
  currentUser: User;
  onAddComment: (postId: string, text: string) => void;
}

export const CommentsSheet: React.FC<CommentsSheetProps> = ({
  post,
  onClose,
  currentUser,
  onAddComment,
}) => {
  const { token } = useAuth();
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);

  useEffect(() => {
    if (post) {
      if ((post as any).comments && Array.isArray((post as any).comments)) {
        setComments((post as any).comments);
      } else {
        setComments([]);
      }

      // Fetch AI smart replies
      fetch('/api/ai/smart-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postContent: post.content, language: 'bn' }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.replies)) {
            setSmartReplies(data.replies);
          }
        })
        .catch(() => {});
    }
  }, [post]);

  if (!post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    setError(null);
    setSubmitting(true);

    const tempComment: Comment = {
      id: `c_${Date.now()}`,
      author: currentUser,
      text: commentInput.trim(),
      timestamp: 'এইমাত্র',
      likesCount: 0,
      isLiked: false,
    };

    setComments((prev) => [...prev, tempComment]);
    onAddComment(post.id, commentInput.trim());
    const submittedText = commentInput.trim();
    setCommentInput('');

    if (token) {
      try {
        const res = await fetch(`/api/posts/${post.id}/comment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: submittedText }),
        });
        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || 'Failed to submit comment');
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
      }
    }
    setSubmitting(false);
  };

  const handleToggleCommentLike = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const nextLiked = !c.isLiked;
          return {
            ...c,
            isLiked: nextLiked,
            likesCount: nextLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1),
          };
        }
        return c;
      })
    );
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl max-h-[85%] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-250 border-t border-slate-200">
        {/* Drag handle & header */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between relative">
          <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <h4 className="text-sm font-bold text-slate-900 mt-2">
            Comments ({comments.length})
          </h4>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-2 p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[360px]">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 items-start">
                <img
                  src={(comment.author?.avatarUrl && comment.author.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                  alt={comment.author.displayName}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {comment.author.displayName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {comment.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed whitespace-pre-line">
                    {comment.text}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleCommentLike(comment.id)}
                  className="text-slate-400 hover:text-red-500 flex flex-col items-center transition-colors"
                >
                  <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span className="text-[9px] mt-0.5">{comment.likesCount}</span>
                </button>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No comments yet. Be the first to share your thoughts!
            </div>
          )}
        </div>

        {/* AI Smart Replies Suggestions */}
        {smartReplies.length > 0 && (
          <div className="px-3 pt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-100 bg-slate-50/70">
            <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" />
            {smartReplies.map((reply, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCommentInput(reply)}
                className="px-2.5 py-1 bg-white hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 hover:border-violet-300 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shadow-2xs"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Input Field */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Add a comment / মন্তব্য লিখুন..."
            className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!commentInput.trim() || submitting}
            className="w-8 h-8 rounded-full bg-blue-600 disabled:opacity-40 text-white flex items-center justify-center shrink-0 hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
