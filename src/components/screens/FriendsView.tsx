import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  ArrowLeft,
  Loader2,
  Clock,
  MessageCircle,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  FriendItem,
  FriendRequestItem,
  FriendSuggestionItem,
  FriendsSummary
} from '../../types';

interface FriendsViewProps {
  isBengali: boolean;
  onBack: () => void;
  onOpenMessages?: (userId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

type TabType = 'suggestions' | 'requests' | 'sent' | 'friends';

export const FriendsView: React.FC<FriendsViewProps> = ({
  isBengali,
  onBack,
  onOpenMessages,
  onOpenProfile,
}) => {
  const { user, token, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('suggestions');
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState<FriendsSummary>({
    friendsCount: 0,
    incomingCount: 0,
    sentCount: 0,
  });

  const [suggestions, setSuggestions] = useState<FriendSuggestionItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequestItem[]>([]);
  const [friendsList, setFriendsList] = useState<FriendItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Unfriend confirmation state
  const [unfriendConfirmTarget, setUnfriendConfirmTarget] = useState<FriendItem | null>(null);

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  // Fetch summary counts
  const fetchSummary = useCallback(() => {
    if (!token) return;
    fetch('/api/friends/summary', { headers: getHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch(() => {});
  }, [token, getHeaders]);

  // Fetch suggestions
  const fetchSuggestions = useCallback((query?: string) => {
    if (!token) return;
    setLoading(true);
    const url = query?.trim()
      ? `/api/friends/suggestions?q=${encodeURIComponent(query.trim())}`
      : '/api/friends/suggestions';

    fetch(url, { headers: getHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      })
      .catch((e) => setErrorMsg(e.message || 'Failed to load suggestions'))
      .finally(() => setLoading(false));
  }, [token, getHeaders]);

  // Fetch incoming requests
  const fetchIncoming = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/friends/requests/incoming', { headers: getHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.requests)) {
          setIncomingRequests(data.requests);
        }
      })
      .catch((e) => setErrorMsg(e.message || 'Failed to load incoming requests'))
      .finally(() => setLoading(false));
  }, [token, getHeaders]);

