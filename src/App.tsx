/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Home,
  PlaySquare,
  PlusSquare,
  Sparkles,
  User as UserIcon,
  MessageCircle,
  Search,
  Bell,
  Settings,
  Code2,
  X,
  Languages,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LogIn,
  ChevronRight,
  Moon,
  Sun,
  Calendar,
  MoreHorizontal,
  TrendingUp,
  DollarSign,
  Users,
  ShieldAlert,
  Crown,
  Menu as MenuIcon
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { HomeScreenView } from './components/screens/HomeScreenView';
import { ReelsView } from './components/screens/ReelsView';
import { AiAssistantView } from './components/screens/AiAssistantView';
import { ExploreView } from './components/screens/ExploreView';
import { CreateView } from './components/screens/CreateView';
import { MessagesView } from './components/screens/MessagesView';
import { ProfileView } from './components/screens/ProfileView';
import { SettingsView } from './components/screens/SettingsView';
import { MonetizationView } from './components/screens/MonetizationView';
import { PremiumView } from './components/screens/PremiumView';
import { AdminPanelView } from './components/screens/AdminPanelView';
import { FriendsView } from './components/screens/FriendsView';
import { InterstitialAdModal } from './components/modals/InterstitialAdModal';
import { RewardedAdModal } from './components/modals/RewardedAdModal';
import { CommentsSheet } from './components/modals/CommentsSheet';
import { AuthModal } from './components/modals/AuthModal';
import { ScheduledPostsModal } from './components/modals/ScheduledPostsModal';
import { CommunityStandardsModal } from './components/modals/CommunityStandardsModal';
import { SourceInspector } from './components/SourceInspector';
import { BackendArchitecture } from './components/BackendArchitecture';
import {
  CURRENT_USER,
  INITIAL_POSTS,
  INITIAL_STORIES,
  DEFAULT_AD_CONFIG
} from './data/mockData';
import { Post, AdConfiguration, Story, NotificationItem } from './types';

type AppScreen =
  | 'feed'
  | 'reels'
  | 'create'
  | 'ai'
  | 'profile'
  | 'explore'
  | 'messages'
  | 'settings'
  | 'monetization'
  | 'premium'
  | 'admin'
  | 'friends';

