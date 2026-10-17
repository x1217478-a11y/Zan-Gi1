import React, { useState, useEffect } from 'react';
import {
  Settings,
  Coins,
  Bookmark,
  Grid3X3,
  Film,
  Users,
  Award,
  Sparkles,
  Edit3,
  LogOut,
  LogIn,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Mail,
  UserPlus,
  UserCheck,
  UserMinus,
  UserX,
  MessageCircle,
  Camera,
  Play,
  Calendar,
  Crown,
  Eye,
  Heart,
  Share2,
  Clock,
  ArrowLeft,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Post, User, Reel } from '../../types';
import { EditProfileModal } from '../modals/EditProfileModal';
import { FullScreenPhotoViewer } from '../media/FullScreenPhotoViewer';

interface ProfileViewProps {
  posts: Post[];
  isBengali: boolean;
  onOpenSettings: () => void;
  onTriggerRewardedAd: () => void;
  creatorCoins: number;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenScheduled?: () => void;
  onOpenMonetization?: () => void;
  onOpenPremium?: () => void;
  onOpenAdmin?: () => void;
  onOpenFriends?: () => void;
  viewingUserId?: string | null;
  onViewProfile?: (userId: string) => void;
  onStartMessage?: (userId: string) => void;
  onBackToFeed?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  posts,
  isBengali,
  onOpenSettings,
  onTriggerRewardedAd,
  creatorCoins,
  onOpenAuth,
  onOpenScheduled,
  onOpenMonetization,
  onOpenPremium,
  onOpenAdmin,
  onOpenFriends,
  viewingUserId,
  onViewProfile,
  onStartMessage,
  onBackToFeed,
}) => {
  const { user, token, isAuthenticated, logout, verifyEmail } = useAuth();
  const { isDark } = useTheme();

  const isOwnProfile = !viewingUserId || (user && user.id === viewingUserId);
  const targetId = isOwnProfile ? user?.id : viewingUserId;

  const [activeTab, setActiveTab] = useState<'posts' | 'photos' | 'reels' | 'friends' | 'about'>('posts');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showVerifyInput, setShowVerifyInput] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  // Other User's Profile State
  const [profileData, setProfileData] = useState<{
    user: User;
    friendsCount: number;
    friendshipStatus: 'friends' | 'pending_sent' | 'pending_received' | 'none';
    mutualCount: number;
    mutualFriends: User[];
    isFollowing: boolean;
    posts: Post[];
    photos: Array<{ url: string; postId: string; caption: string; timestamp: string }>;
    reels: Reel[];
    profileVisitsCount: number;
    isBlocked?: boolean;
  } | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(!isOwnProfile);
  const [relationshipActionLoading, setRelationshipActionLoading] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Full-screen photo viewer state
  const [activePhotoViewer, setActivePhotoViewer] = useState<{
    photos: string[];
    index: number;
    post?: Post;
  } | null>(null);

  // Load profile data (when viewing other user or refreshing stats)
  const loadProfile = async () => {
    if (!targetId || targetId === 'guest') {
      setIsLoadingProfile(false);
      return;
    }
    setIsLoadingProfile(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/users/${targetId}/profile`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (e) {
      console.warn('Failed to fetch user profile:', e);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();

    // Record profile visit if viewing someone else's profile
    if (!isOwnProfile && targetId) {
      fetch(`/api/users/${targetId}/visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).catch(() => {});
    }
  }, [targetId, token, isOwnProfile]);

  // Friend actions
  const handleSendFriendRequest = async () => {
    if (!token) {
      onOpenAuth('login');
      return;
    }
    if (!targetId) return;
    setRelationshipActionLoading(true);
    try {
      const res = await fetch(`/api/friends/request/${targetId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActionSuccessNotice(isBengali ? 'ফ্রেন্ড রিকোয়েস্ট পাঠানো হয়েছে!' : 'Friend request sent!');
        setTimeout(() => setActionSuccessNotice(null), 3000);
        setProfileData((prev) => (prev ? { ...prev, friendshipStatus: 'pending_sent' } : null));
      }
    } catch {}
    setRelationshipActionLoading(false);
  };

  const handleCancelFriendRequest = async () => {
    if (!token || !targetId) return;
    setRelationshipActionLoading(true);
    try {
      const res = await fetch(`/api/friends/cancel/${targetId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActionSuccessNotice(isBengali ? 'রিকোয়েস্ট বাতিল করা হয়েছে' : 'Request cancelled');
        setTimeout(() => setActionSuccessNotice(null), 3000);
        setProfileData((prev) => (prev ? { ...prev, friendshipStatus: 'none' } : null));
      }
    } catch {}
    setRelationshipActionLoading(false);
  };

  const handleAcceptFriendRequest = async () => {
    if (!token || !targetId) return;
    setRelationshipActionLoading(true);
    try {
      // Find requestId from incoming requests
      const reqRes = await fetch('/api/friends/requests/incoming', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (reqRes.ok) {
        const { requests } = await reqRes.json();
        const found = requests.find((r: any) => r.sender.id === targetId);
        if (found) {
          const accRes = await fetch(`/api/friends/accept/${found.requestId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (accRes.ok) {
            setActionSuccessNotice(isBengali ? 'রিকোয়েস্ট গ্রহণ করা হয়েছে! আপনারা এখন বন্ধু।' : 'Request accepted! You are now friends.');
            setTimeout(() => setActionSuccessNotice(null), 3000);
            setProfileData((prev) =>
              prev
                ? {
                    ...prev,
                    friendshipStatus: 'friends',
                    friendsCount: prev.friendsCount + 1,
                  }
                : null
            );
          }
        }
      }
    } catch {}
    setRelationshipActionLoading(false);
  };

  const handleUnfriend = async () => {
    if (!token || !targetId) return;
    if (!confirm(isBengali ? 'আপনি কি নিশ্চিতভাবে এই বন্ধুকে আনফ্রেন্ড করতে চান?' : 'Are you sure you want to unfriend this user?')) return;
    setRelationshipActionLoading(true);
    try {
      const res = await fetch(`/api/friends/remove/${targetId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActionSuccessNotice(isBengali ? 'বন্ধু তালিকা থেকে সরানো হয়েছে' : 'Friend removed');
        setTimeout(() => setActionSuccessNotice(null), 3000);
        setProfileData((prev) =>
          prev
            ? {
                ...prev,
                friendshipStatus: 'none',
                friendsCount: Math.max(0, prev.friendsCount - 1),
              }
            : null
        );
      }
    } catch {}
    setRelationshipActionLoading(false);
  };

  const handleToggleFollow = async () => {
    if (!token) {
      onOpenAuth('login');
      return;
    }
    if (!targetId) return;
    try {
      const res = await fetch(`/api/users/${targetId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { isFollowing } = await res.json();
        setProfileData((prev) =>
          prev
            ? {
                ...prev,
                isFollowing,
                user: {
                  ...prev.user,
                  followersCount: isFollowing
                    ? prev.user.followersCount + 1
                    : Math.max(0, prev.user.followersCount - 1),
                },
              }
            : null
        );
      }
    } catch {}
  };

  const displayUser = isOwnProfile
    ? user || {
        id: 'guest',
        username: 'guest_user',
        displayName: isBengali ? 'অতিথি ব্যবহারকারী' : 'Guest Explorer',
        avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
        bannerUrl: undefined,
        bio: isBengali
          ? 'Zan-Gi সোশ্যাল ইউনিভার্সে স্বাগতম। কানেক্ট · ক্রিয়েট · ইমাজিন · আর্ন।'
          : 'Welcome to Zan-Gi AI Social Universe. Connect · Create · Imagine · Earn.',
        isVerified: false,
        followersCount: 0,
        followingCount: 0,
        creatorCoins: 0,
        role: 'user' as const,
        profileVisitsCount: 0,
      }
    : profileData?.user || {
        id: viewingUserId || 'user',
        username: 'user',
        displayName: 'Loading...',
        avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
        bio: '',
        isVerified: false,
        followersCount: 0,
        followingCount: 0,
        creatorCoins: 0,
        role: 'user' as const,
        profileVisitsCount: 0,
      };

  const displayedPosts = isOwnProfile
    ? posts.filter(
        (p) =>
          (user && (p.author.id === user.id || p.author.username === user.username)) ||
          (!user && p.author.id === 'user_fahim')
      )
    : profileData?.posts || [];

  // Extract photos from posts
  const displayedPhotos: Array<{ url: string; postId: string; caption: string; post?: Post }> = isOwnProfile
    ? displayedPosts.flatMap((p) => {
        const rawUrls = Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0
          ? p.mediaUrls
          : p.mediaUrl
          ? [p.mediaUrl]
          : [];
        const urls = rawUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
        return urls
          .filter((u) => {
            const clean = (u || '').toLowerCase().split('?')[0];
            return clean.match(/\.(png|jpe?g|webp|gif|svg)$/i) || (!clean.includes('.mp4') && !clean.includes('.webm') && !clean.includes('/videos/'));
          })
          .map((u) => ({ url: u, postId: p.id, caption: p.content, post: p }));
      })
    : (profileData?.photos || [])
        .filter((ph) => ph && typeof ph.url === 'string' && ph.url.trim().length > 0)
        .map((ph) => {
          const foundPost = displayedPosts.find((p) => p.id === ph.postId);
          return { ...ph, post: foundPost };
        });

  const displayedReels = isOwnProfile
    ? displayedPosts.filter((p) => p.postType === 'short_video')
    : profileData?.reels || [];

  const friendsCount = isOwnProfile ? user?.creatorCoins !== undefined ? (profileData?.friendsCount || 0) : 0 : profileData?.friendsCount || 0;
  const visitsCount = isOwnProfile ? user?.profileVisitsCount || 0 : profileData?.profileVisitsCount || 0;

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await verifyEmail(verifyCode);
    if (res.success) {
      setVerifyMessage(isBengali ? 'ইমেইল সফলভাবে যাচাই করা হয়েছে! ✓' : 'Email successfully verified! ✓');
      setShowVerifyInput(false);
    } else {
      setVerifyMessage(res.error || 'Verification failed');
    }
  };

  return (
    <div
      className={`flex-1 overflow-y-auto overflow-x-hidden pb-12 select-none w-full transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Lightbox Full Screen Photo Viewer */}
      {activePhotoViewer && (
        <FullScreenPhotoViewer
          photos={activePhotoViewer.photos}
          initialIndex={activePhotoViewer.index}
          post={activePhotoViewer.post}
          isBengali={isBengali}
          onClose={() => setActivePhotoViewer(null)}
        />
      )}

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            loadProfile();
          }}
          isBengali={isBengali}
        />
      )}

      {/* Cover Banner Area (Real Persistent Banner) */}
      <div className="relative h-40 sm:h-48 w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 overflow-hidden">
        {Boolean(displayUser.bannerUrl && displayUser.bannerUrl.trim()) ? (
          <img
            src={displayUser.bannerUrl}
            alt="Cover Banner"
            className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => {
              if (displayUser.bannerUrl) {
                setActivePhotoViewer({ photos: [displayUser.bannerUrl], index: 0 });
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-violet-950 flex items-center justify-between px-6 opacity-90">
            <div className="space-y-1">
              <span className="text-xl sm:text-2xl font-black text-white/90 tracking-tight">
                {displayUser.displayName}
              </span>
              <p className="text-xs text-white/60">Zan-Gi • Connect • Create • Imagine • Earn</p>
            </div>
            <Sparkles className="w-8 h-8 text-cyan-400/40" />
          </div>
        )}

        {/* Back Button if viewing other profile */}
        {!isOwnProfile && onBackToFeed && (
          <button
            type="button"
            onClick={onBackToFeed}
            className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 transition-all flex items-center gap-1.5 z-10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isBengali ? 'ফিরে যান' : 'Back'}</span>
          </button>
        )}

        {/* Change Banner Button (for owner) */}
        {isOwnProfile && isAuthenticated && (
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isBengali ? 'কভার ফটো পরিবর্তন' : 'Edit Cover'}</span>
          </button>
        )}
      </div>

      {/* Main Profile Info Section */}
      <div className="px-4 sm:px-6 space-y-4">
        {/* Avatar positioned over Banner edge */}
        <div className="flex items-end justify-between -mt-14 sm:-mt-16 mb-2">
          <div className="relative group">
            <img
              src={(displayUser.avatarUrl && displayUser.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
              alt={displayUser.displayName}
              onClick={() => {
                if (displayUser.avatarUrl) {
                  setActivePhotoViewer({ photos: [displayUser.avatarUrl], index: 0 });
                }
              }}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 shadow-xl ring-2 ring-cyan-500/30 cursor-pointer ${
                isDark ? 'border-slate-950 bg-slate-900' : 'border-white bg-slate-100'
              }`}
            />
            {isOwnProfile && isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-blue-600 to-cyan-500 hover:opacity-95 text-white rounded-xl p-2 border-2 border-slate-900 shadow-md transition-opacity"
                title="Change Avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-2 pb-1">
            {isOwnProfile ? (
              <>
                {onOpenScheduled && (
                  <button
                    onClick={onOpenScheduled}
                    className={`p-2.5 rounded-2xl border transition-all ${
                      isDark
                        ? 'border-slate-800 bg-slate-900/80 text-cyan-400 hover:border-cyan-500/50'
                        : 'border-slate-200 bg-white text-blue-600 hover:bg-slate-100'
                    }`}
                    title="View Scheduled Posts"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onOpenSettings}
                  className={`p-2.5 rounded-2xl border transition-all ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Settings & Privacy"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {isAuthenticated ? (
                  <button
                    onClick={logout}
                    className={`p-2.5 rounded-2xl border transition-all ${
                      isDark
                        ? 'border-rose-900/50 bg-rose-950/30 text-rose-400 hover:bg-rose-950/60'
                        : 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
                    }`}
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    {isBengali ? 'লগইন' : 'Sign In'}
                  </button>
                )}
              </>
            ) : (
              // Actions when viewing another user's profile
              <div className="flex items-center gap-2">
                {onStartMessage && (
                  <button
                    onClick={() => onStartMessage(displayUser.id)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 hover:opacity-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{isBengali ? 'মেসেজ' : 'Message'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* User Badges & Identity */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-lg sm:text-xl tracking-tight">
              {displayUser.displayName}
            </h3>
            {displayUser.isVerified && (
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            )}
            {displayUser.role === 'owner' ? (
              <span className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                👑 {isBengali ? 'প্ল্যাটফর্ম ওনার' : 'Platform Owner'}
              </span>
            ) : displayUser.role === 'creator' ? (
              <span className="text-[10px] bg-violet-500/20 text-violet-300 font-bold px-2.5 py-0.5 rounded-full border border-violet-500/30">
                🎨 {isBengali ? 'ভেরিফাইড ক্রিয়েটর' : 'Verified Creator'}
              </span>
            ) : (
              <span className="text-[10px] bg-blue-500/10 text-cyan-400 font-bold px-2 py-0.5 rounded-full border border-cyan-500/20">
                {isAuthenticated ? (isBengali ? 'সদস্য' : 'Community Member') : (isBengali ? 'অতিথি' : 'Guest')}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-medium">@{displayUser.username}</p>
        </div>

        {/* Relationship Action Bar when viewing another user */}
        {!isOwnProfile && (
          <div className="p-3 rounded-2xl border bg-slate-900/50 border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {profileData?.friendshipStatus === 'none' && (
                <button
                  type="button"
                  disabled={relationshipActionLoading}
                  onClick={handleSendFriendRequest}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 hover:opacity-95 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isBengali ? 'ফ্রেন্ড রিকোয়েস্ট পাঠান' : 'Add Friend'}</span>
                </button>
              )}

              {profileData?.friendshipStatus === 'pending_sent' && (
                <button
                  type="button"
                  disabled={relationshipActionLoading}
                  onClick={handleCancelFriendRequest}
                  className="flex-1 py-2 px-3 bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-700 disabled:opacity-50"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{isBengali ? 'রিকোয়েস্ট বাতিল করুন' : 'Cancel Request'}</span>
                </button>
              )}

              {profileData?.friendshipStatus === 'pending_received' && (
                <div className="flex-1 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={relationshipActionLoading}
                    onClick={handleAcceptFriendRequest}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 hover:opacity-95 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isBengali ? 'গ্রহণ করুন' : 'Accept Request'}</span>
                  </button>
                </div>
              )}

              {profileData?.friendshipStatus === 'friends' && (
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 py-2 px-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    <span>{isBengali ? 'বন্ধু ✓' : 'Friends ✓'}</span>
                  </div>
                  <button
                    type="button"
                    disabled={relationshipActionLoading}
                    onClick={handleUnfriend}
                    className="py-2 px-3 bg-slate-800 text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 font-bold text-xs rounded-xl flex items-center gap-1"
                    title="Unfriend"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>{isBengali ? 'আনফ্রেন্ড' : 'Unfriend'}</span>
                  </button>
                </div>
              )}

              {/* Follow Button */}
              <button
                type="button"
                onClick={handleToggleFollow}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  profileData?.isFollowing
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                }`}
              >
                <span>{profileData?.isFollowing ? (isBengali ? 'ফলোয়িং' : 'Following') : (isBengali ? 'ফলো করুন' : 'Follow')}</span>
              </button>
            </div>

            {/* Notice */}
            {actionSuccessNotice && (
              <p className="text-[11px] text-cyan-400 font-bold text-center animate-in fade-in">
                {actionSuccessNotice}
              </p>
            )}

            {/* Mutual Friends snippet */}
            {profileData && profileData.mutualCount > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                <div className="flex -space-x-2">
                  {profileData.mutualFriends.slice(0, 3).map((mf) => (
                    <img
                      key={mf.id}
                      src={mf.avatarUrl || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover border border-slate-900"
                    />
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {profileData.mutualCount} {isBengali ? 'জন মিউচুয়াল বন্ধু' : 'mutual friends'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bio */}
        {displayUser.bio && (
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-medium">
            {displayUser.bio}
          </p>
        )}

        {/* Email Verification Banner */}
        {isOwnProfile && isAuthenticated && user && !user.isEmailVerified && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{isBengali ? 'ইমেইল যাচাইকরণ প্রয়োজন' : 'Email Verification Required'}</span>
              </div>
              <button
                onClick={() => setShowVerifyInput(!showVerifyInput)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline"
              >
                {showVerifyInput ? (isBengali ? 'বন্ধ করুন' : 'Cancel') : (isBengali ? 'কোড দিন' : 'Verify Now')}
              </button>
            </div>
            {showVerifyInput && (
              <form onSubmit={handleVerifySubmit} className="flex gap-2 pt-1">
                <input
                  type="text"
                  required
                  placeholder={isBengali ? '৬ ডিজিটের কোড' : '6-digit code'}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-amber-500/40 rounded-xl text-xs font-mono text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs"
                >
                  {isBengali ? 'যাচাই' : 'Verify'}
                </button>
              </form>
            )}
            {verifyMessage && (
              <p className="text-[11px] text-amber-300 font-semibold">{verifyMessage}</p>
            )}
          </div>
        )}

        {/* Accurate Stats Row (Distinct Friends, Followers, Following, Posts & Profile Visits) */}
        <div className="grid grid-cols-4 gap-2 py-3 px-3 rounded-2xl border bg-slate-900/40 border-slate-800 text-center">
          <div
            onClick={isOwnProfile && onOpenFriends ? onOpenFriends : () => setActiveTab('friends')}
            className="cursor-pointer group"
          >
            <span className="font-black text-sm text-cyan-400 block group-hover:underline">
              {friendsCount}
            </span>
            <span className="text-[10px] text-slate-400">
              {isBengali ? 'বন্ধু' : 'Friends'}
            </span>
          </div>

          <div>
            <span className="font-black text-sm block">
              {(displayUser.followersCount / 1000).toFixed(1)}K
            </span>
            <span className="text-[10px] text-slate-400">
              {isBengali ? 'অনুসারী' : 'Followers'}
            </span>
          </div>

          <div>
            <span className="font-black text-sm block">{displayUser.followingCount}</span>
            <span className="text-[10px] text-slate-400">
              {isBengali ? 'অনুসরণ' : 'Following'}
            </span>
          </div>

          <div>
            <span className="font-black text-sm text-indigo-400 block flex items-center justify-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{visitsCount}</span>
            </span>
            <span className="text-[10px] text-slate-400">
              {isBengali ? 'প্রোফাইল ভিজিট' : 'Visits'}
            </span>
          </div>
        </div>

        {/* Edit Profile CTA Button (for owner) */}
        {isOwnProfile && isAuthenticated && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isBengali ? 'প্রোফাইল ও মিডিয়া সম্পাদনা' : 'Edit Profile & Media'}</span>
          </button>
        )}

        {/* 5 Organized Profile Tabs (Posts, Photos, Reels, Friends, About) */}
        <div className="flex items-center justify-between border-b border-slate-800 text-xs font-bold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'posts'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>{isBengali ? 'পোস্ট' : 'Posts'} ({displayedPosts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'photos'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{isBengali ? 'ছবি' : 'Photos'} ({displayedPhotos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reels')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'reels'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>{isBengali ? 'রিলস' : 'Reels'} ({displayedReels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'friends'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isBengali ? 'বন্ধু' : 'Friends'} ({friendsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'about'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isBengali ? 'পরিচিতি' : 'About'}</span>
          </button>
        </div>

        {/* Tab 1: POSTS */}
        {activeTab === 'posts' && (
          <div className="space-y-3.5">
            {displayedPosts.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl space-y-2">
                <Grid3X3 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  {isBengali ? 'এখনও কোনো পোস্ট প্রকাশ করা হয়নি।' : 'No posts shared yet.'}
                </p>
              </div>
            ) : (
              displayedPosts.map((p) => {
                const rawItems = Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0 ? p.mediaUrls : p.mediaUrl ? [p.mediaUrl] : [];
                const mediaItems = rawItems.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
                return (
                  <article
                    key={p.id}
                    className="p-4 rounded-3xl border bg-slate-900/60 border-slate-800 space-y-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.author.avatarUrl || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div>
                          <span className="text-xs font-bold block">{p.author.displayName}</span>
                          <span className="text-[10px] text-slate-400">{p.timestamp}</span>
                        </div>
                      </div>
                      {p.audience && (
                        <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                          {p.audience === 'public' ? '🌐 Public' : p.audience === 'friends' ? '👥 Friends' : '🔒 Only Me'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed whitespace-pre-line font-normal">{p.content}</p>

                    {/* Multi-Photo Grid */}
                    {mediaItems.length > 0 && (
                      <div
                        className={`rounded-2xl overflow-hidden border border-slate-800 cursor-pointer ${
                          mediaItems.length === 1
                            ? 'aspect-video'
                            : mediaItems.length === 2
                            ? 'grid grid-cols-2 gap-1'
                            : 'grid grid-cols-2 gap-1'
                        }`}
                        onClick={() => setActivePhotoViewer({ photos: mediaItems, index: 0, post: p })}
                      >
                        {mediaItems.slice(0, 4).map((mUrl, idx) => {
                          const isFourthAndMore = idx === 3 && mediaItems.length > 4;
                          return (
                            <div key={idx} className="relative aspect-square bg-black">
                              <img src={mUrl} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                              {isFourthAndMore && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-black text-base">
                                  +{mediaItems.length - 3}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Post Stats */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                          <span>{p.likesCount}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{p.commentsCount}</span>
                        </span>
                      </div>
                      {p.viewsCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{p.viewsCount} views</span>
                        </span>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: PHOTOS */}
        {activeTab === 'photos' && (
          <div>
            {displayedPhotos.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl space-y-2">
                <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  {isBengali ? 'এখনও কোনো ছবি আপলোড করা হয়নি।' : 'No photos uploaded yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {displayedPhotos.map((ph, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer group relative"
                    onClick={() =>
                      setActivePhotoViewer({
                        photos: displayedPhotos.map((item) => item.url),
                        index: idx,
                        post: ph.post,
                      })
                    }
                  >
                    <img src={ph.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: REELS */}
        {activeTab === 'reels' && (
          <div>
            {displayedReels.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl space-y-2">
                <Film className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  {isBengali ? 'এখনও কোনো রিলস বা শর্ট ভিডিও তৈরি করা হয়নি।' : 'No reels created yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {displayedReels.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    className="aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-slate-800 relative group"
                  >
                    <video src={(r as any).videoUrl || (r as any).mediaUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-3 text-white">
                      <div className="self-end p-1 rounded-full bg-black/60">
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <div>
                        <p className="text-xs font-bold line-clamp-1">{(r as any).caption || (r as any).content || 'Reel'}</p>
                        <span className="text-[10px] text-slate-300">{(r as any).likesCount || 0} likes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: FRIENDS */}
        {activeTab === 'friends' && (
          <div className="space-y-2">
            {profileData && profileData.mutualFriends.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 block">
                  {isBengali ? 'মিউচুয়াল বন্ধুরা:' : 'Mutual Friends:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {profileData.mutualFriends.map((mf) => (
                    <div
                      key={mf.id}
                      onClick={() => onViewProfile && onViewProfile(mf.id)}
                      className="p-3 rounded-2xl border bg-slate-900/60 border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={mf.avatarUrl || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <span className="text-xs font-bold block">{mf.displayName}</span>
                          <span className="text-[10px] text-slate-400">@{mf.username}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-bold px-2 py-1 rounded-lg bg-cyan-500/10">
                        {isBengali ? 'প্রোফাইল' : 'View'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  {isBengali ? 'বন্ধু তালিকা পরিচালনা করতে ফ্রেন্ডস সেকশনে যান।' : 'View and manage connections in Friends Hub.'}
                </p>
                {onOpenFriends && (
                  <button
                    onClick={onOpenFriends}
                    className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold"
                  >
                    {isBengali ? 'ফ্রেন্ডস হাবে যান' : 'Go to Friends Hub'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: ABOUT */}
        {activeTab === 'about' && (
          <div className="p-4 rounded-3xl border bg-slate-900/60 border-slate-800 space-y-3 text-xs">
            <h4 className="font-bold text-sm text-cyan-400">{isBengali ? 'ব্যবহারকারীর তথ্য' : 'About User'}</h4>
            <div className="space-y-2 text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">{isBengali ? 'ইউজারনেম' : 'Username'}</span>
                <span className="font-mono">@{displayUser.username}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">{isBengali ? 'ভেরিফিকেশন' : 'Verified Badge'}</span>
                <span>{displayUser.isVerified ? '✓ Verified Creator' : 'Standard Member'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">{isBengali ? 'রোল' : 'Role'}</span>
                <span className="uppercase font-bold text-cyan-300">{displayUser.role || 'User'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">{isBengali ? 'প্রোফাইল ভিউ' : 'Profile Visits'}</span>
                <span className="font-bold">{visitsCount}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">{isBengali ? 'নিরাপত্তা' : 'Security'}</span>
                <span className="text-emerald-400 font-semibold">Protected by Zan-Gi Social Protocol</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