  // Fetch sent requests
  const fetchSent = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/friends/requests/sent', { headers: getHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.requests)) {
          setSentRequests(data.requests);
        }
      })
      .catch((e) => setErrorMsg(e.message || 'Failed to load sent requests'))
      .finally(() => setLoading(false));
  }, [token, getHeaders]);

  // Fetch all friends
  const fetchFriends = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/friends/list', { headers: getHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.friends)) {
          setFriendsList(data.friends);
        }
      })
      .catch((e) => setErrorMsg(e.message || 'Failed to load friends list'))
      .finally(() => setLoading(false));
  }, [token, getHeaders]);

  // Refresh tab data
  const refreshCurrentTab = useCallback(() => {
    fetchSummary();
    if (activeTab === 'suggestions') fetchSuggestions(searchQuery);
    else if (activeTab === 'requests') fetchIncoming();
    else if (activeTab === 'sent') fetchSent();
    else if (activeTab === 'friends') fetchFriends();
  }, [activeTab, searchQuery, fetchSummary, fetchSuggestions, fetchIncoming, fetchSent, fetchFriends]);

  useEffect(() => {
    refreshCurrentTab();
  }, [refreshCurrentTab]);

  // Debounced search for suggestions
  useEffect(() => {
    if (activeTab !== 'suggestions') return;
    const timer = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, fetchSuggestions]);

  // Toast auto-clear
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  // Action handlers
  const handleSendRequest = async (targetUserId: string) => {
    setActionLoadingId(targetUserId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/friends/request/${targetUserId}`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send friend request');
      }

      setSuccessMsg(
        isBengali
          ? data.status === 'friends'
            ? 'পারস্পরিক অনুরোধ গৃহীত! আপনারা এখন বন্ধু।'
            : 'ফ্রেন্ড রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে।'
          : data.status === 'friends'
          ? 'Reciprocal request accepted! You are now friends.'
          : 'Friend request sent successfully.'
      );

      // Update local item status in suggestions
      setSuggestions((prev) =>
        prev.map((item) =>
          item.user.id === targetUserId
            ? { ...item, status: data.status === 'friends' ? 'friends' : 'pending_sent' }
            : item
        )
      );
      fetchSummary();
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRequest = async (targetUserId: string) => {
    setActionLoadingId(targetUserId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/friends/request/${targetUserId}/cancel`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel request');
      }

      setSuccessMsg(isBengali ? 'অনুরোধ বাতিল করা হয়েছে।' : 'Friend request cancelled.');

      setSuggestions((prev) =>
        prev.map((item) =>
          item.user.id === targetUserId ? { ...item, status: 'none' } : item
        )
      );
      setSentRequests((prev) => prev.filter((r) => r.recipient?.id !== targetUserId));
      fetchSummary();
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (senderUserId: string) => {
    setActionLoadingId(senderUserId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/friends/request/${senderUserId}/accept`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept request');
      }

      setSuccessMsg(
        isBengali ? 'ফ্রেন্ড রিকোয়েস্ট গৃহীত হয়েছে! আপনারা এখন বন্ধু।' : 'Friend request accepted! You are now friends.'
      );

      setIncomingRequests((prev) => prev.filter((r) => r.sender?.id !== senderUserId));
      setSuggestions((prev) =>
        prev.map((item) =>
          item.user.id === senderUserId ? { ...item, status: 'friends' } : item
        )
      );
      fetchSummary();
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (senderUserId: string) => {
    setActionLoadingId(senderUserId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/friends/request/${senderUserId}/decline`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to decline request');
      }

      setSuccessMsg(isBengali ? 'অনুরোধ বাতিল করা হয়েছে।' : 'Friend request declined.');

      setIncomingRequests((prev) => prev.filter((r) => r.sender?.id !== senderUserId));
      setSuggestions((prev) =>
        prev.map((item) =>
          item.user.id === senderUserId ? { ...item, status: 'none' } : item
        )
      );
      fetchSummary();
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFriend = async (friendUserId: string) => {
    setActionLoadingId(friendUserId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/friends/${friendUserId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove friend');
      }

      setSuccessMsg(isBengali ? 'বন্ধু তালিকা থেকে সরানো হয়েছে।' : 'Friend removed successfully.');

      setFriendsList((prev) => prev.filter((f) => f.friend.id !== friendUserId));
      setSuggestions((prev) =>
        prev.map((item) =>
          item.user.id === friendUserId ? { ...item, status: 'none' } : item
        )
      );
      setUnfriendConfirmTarget(null);
      fetchSummary();
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered friends list for tab 'friends'
  const filteredFriends = friendsList.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      f.friend.displayName.toLowerCase().includes(q) ||
      f.friend.username.toLowerCase().includes(q) ||
      (f.friend.bio && f.friend.bio.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className={`flex-1 overflow-y-auto overflow-x-hidden p-3.5 pb-8 space-y-4 select-none w-full transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Toast Notifications */}
      {successMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-1.5 animate-in slide-in-from-top-2 border border-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-1.5 animate-in slide-in-from-top-2 border border-rose-400">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Screen Top Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/40">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-black tracking-tight text-white">
                {isBengali ? 'বন্ধু ও পিপল ডিসকভারি' : 'Friends & Discovery'}
              </h2>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {isBengali
                ? 'ফেসবুক-স্টাইল পারস্পরিক বিশ্বস্ত সংযোগ (ফলোয়ারদের চেয়ে স্বতন্ত্র)'
                : 'Reciprocal mutual connections (distinct from one-way followers)'}
            </p>
          </div>
        </div>

        {/* Total Friends Quick Pill */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-bold text-xs">
          <span>{summary.friendsCount}</span>
          <span className="text-[10px] font-normal text-cyan-400">
            {isBengali ? 'বন্ধু' : 'friends'}
          </span>
        </div>
      </div>

      {/* Distinction Highlight Card */}
      <div
        className={`p-3 rounded-2xl border text-xs space-y-1 ${
          isDark
            ? 'bg-slate-900/60 border-slate-800/80 text-slate-300'
            : 'bg-white border-slate-200 text-slate-700 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold text-cyan-400 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isBengali ? 'Zan-Gi সামাজিক সম্পর্কের নিয়ম' : 'Zan-Gi Friendship vs Follow Rules'}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          {isBengali
            ? '🤝 ফ্রেন্ডশিপ হচ্ছে দ্বিপাক্ষিক অনুমোদনযুক্ত সম্পর্ক (দুজনেই সম্মতি দেন)। অন্যদিকে ফলোয়ার হচ্ছে একপাক্ষিক পাবলিক কন্টেন্ট ফিড সাবস্ক্রিপশন।'
            : '🤝 Friendships require mutual consent from both creators. In contrast, Followers represent one-way public feed interest.'}
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-slate-800/80">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'suggestions'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isBengali ? 'পিপল ডিসকভারি' : 'Find Friends'}
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center relative ${
            activeTab === 'requests'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>{isBengali ? 'অনুরোধ' : 'Requests'}</span>
          {summary.incomingCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 font-black text-[9px]">
              {summary.incomingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'sent'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>{isBengali ? 'পাঠানো' : 'Sent'}</span>
          {summary.sentCount > 0 && (
            <span className="ml-1 text-[10px] text-slate-400">({summary.sentCount})</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'friends'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>{isBengali ? 'সকল বন্ধু' : 'All Friends'}</span>
          <span className="ml-1 text-[10px] text-cyan-400 font-mono">({summary.friendsCount})</span>
        </button>
      </div>

      {/* Search Input for Suggestions or Friends */}
      {(activeTab === 'suggestions' || activeTab === 'friends') && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'suggestions'
                ? isBengali
                  ? 'নাম বা ইউজারনেম দিয়ে নতুন বন্ধু খুঁজুন...'
                  : 'Search people by name or @username...'
                : isBengali
                ? 'আপনার বন্ধুদের মাঝে খুঁজুন...'
                : 'Filter your friends list...'
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* TAB 1: SUGGESTIONS & DISCOVER PEOPLE */}
      {activeTab === 'suggestions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              {searchQuery.trim()
                ? isBengali
                  ? `অনুসন্ধানের ফলাফল (${suggestions.length})`
                  : `Search Results (${suggestions.length})`
                : isBengali
                ? `প্রস্তাবিত নতুন মানুষ (${suggestions.length})`
                : `Suggested Friends (${suggestions.length})`}
            </span>
            <span className="text-[10px] text-slate-500">
              {isBengali ? 'পারস্পরিক বন্ধু অনুযায়ী সাজানো' : 'Ranked by mutual connections'}
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs">{isBengali ? 'পিপল লোড হচ্ছে...' : 'Discovering people...'}</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-600 stroke-[1.5]" />
              <p className="text-xs font-semibold">
                {isBengali ? 'কোনো নতুন বন্ধু পাওয়া যায়নি' : 'No friend suggestions found'}
              </p>
              <p className="text-[11px] text-slate-500">
                {isBengali
                  ? 'অন্যান্য কীওয়ার্ড দিয়ে সন্ধান করুন অথবা বন্ধুদের আমন্ত্রণ জানান।'
                  : 'Try searching with another name or check back later.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {suggestions.map((item) => {
                const isActionLoading = actionLoadingId === item.user.id;
                return (
                  <div
                    key={item.user.id}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <img
                        src={(item.user?.avatarUrl && item.user.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                        alt=""
                        onClick={() => onOpenProfile && onOpenProfile(item.user.id)}
                        className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-800 cursor-pointer hover:scale-105 transition-transform"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => onOpenProfile && onOpenProfile(item.user.id)}
                            className="font-bold text-xs text-white hover:text-cyan-400 cursor-pointer"
                          >
                            {item.user.displayName}
                          </span>
                          {item.user.isVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">@{item.user.username}</p>

                        {/* Mutual Friends Information */}
                        {item.mutualCount > 0 ? (
                          <div className="flex items-center gap-1 text-[10px] text-amber-400/90 font-medium">
                            <Users className="w-3 h-3 text-amber-400" />
                            <span>
                              {isBengali
                                ? `${item.mutualCount}টি সাধারণ বন্ধু`
                                : `${item.mutualCount} mutual friend${item.mutualCount > 1 ? 's' : ''}`}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 line-clamp-1 max-w-[200px]">
                            {item.user.bio || (isBengali ? 'Zan-Gi ক্রিয়েটর' : 'Zan-Gi Creator')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {item.status === 'none' && (
                        <button
                          disabled={isActionLoading}
                          onClick={() => handleSendRequest(item.user.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/30 disabled:opacity-50"
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                          <span>{isBengali ? 'বন্ধু যোগ করুন' : 'Add Friend'}</span>
                        </button>
                      )}

                      {item.status === 'pending_sent' && (
                        <button
                          disabled={isActionLoading}
                          onClick={() => handleCancelRequest(item.user.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold transition-all border border-slate-700/60 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>{isBengali ? 'অনুরোধ বাতিল' : 'Cancel Request'}</span>
                        </button>
                      )}

                      {item.status === 'pending_received' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={isActionLoading}
                            onClick={() => handleAcceptRequest(item.user.id)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-600/20 disabled:opacity-50"
                          >
                            {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            <span>{isBengali ? 'গ্রহণ' : 'Accept'}</span>
                          </button>
                          <button
                            disabled={isActionLoading}
                            onClick={() => handleDeclineRequest(item.user.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-medium"
                          >
                            {isBengali ? 'বাতিল' : 'Decline'}
                          </button>
                        </div>
                      )}

                      {item.status === 'friends' && (
                        <div className="px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-bold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isBengali ? 'বন্ধু' : 'Friends'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INCOMING FRIEND REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              {isBengali ? 'আগত ফ্রেন্ড রিকোয়েস্ট' : 'Incoming Friend Requests'} ({incomingRequests.length})
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs">{isBengali ? 'অনুরোধ লোড হচ্ছে...' : 'Loading requests...'}</span>
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <UserCheck className="w-8 h-8 mx-auto text-slate-600 stroke-[1.5]" />
              <p className="text-xs font-semibold">
                {isBengali ? 'কোনো নতুন ফ্রেন্ড রিকোয়েস্ট নেই' : 'No pending friend requests'}
              </p>
              <p className="text-[11px] text-slate-500">
                {isBengali
                  ? 'আপনার সাথে যুক্ত হতে অন্যরা অনুরোধ পাঠালে এখানে প্রদর্শিত হবে।'
                  : 'When other creators send you friend requests, they will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {incomingRequests.map((req) => {
                if (!req.sender) return null;
                const isActionLoading = actionLoadingId === req.sender.id;
                return (
                  <div
                    key={req.requestId}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-900/30 hover:border-cyan-800/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={(req.sender?.avatarUrl && req.sender.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                        alt=""
                        className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-800"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{req.sender.displayName}</span>
                          {req.sender.isVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">@{req.sender.username}</p>

                        {req.mutualCount > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-400/90 font-medium">
                            <Users className="w-3 h-3 text-amber-400" />
                            <span>
                              {isBengali
                                ? `${req.mutualCount}টি সাধারণ বন্ধু`
                                : `${req.mutualCount} mutual friend${req.mutualCount > 1 ? 's' : ''}`}
                            </span>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Accept & Decline Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        disabled={isActionLoading}
                        onClick={() => handleAcceptRequest(req.sender!.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        <span>{isBengali ? 'গ্রহণ করুন' : 'Confirm'}</span>
                      </button>
                      <button
                        disabled={isActionLoading}
                        onClick={() => handleDeclineRequest(req.sender!.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold transition-all border border-slate-700/60 disabled:opacity-50"
                      >
                        <span>{isBengali ? 'বাতিল করুন' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SENT FRIEND REQUESTS */}
      {activeTab === 'sent' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              {isBengali ? 'আপনার পাঠানো ফ্রেন্ড রিকোয়েস্ট' : 'Sent Friend Requests'} ({sentRequests.length})
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs">{isBengali ? 'পাঠানো তালিকা লোড হচ্ছে...' : 'Loading sent requests...'}</span>
            </div>
          ) : sentRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-600 stroke-[1.5]" />
              <p className="text-xs font-semibold">
                {isBengali ? 'কোনো অপেক্ষমান ফ্রেন্ড রিকোয়েস্ট নেই' : 'No outgoing pending requests'}
              </p>
              <p className="text-[11px] text-slate-500">
                {isBengali
                  ? 'কাউকে ফ্রেন্ড রিকোয়েস্ট পাঠালে তা গ্রহণ হওয়া পর্যন্ত এখানে থাকবে।'
                  : 'When you send friend requests, they will show here until approved.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sentRequests.map((req) => {
                if (!req.recipient) return null;
                const isActionLoading = actionLoadingId === req.recipient.id;
                return (
                  <div
                    key={req.requestId}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={(req.recipient?.avatarUrl && req.recipient.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                        alt=""
                        className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-800"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{req.recipient.displayName}</span>
                          {req.recipient.isVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">@{req.recipient.username}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                          <Clock className="w-3 h-3" />
                          {isBengali ? 'অনুমোদনের অপেক্ষায়' : 'Awaiting approval'}
                        </span>
                      </div>
                    </div>

                    <button
                      disabled={isActionLoading}
                      onClick={() => handleCancelRequest(req.recipient!.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-rose-300 border border-rose-900/40 text-xs font-semibold transition-all self-end sm:self-center disabled:opacity-50"
                    >
                      {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>{isBengali ? 'অনুরোধ প্রত্যাহার' : 'Cancel Request'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ALL FRIENDS */}
      {activeTab === 'friends' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              {isBengali ? `আপনার বন্ধু তালিকা (${filteredFriends.length})` : `Your Friends (${filteredFriends.length})`}
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs">{isBengali ? 'বন্ধু তালিকা লোড হচ্ছে...' : 'Loading friends...'}</span>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-600 stroke-[1.5]" />
              <p className="text-xs font-semibold">
                {searchQuery.trim()
                  ? isBengali
                    ? 'কোনো বন্ধু মেলেনি'
                    : 'No friends match your search'
                  : isBengali
                  ? 'আপনার এখনও কোনো বন্ধু যুক্ত হয়নি'
                  : 'No friends added yet'}
              </p>
              <button
                onClick={() => setActiveTab('suggestions')}
                className="mt-2 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-bold text-xs"
              >
                {isBengali ? 'নতুন বন্ধু খুঁজুন' : 'Find Friends'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredFriends.map((item) => {
                const isActionLoading = actionLoadingId === item.friend.id;
                return (
                  <div
                    key={item.friend.id}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={(item.friend?.avatarUrl && item.friend.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                        alt=""
                        onClick={() => onOpenProfile && onOpenProfile(item.friend.id)}
                        className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-800 cursor-pointer hover:scale-105 transition-transform"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => onOpenProfile && onOpenProfile(item.friend.id)}
                            className="font-bold text-xs text-white hover:text-cyan-400 cursor-pointer"
                          >
                            {item.friend.displayName}
                          </span>
                          {item.friend.isVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">@{item.friend.username}</p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          {item.mutualCount > 0 && (
                            <span className="text-amber-400 font-medium">
                              👥 {item.mutualCount} {isBengali ? 'সাধারণ বন্ধু' : 'mutual'}
                            </span>
                          )}
                          <span>
                            {isBengali
                              ? `বন্ধুত্ব: ${new Date(item.friendsSince).toLocaleDateString()}`
                              : `Friends since ${new Date(item.friendsSince).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Direct Message + Remove Friend */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => onOpenMessages && onOpenMessages(item.friend.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-cyan-300 text-xs font-semibold transition-all border border-slate-700/60 flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{isBengali ? 'মেসেজ' : 'Message'}</span>
                      </button>

                      <button
                        onClick={() => setUnfriendConfirmTarget(item)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-all border border-slate-800 hover:border-rose-900/40"
                        title={isBengali ? 'বন্ধু তালিকা থেকে সরান' : 'Remove friend'}
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Unfriending */}
      {unfriendConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-sm text-white">
                {isBengali ? 'বন্ধু অপসারণ নিশ্চিত করুন' : 'Confirm Remove Friend'}
              </span>
              <button
                onClick={() => setUnfriendConfirmTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isBengali
                ? `আপনি কি নিশ্চিতভাবে ${unfriendConfirmTarget.friend.displayName} (@${unfriendConfirmTarget.friend.username})-কে আপনার বন্ধু তালিকা থেকে সরাতে চান?`
                : `Are you sure you want to remove ${unfriendConfirmTarget.friend.displayName} (@${unfriendConfirmTarget.friend.username}) as your friend?`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUnfriendConfirmTarget(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                {isBengali ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={() => handleRemoveFriend(unfriendConfirmTarget.friend.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                {isBengali ? 'হ্যাঁ, বন্ধু সরান' : 'Remove Friend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