function MainAppLayout() {
  const { user, token, isAuthenticated, refreshUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Primary Navigation State
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('feed');
  const [previousScreen, setPreviousScreen] = useState<AppScreen>('feed');
  const [selectedPartnerUserId, setSelectedPartnerUserId] = useState<string | null>(null);

  const navigateToScreen = (screen: AppScreen) => {
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
  };

  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [adConfig, setAdConfig] = useState<AdConfiguration>(DEFAULT_AD_CONFIG);
  const [creatorCoins, setCreatorCoins] = useState(user?.creatorCoins || 0);
  const [isBengali, setIsBengali] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Sync creator coins with authenticated user profile
  React.useEffect(() => {
    if (user?.creatorCoins !== undefined) {
      setCreatorCoins(user.creatorCoins);
    }
  }, [user?.creatorCoins]);

  // Sync incoming friend requests count
  React.useEffect(() => {
    if (!token) {
      setPendingRequestsCount(0);
      return;
    }
    fetch('/api/friends/summary', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.incomingCount === 'number') {
          setPendingRequestsCount(data.incomingCount);
        }
      })
      .catch(() => {});
  }, [token, currentScreen]);

  // Synchronize ad configuration from backend
  React.useEffect(() => {
    fetch('/api/ads/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAdConfig((prev) => ({
            ...prev,
            adsEnabled: data.adsEnabled ?? prev.adsEnabled,
            bannerAdUnitId: data.bannerAdUnitId || prev.bannerAdUnitId,
            interstitialAdUnitId: data.interstitialAdUnitId || prev.interstitialAdUnitId,
            rewardedAdUnitId: data.rewardedAdUnitId || prev.rewardedAdUnitId,
            nativeAdUnitId: data.nativeAdUnitId || prev.nativeAdUnitId,
            isTestMode: data.isTestMode ?? prev.isTestMode,
            creatorRevenueSharePercentage: data.creatorRevSharePercent || 70,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Overlays & Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isScheduledModalOpen, setIsScheduledModalOpen] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [isInterstitialOpen, setIsInterstitialOpen] = useState(false);
  const [isRewardedOpen, setIsRewardedOpen] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCodeInspector, setShowCodeInspector] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'source' | 'backend'>('source');
  const [rewardToast, setRewardToast] = useState<string | null>(null);

  // Load persistent posts from backend
  const loadPosts = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/posts', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.posts && Array.isArray(data.posts)) {
          setPosts(data.posts);
        }
      }
    } catch (e) {
      console.warn('Failed to load posts from server:', e);
    }
  };

  // Load persistent stories from backend
  const loadStories = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/stories', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.stories && Array.isArray(data.stories) && data.stories.length > 0) {
          setStories(data.stories);
        }
      }
    } catch (e) {
      console.warn('Failed to load stories from server:', e);
    }
  };

  // Load real notifications from backend
  const loadNotifications = async () => {
    if (!token) {
      setNotifications([]);
      return;
    }
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      }
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    if (!token) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
    fetch(`/api/notifications/${notifId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!token) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  React.useEffect(() => {
    loadPosts();
    loadStories();
    loadNotifications();
  }, [token]);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLike = async (postId: string) => {
    if (!token) {
      handleOpenAuth('login');
      return;
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const newLiked = !p.isLiked;
          return {
            ...p,
            isLiked: newLiked,
            likesCount: newLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          };
        }
        return p;
      })
    );

    try {
      await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.warn('Like failed:', e);
    }
  };

  const handleBookmark = async (postId: string) => {
    if (!token) {
      handleOpenAuth('login');
      return;
    }

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p))
    );

    try {
      await fetch(`/api/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.warn('Bookmark failed:', e);
    }
  };

  const handleAddComment = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      )
    );
    loadPosts();
  };

  const handlePostCreated = (createdPost: any) => {
    if (createdPost && createdPost.id) {
      setPosts((prev) => [createdPost, ...prev.filter((p) => p.id !== createdPost.id)]);
    } else {
      loadPosts();
    }
    setCurrentScreen('feed');

    if (adConfig.adsEnabled && Math.random() > 0.6) {
      setTimeout(() => setIsInterstitialOpen(true), 600);
    }
  };

  const handleRewardClaimed = (coins: number) => {
    setCreatorCoins((prev) => prev + coins);
    setRewardToast(`🎉 +${coins} Zan-Gi Coins credited and verified on server!`);
    setTimeout(() => setRewardToast(null), 3500);
    refreshUser();
  };


  interface BottomTabItem {
    id: AppScreen;
    labelBn: string;
    labelEn: string;
    icon: any;
    isCenter?: boolean;
    hasBadge?: boolean;
  }

  // Approved Deduplicated Bottom Navigation: Home, Reels, Create (Center), AI Assistant, Messages, Profile
  // Resolved: Feed, Reels, and Create exist exclusively in the lower/bottom area. AI Assistant moved to lower area.
  const bottomTabs: BottomTabItem[] = [
    { id: 'feed', labelBn: 'হোম', labelEn: 'Home', icon: Home },
    { id: 'reels', labelBn: 'রিলস', labelEn: 'Reels', icon: PlaySquare },
    { id: 'create', labelBn: 'পোস্ট', labelEn: 'Create', icon: PlusSquare, isCenter: true },
    { id: 'ai', labelBn: 'এআই', labelEn: 'AI', icon: Sparkles },
    { id: 'messages', labelBn: 'মেসেজ', labelEn: 'Messages', icon: MessageCircle, hasBadge: true },
    { id: 'profile', labelBn: 'প্রোফাইল', labelEn: 'Profile', icon: UserIcon },
  ];

  const isUserAdmin = isAuthenticated && user && (user.role === 'admin' || user.role === 'owner');

  return (
    <div
      className={`h-screen h-dvh font-sans antialiased flex flex-col items-center justify-center overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Edge-to-Edge Native Mobile App Container */}
      <div
        className={`w-full max-w-xl h-full flex flex-col relative overflow-hidden transition-colors duration-300 md:border-x ${
          isDark
            ? 'bg-slate-950 md:border-slate-800/80 shadow-2xl shadow-black/60'
            : 'bg-white md:border-slate-200/80 shadow-xs'
        }`}
      >
        {/* Reward Notification Toast */}
        {rewardToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 px-4 py-2 rounded-2xl text-xs font-black shadow-2xl animate-in slide-in-from-top-4 duration-200 border border-amber-300">
            {rewardToast}
          </div>
        )}

        {/* TOP APP BAR (Deduplicated single header: Brand + Utilities + More Menu) */}
        {currentScreen !== 'settings' && currentScreen !== 'admin' && (
          <header
            className={`sticky top-0 z-30 backdrop-blur-xl border-b flex flex-col shrink-0 select-none transition-colors ${
              isDark ? 'bg-slate-950/90 border-slate-800/80' : 'bg-white/95 border-slate-100'
            }`}
          >
            <div className="px-3.5 h-14 flex items-center justify-between relative">
              {/* Left Brand Lockup */}
              <div
                onClick={() => setCurrentScreen('feed')}
                className="cursor-pointer flex items-center gap-2 group"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-600/30 font-black text-sm">
                  Z
                </div>
                <div>
                  <span className="text-lg font-black tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent block leading-tight">
                    Zan-Gi
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold hidden sm:inline">
                    {isBengali ? 'কানেক্ট · ক্রিয়েট · ইমাজিন · আর্ন' : 'Connect · Create · Imagine · Earn'}
                  </span>
                </div>
              </div>

              {/* Right Utilities (Deduplicated: Theme, Language, Search, Notifications, More, Auth) */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-xl transition-all ${
                    isDark
                      ? 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
                  }`}
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                </button>

                {/* Language Toggle */}
                <button
                  onClick={() => setIsBengali(!isBengali)}
                  className={`p-2 rounded-xl transition-all ${
                    isDark
                      ? 'text-slate-400 hover:text-cyan-400 hover:bg-slate-900'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                  }`}
                  title={isBengali ? 'Switch to English' : 'বাংলায় দেখুন'}
                >
                  <Languages className="w-4 h-4" />
                </button>

                {/* Quick Search */}
                <button
                  onClick={() => navigateToScreen('explore')}
                  className={`p-2 rounded-xl transition-all ${
                    currentScreen === 'explore'
                      ? isDark ? 'text-cyan-400 bg-slate-900' : 'text-blue-600 bg-slate-100'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={isBengali ? 'অনুসন্ধান' : 'Search & Explore'}
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Visible Friends Entry (Top Utility Header) */}
                <button
                  onClick={() => navigateToScreen('friends')}
                  className={`p-2 rounded-xl transition-all relative ${
                    currentScreen === 'friends'
                      ? isDark ? 'text-cyan-400 bg-slate-900' : 'text-blue-600 bg-slate-100'
                      : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={isBengali ? 'বন্ধু ও রিকোয়েস্ট' : 'Friends & Requests'}
                >
                  <Users className="w-4 h-4" />
                  {pendingRequestsCount > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-cyan-400 text-slate-950 font-black text-[9px] flex items-center justify-center absolute -top-0.5 -right-0.5 ring-2 ring-slate-950 animate-pulse">
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </span>
                  )}
                </button>

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setShowMoreMenu(false);
                    }}
                    className={`p-2 rounded-xl transition-all relative ${
                      isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {notifications.some((n) => !n.isRead) && (
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 absolute top-1 right-1 ring-2 ring-slate-950 animate-pulse" />
                    )}
                  </button>

                  {/* Dropdown Sheet */}
                  {showNotifications && (
                    <div
                      className={`absolute right-0 top-11 w-80 rounded-3xl border shadow-2xl p-3 z-50 text-xs space-y-2 animate-in fade-in duration-150 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-cyan-950/20' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">
                            {isBengali ? 'বিজ্ঞপ্তি' : 'Notifications'}
                          </span>
                          {notifications.filter((n) => !n.isRead).length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                              {notifications.filter((n) => !n.isRead).length} new
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {notifications.some((n) => !n.isRead) && (
                            <button
                              onClick={handleMarkAllNotificationsRead}
                              className="text-[10px] text-cyan-400 hover:underline"
                            >
                              {isBengali ? 'সব পঠিত' : 'Mark all read'}
                            </button>
                          )}
                          <button
                            onClick={() => setShowNotifications(false)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs">
                            {isBengali ? 'কোনো নতুন বিজ্ঞপ্তি নেই' : 'No notifications yet'}
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => handleMarkNotificationRead(notif.id)}
                              className={`p-2.5 rounded-2xl cursor-pointer transition-colors space-y-0.5 border ${
                                !notif.isRead
                                  ? 'bg-cyan-950/40 border-cyan-800/50 text-slate-200'
                                  : 'bg-slate-800/40 border-slate-800/60 text-slate-400 hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p className={`font-semibold text-xs ${!notif.isRead ? 'text-cyan-300' : 'text-slate-300'}`}>
                                  {notif.title}
                                </p>
                                {!notif.isRead && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                )}
                              </div>
                              <p className="text-[11px] leading-snug">{notif.message}</p>
                              <p className="text-[9px] text-slate-500">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* More Platform Menu Dropdown Button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowMoreMenu(!showMoreMenu);
                      setShowNotifications(false);
                    }}
                    className={`p-2 rounded-xl transition-all ${
                      showMoreMenu
                        ? isDark ? 'bg-slate-800 text-cyan-400' : 'bg-slate-100 text-blue-600'
                        : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title={isBengali ? 'আরও মেনু' : 'Platform Menu'}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* More Dropdown Menu */}
                  {showMoreMenu && (
                    <div
                      className={`absolute right-0 top-11 w-72 rounded-3xl border shadow-2xl p-3.5 z-50 text-xs space-y-2 animate-in slide-in-from-top-2 duration-150 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-cyan-950/20' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                        <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">
                          {isBengali ? 'কন্ট্রোল ও প্ল্যাটফর্ম মেনু' : 'Controls & Platform Menu'}
                        </span>
                        <button
                          onClick={() => setShowMoreMenu(false)}
                          className="text-slate-400 hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Friends & People Discovery Link */}
                      <button
                        onClick={() => {
                          setCurrentScreen('friends');
                          setShowMoreMenu(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between font-semibold transition-colors ${
                          currentScreen === 'friends'
                            ? 'bg-blue-600/15 text-blue-300 border border-blue-500/30'
                            : isDark ? 'hover:bg-slate-800/60 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-cyan-400" />
                          <div>
                            <span className="block">{isBengali ? 'বন্ধু ও পিপল ডিসকভারি' : 'Friends & Discovery'}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {isBengali ? 'পারস্পরিক সংযোগ, রিকোয়েস্ট ও বন্ধু তালিকা' : 'Mutual connections, requests & friends'}
                            </span>
                          </div>
                        </div>
                        {pendingRequestsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-black text-[10px]">
                            {pendingRequestsCount} new
                          </span>
                        )}
                      </button>

                      {/* Creator Pulse / Monetization Hub Link */}
                      <button
                        onClick={() => {
                          setCurrentScreen('monetization');
                          setShowMoreMenu(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left flex items-center gap-2.5 font-semibold transition-colors ${
                          currentScreen === 'monetization'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : isDark ? 'hover:bg-slate-800/60 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="block">{isBengali ? 'ক্রিয়েটর পালস ও মনিটাইজেশন' : 'Creator Pulse & Monetization'}</span>
                          <span className="text-[10px] text-slate-400 block">{isBengali ? '৭০% রেভিনিউ শেয়ার, কয়েন ও পেআউট' : '70% revshare, bKash/Nagad/Rocket withdrawals'}</span>
                        </div>
                      </button>

                      {/* Creator Premium Club Link */}
                      <button
                        onClick={() => {
                          navigateToScreen('premium');
                          setShowMoreMenu(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left flex items-center gap-2.5 font-semibold transition-colors ${
                          currentScreen === 'premium'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : isDark ? 'hover:bg-slate-800/60 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <Crown className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="block">{isBengali ? 'ক্রিয়েটর প্রিমিয়াম ক্লাব' : 'Creator Premium Club'}</span>
                          <span className="text-[10px] text-slate-400 block">{isBengali ? 'কয়েন দিয়ে সাবস্ক্রিপশন ও অতিরিক্ত এআই সুবিধা' : 'Subscription plans, coin purchase & benefits'}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setIsScheduledModalOpen(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full p-2.5 rounded-xl text-left hover:bg-slate-800/60 flex items-center gap-2.5 font-semibold"
                      >
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <div>
                          <span className="block">{isBengali ? 'শিডিউলড পোস্ট স্টুডিও' : 'Scheduled Posts Studio'}</span>
                          <span className="text-[10px] text-slate-400 block">{isBengali ? 'স্বয়ংক্রিয় প্রকাশনা ও ক্যালেন্ডার' : 'Auto-publishing queue & calendar'}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowCommunityModal(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full p-2.5 rounded-xl text-left hover:bg-slate-800/60 flex items-center gap-2.5 font-semibold"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="block">{isBengali ? 'কমিউনিটি স্ট্যান্ডার্ড ও রুলস' : 'Community Standards & Rules'}</span>
                          <span className="text-[10px] text-slate-400 block">{isBengali ? 'প্ল্যাটফর্ম নীতিমালা ও আপিল প্রক্রিয়া' : 'Safety rules, monetization policy & appeals'}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowCodeInspector(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full p-2.5 rounded-xl text-left hover:bg-slate-800/60 flex items-center gap-2.5 font-semibold"
                      >
                        <Code2 className="w-4 h-4 text-indigo-400" />
                        <div>
                          <span className="block">{isBengali ? 'অ্যান্ড্রয়েড ও সোর্স ইন্সপেক্টর' : 'Android & Source Inspector'}</span>
                          <span className="text-[10px] text-slate-400 block">{isBengali ? 'Jetpack Compose কোড ও ব্যাকএন্ড' : 'Jetpack Compose Kotlin architecture'}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setCurrentScreen('settings');
                          setShowMoreMenu(false);
                        }}
                        className="w-full p-2.5 rounded-xl text-left hover:bg-slate-800/60 flex items-center gap-2.5 font-semibold"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="block">{isBengali ? 'সেটিংস ও প্রাইভেসি' : 'Settings & Privacy'}</span>
                          <span className="text-[10px] text-slate-400 block">{isBengali ? 'টু-ফ্যাক্টর, ব্লকিং ও ডাটা এক্সপোর্ট' : '2FA, blocking, session revocation & export'}</span>
                        </div>
                      </button>

                      {/* Admin Panel Link (Only if user has owner or admin role) */}
                      {isUserAdmin && (
                        <button
                          onClick={() => {
                            setCurrentScreen('admin');
                            setShowMoreMenu(false);
                          }}
                          className="w-full p-2.5 rounded-xl text-left bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/30 flex items-center gap-2.5 font-bold"
                        >
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                          <div>
                            <span className="block">{isBengali ? '👑 সিকিউর অ্যাডমিন প্যানেল' : '👑 Secure Admin Panel'}</span>
                            <span className="text-[10px] text-rose-300/80 block">{isBengali ? 'সিস্টেম হেলথ, অডিট ও পেআউট পর্যালোচনা' : 'RBAC moderation, revenue split & audit'}</span>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Auth Button / Profile Avatar */}
                {!isAuthenticated ? (
                  <button
                    onClick={() => handleOpenAuth('login')}
                    className="ml-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center gap-1"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isBengali ? 'লগইন' : 'Login'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentScreen('profile')}
                    className="ml-1 relative group"
                    title={`Signed in as @${user?.username}`}
                  >
                    <img
                      src={(user?.avatarUrl && user.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                      alt="avatar"
                      className="w-8 h-8 rounded-xl object-cover ring-2 ring-cyan-500/40 group-hover:ring-cyan-400 transition-all"
                    />
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        {/* MAIN VIEWPORT CONTENT */}
        <main className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {currentScreen === 'feed' && (
            <HomeScreenView
              posts={posts}
              stories={stories}
              adConfig={adConfig}
              isBengali={isBengali}
              onLike={handleLike}
              onBookmark={handleBookmark}
              onOpenComments={(post) => setActiveCommentPost(post)}
              onRefresh={loadPosts}
              onShowInterstitial={() => setIsInterstitialOpen(true)}
              onOpenCreate={() => navigateToScreen('create')}
              onSelectTag={() => navigateToScreen('explore')}
              onOpenScheduled={() => setIsScheduledModalOpen(true)}
              onOpenFriends={() => navigateToScreen('friends')}
              pendingRequestsCount={pendingRequestsCount}
            />
          )}

          {currentScreen === 'reels' && (
            <ReelsView
              isBengali={isBengali}
              onOpenComments={() => {
                const samplePost = posts[0];
                setActiveCommentPost(samplePost);
              }}
              onCoinTip={(amt) => {
                setCreatorCoins((prev) => Math.max(0, prev - amt));
                refreshUser();
              }}
            />
          )}

          {currentScreen === 'create' && (
            <CreateView
              isBengali={isBengali}
              onPostCreated={handlePostCreated}
              onCancel={() => setCurrentScreen('feed')}
              onViewScheduled={() => setIsScheduledModalOpen(true)}
            />
          )}

          {currentScreen === 'ai' && (
            <AiAssistantView
              isBengali={isBengali}
              onLanguageToggle={() => setIsBengali(!isBengali)}
            />
          )}

          {currentScreen === 'monetization' && (
            <MonetizationView
              isBengali={isBengali}
              onBack={() => setCurrentScreen('profile')}
              onOpenAuth={handleOpenAuth}
            />
          )}

          {currentScreen === 'premium' && (
            <PremiumView
              isBengali={isBengali}
              onBack={() => setCurrentScreen(previousScreen || 'feed')}
              onOpenAuth={handleOpenAuth}
            />
          )}

          {currentScreen === 'admin' && (
            <AdminPanelView
              isBengali={isBengali}
              onBack={() => setCurrentScreen('feed')}
              onOpenAuth={handleOpenAuth}
            />
          )}

          {currentScreen === 'profile' && (
            <ProfileView
              posts={posts}
              isBengali={isBengali}
              onOpenSettings={() => setCurrentScreen('settings')}
              onTriggerRewardedAd={() => setIsRewardedOpen(true)}
              creatorCoins={creatorCoins}
              onOpenAuth={handleOpenAuth}
              onOpenScheduled={() => setIsScheduledModalOpen(true)}
              onOpenMonetization={() => setCurrentScreen('monetization')}
              onOpenPremium={() => navigateToScreen('premium')}
              onOpenAdmin={() => setCurrentScreen('admin')}
              onOpenFriends={() => navigateToScreen('friends')}
            />
          )}

          {currentScreen === 'explore' && (
            <ExploreView
              isBengali={isBengali}
              onSelectTag={() => setCurrentScreen('feed')}
              onOpenFriends={() => navigateToScreen('friends')}
            />
          )}

          {currentScreen === 'friends' && (
            <FriendsView
              isBengali={isBengali}
              onBack={() => setCurrentScreen(previousScreen || 'feed')}
              onOpenMessages={(partnerUserId) => {
                setSelectedPartnerUserId(partnerUserId);
                setCurrentScreen('messages');
              }}
              onOpenProfile={() => setCurrentScreen('profile')}
            />
          )}

          {currentScreen === 'messages' && (
            <MessagesView
              isBengali={isBengali}
              preselectedPartnerId={selectedPartnerUserId}
              onBack={() => setCurrentScreen(previousScreen || 'feed')}
              onOpenFriends={() => navigateToScreen('friends')}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsView
              isBengali={isBengali}
              onLanguageToggle={() => setIsBengali(!isBengali)}
              adConfig={adConfig}
              onUpdateAdConfig={(patch) => setAdConfig({ ...adConfig, ...patch })}
              onResetPreferences={() => setPosts(INITIAL_POSTS)}
              onBack={() => setCurrentScreen('feed')}
              onOpenAdmin={() => setCurrentScreen('admin')}
            />
          )}
        </main>

        {/* BOTTOM NAVIGATION BAR (Phase 1 Approved Visual Reference: Home, Friends, Create, Reels, Messages, Menu) */}
        {currentScreen !== 'settings' && currentScreen !== 'admin' && (
          <nav
            className={`h-14 border-t flex items-center justify-around px-1 shrink-0 z-20 transition-colors backdrop-blur-xl ${
              isDark
                ? 'bg-slate-950/95 border-slate-800/80 text-slate-400'
                : 'bg-white/95 border-slate-200 text-slate-500'
            }`}
          >
            {bottomTabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = currentScreen === tab.id;

              if (tab.isCenter) {
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentScreen('create')}
                    className="flex flex-col items-center justify-center -mt-4 group relative"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                      <IconComponent className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] font-bold mt-0.5 text-slate-400 group-hover:text-cyan-400">
                      {isBengali ? tab.labelBn : tab.labelEn}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentScreen(tab.id as any)}
                  className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                    isActive
                      ? isDark
                        ? 'text-cyan-400 font-bold'
                        : 'text-blue-600 font-bold'
                      : 'hover:text-slate-200'
                  }`}
                >
                  <div className="relative">
                    <IconComponent
                      className={`w-5 h-5 transition-transform ${
                        isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.75]'
                      }`}
                    />
                    {tab.hasBadge && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 absolute -top-0.5 -right-0.5 ring-2 ring-slate-950 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5">
                    {isBengali ? tab.labelBn : tab.labelEn}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {/* ============================================================ */}
        {/* MODALS & OVERLAYS                                             */}
        {/* ============================================================ */}

        {/* Community Standards & Policy Modal */}
        <CommunityStandardsModal
          isOpen={showCommunityModal}
          onClose={() => setShowCommunityModal(false)}
          isBengali={isBengali}
        />

        {/* Scheduled Posts Management Sheet */}
        <ScheduledPostsModal
          isOpen={isScheduledModalOpen}
          onClose={() => setIsScheduledModalOpen(false)}
          isBengali={isBengali}
          onOpenCreate={() => {
            setIsScheduledModalOpen(false);
            setCurrentScreen('create');
          }}
        />

        {/* Auth Modal (Login / Register / 2FA / Recovery) */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          isBengali={isBengali}
          defaultMode={authModalMode}
        />

        {/* Comments Bottom Sheet */}
        {activeCommentPost && (
          <CommentsSheet
            post={activeCommentPost}
            currentUser={user || CURRENT_USER}
            onClose={() => setActiveCommentPost(null)}
            onAddComment={async (postId, text) => {
              await handleAddComment(postId);
            }}
          />
        )}

        {/* Interstitial Ad Simulation */}
        <InterstitialAdModal
          isOpen={isInterstitialOpen}
          onClose={() => setIsInterstitialOpen(false)}
          adUnitId={adConfig.interstitialAdUnitId}
        />

        {/* Rewarded Ad Modal */}
        <RewardedAdModal
          isOpen={isRewardedOpen}
          onClose={() => setIsRewardedOpen(false)}
          adUnitId={adConfig.rewardedAdUnitId}
          onRewardClaimed={handleRewardClaimed}
        />

        {/* Kotlin Native Source & Architecture Inspector */}
        {showCodeInspector && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div
              className={`rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div className="flex bg-slate-950 p-1 rounded-xl text-xs font-bold border border-slate-800">
                    <button
                      onClick={() => setInspectorTab('source')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        inspectorTab === 'source'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Kotlin Project Source
                    </button>
                    <button
                      onClick={() => setInspectorTab('backend')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        inspectorTab === 'backend'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Backend Readiness
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowCodeInspector(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[78vh]">
                {inspectorTab === 'source' ? <SourceInspector /> : <BackendArchitecture />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MainAppLayout />
      </ThemeProvider>
    </AuthProvider>
  );
}
