import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  User as UserIcon,
  Bell,
  Users,
  MessageSquare,
  Film,
  HardDrive,
  Sparkles,
  DollarSign,
  HelpCircle,
  Languages,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  AlertCircle,
  Trash2,
  LogOut,
  RefreshCw,
  ChevronRight,
  Copy,
  TrendingUp,
  FolderDown,
  Smartphone,
  Calendar,
  Layers,
  Settings as SettingsIcon,
  ExternalLink,
  Download,
  Cloud,
  Wifi,
  FileCheck,
  Info,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { AdConfiguration, User, AdminUserItem, SystemMetrics, ReportedPostItem, StoragePreferences } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  CachedMediaItem,
  StorageUsageBreakdown,
  DeviceStorageEstimate,
  DEFAULT_STORAGE_PREFERENCES,
  getStoredStoragePreferences,
  saveStoredStoragePreferences,
  getLocalCacheStorageUsage,
  getDeviceStorageEstimate,
  getDownloadedFilesList,
  deleteDownloadedFile,
  clearImageCache,
  clearVideoCache,
  clearAudioCache,
  clearAllLocalMediaCache,
} from '../../utils/localMediaCache';

interface SettingsViewProps {
  isBengali: boolean;
  onLanguageToggle: () => void;
  adConfig: AdConfiguration;
  onUpdateAdConfig: (newConfig: Partial<AdConfiguration>) => void;
  onResetPreferences: () => void;
  onBack: () => void;
  onOpenAdmin?: () => void;
}

export type SettingsSectionId =
  | 'overview'
  | 'account'
  | 'preferences'
  | 'privacy'
  | 'security'
  | 'notifications'
  | 'friends'
  | 'messages'
  | 'media'
  | 'storage'
  | 'accessibility'
  | 'language'
  | 'theme'
  | 'creator'
  | 'monetization'
  | 'help'
  | 'admin';

interface SearchableSettingItem {
  id: string;
  section: SettingsSectionId;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  keywords: string[];
  icon: any;
  colorClass: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isBengali,
  onLanguageToggle,
  adConfig,
  onUpdateAdConfig,
  onResetPreferences,
  onBack,
  onOpenAdmin,
}) => {
  const {
    user,
    token,
    isAuthenticated,
    logout,
    deactivateAccount,
    deleteAccount,
    changePassword,
    updatePrivacy,
    blockUser,
    unblockUser,
    getBlockedUsers,
    getSessions,
    revokeSession,
    revokeOtherSessions,
    setup2FA,
    verify2FA,
    disable2FA,
    updateNotificationPrefs,
    updateMediaPrefs,
    updateStoragePrefs,
    exportPersonalData,
    updateProfile,
    getBootstrapStatus,
  } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  // Navigation state
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Check Owner / Admin role
  const isOwnerOrAdmin = isAuthenticated && user && (user.role === 'owner' || user.role === 'admin');
  const [bootstrapInfo, setBootstrapInfo] = useState<{ canBootstrap: boolean; hasOwner: boolean } | null>(null);

  useEffect(() => {
    getBootstrapStatus().then((info) => setBootstrapInfo(info));
  }, []);

  const showToast = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // ---------------------------------------------------------------------------
  // Accessibility State & Effects
  // ---------------------------------------------------------------------------
  const [highContrast, setHighContrast] = useState(() => {
    try { return localStorage.getItem('zg_high_contrast') === 'true'; } catch { return false; }
  });
  const [largeFont, setLargeFont] = useState(() => {
    try { return localStorage.getItem('zg_large_font') === 'true'; } catch { return false; }
  });
  const [reduceMotion, setReduceMotion] = useState(() => {
    try { return localStorage.getItem('zg_reduce_motion') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('zg_high_contrast', String(highContrast));
      if (highContrast) {
        document.documentElement.classList.add('contrast-125');
      } else {
        document.documentElement.classList.remove('contrast-125');
      }
    } catch {}
  }, [highContrast]);

  useEffect(() => {
    try {
      localStorage.setItem('zg_large_font', String(largeFont));
      if (largeFont) {
        document.documentElement.classList.add('text-[16px]');
      } else {
        document.documentElement.classList.remove('text-[16px]');
      }
    } catch {}
  }, [largeFont]);

  useEffect(() => {
    try {
      localStorage.setItem('zg_reduce_motion', String(reduceMotion));
    } catch {}
  }, [reduceMotion]);

  // ---------------------------------------------------------------------------
  // Account State
  // ---------------------------------------------------------------------------
  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || '');
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayNameInput(user.displayName || '');
      setBioInput(user.bio || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setIsUpdatingProfile(true);
    const res = await updateProfile({ displayName: displayNameInput, bio: bioInput });
    setIsUpdatingProfile(false);
    if (res.success) {
      showToast(isBengali ? '✓ প্রোফাইল সফলভাবে আপডেট করা হয়েছে' : '✓ Profile updated successfully');
    } else {
      showToast(res.error || 'Failed to update profile', true);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    const res = await exportPersonalData();
    setIsExporting(false);
    if (res.success && res.data) {
      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zangi_archive_${user?.username || 'user'}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(isBengali ? '✓ পার্সোনাল আর্কাইভ ডাউনলোড সম্পন্ন' : '✓ Personal archive downloaded');
    } else {
      showToast(res.error || 'Export failed', true);
    }
  };

  // ---------------------------------------------------------------------------
  // Security State (Password, 2FA, Sessions)
  // ---------------------------------------------------------------------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFASetupData, setTwoFASetupData] = useState<{ secret: string; uri: string; recoveryCodes: string[] } | null>(null);
  const [twoFACodeInput, setTwoFACodeInput] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast(isBengali ? 'পাসওয়ার্ড দুটি মেলেনি!' : 'Passwords do not match', true);
      return;
    }
    setPasswordLoading(true);
    const res = await changePassword(currentPassword, newPassword);
    setPasswordLoading(false);
    if (res.success) {
      showToast(isBengali ? '✓ পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে' : '✓ Password successfully changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showToast(res.error || 'Failed to change password', true);
    }
  };

  const handleStart2FASetup = async () => {
    setTwoFALoading(true);
    const res = await setup2FA();
    setTwoFALoading(false);
    if (res.success && res.secret) {
      setTwoFASetupData({ secret: res.secret, uri: res.uri || '', recoveryCodes: res.recoveryCodes || [] });
      setShow2FASetup(true);
    } else {
      showToast(res.error || 'Failed to initialize 2FA', true);
    }
  };

  const handleVerify2FACode = async () => {
    if (!twoFACodeInput.trim()) return;
    setTwoFALoading(true);
    const res = await verify2FA(twoFACodeInput);
    setTwoFALoading(false);
    if (res.success) {
      showToast(isBengali ? '✓ টু-ফ্যাক্টর নিরাপত্তা সক্রিয় হয়েছে' : '✓ Two-factor authentication activated');
      setShow2FASetup(false);
      setTwoFASetupData(null);
      setTwoFACodeInput('');
    } else {
      showToast(res.error || 'Invalid 2FA code', true);
    }
  };

  const loadSessionsList = async () => {
    setSessionsLoading(true);
    const list = await getSessions();
    setSessions(list || []);
    setSessionsLoading(false);
  };

  const handleRevokeSession = async (tokenStr: string) => {
    const res = await revokeSession(tokenStr);
    if (res.success) {
      showToast(isBengali ? '✓ সেশন সফলভাবে বাতিল করা হয়েছে' : '✓ Session revoked successfully');
      loadSessionsList();
    } else {
      showToast(res.error || 'Failed to revoke session', true);
    }
  };

  const handleRevokeOthers = async () => {
    const res = await revokeOtherSessions();
    if (res.success) {
      showToast(isBengali ? `✓ ${res.count || 0}টি অন্য সেশন বাতিল করা হয়েছে` : `✓ Revoked ${res.count || 0} other sessions`);
      loadSessionsList();
    } else {
      showToast(res.error || 'Failed to revoke sessions', true);
    }
  };

  // ---------------------------------------------------------------------------
  // Privacy State
  // ---------------------------------------------------------------------------
  const [isPrivateAccount, setIsPrivateAccount] = useState<boolean>(user?.isPrivate || false);
  const [whoCanComment, setWhoCanComment] = useState<'everyone' | 'followers' | 'none'>(user?.whoCanComment || 'everyone');
  const [whoCanMessage, setWhoCanMessage] = useState<'everyone' | 'followers' | 'none'>(user?.whoCanMessage || 'everyone');
  const [blockedUsersList, setBlockedUsersList] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setIsPrivateAccount(Boolean(user.isPrivate));
      setWhoCanComment(user.whoCanComment || 'everyone');
      setWhoCanMessage(user.whoCanMessage || 'everyone');
    }
  }, [user]);

  const loadBlockedList = async () => {
    const list = await getBlockedUsers();
    setBlockedUsersList(list || []);
  };

  const handleTogglePrivacy = async (patch: { isPrivate?: boolean; whoCanComment?: any; whoCanMessage?: any }) => {
    const res = await updatePrivacy(patch);
    if (res.success) {
      showToast(isBengali ? '✓ প্রাইভেসী সেটিংস সংরক্ষিত হয়েছে' : '✓ Privacy settings updated');
    } else {
      showToast(res.error || 'Privacy update failed', true);
    }
  };

  const handleUnblock = async (targetId: string) => {
    const res = await unblockUser(targetId);
    if (res.success) {
      showToast(isBengali ? '✓ আনব্লক করা হয়েছে' : '✓ User unblocked');
      loadBlockedList();
    }
  };

  // ---------------------------------------------------------------------------
  // Notifications Preferences State
  // ---------------------------------------------------------------------------
  const [notifPrefs, setNotifPrefs] = useState({
    likes: user?.notificationPreferences?.likes ?? true,
    comments: user?.notificationPreferences?.comments ?? true,
    follows: user?.notificationPreferences?.follows ?? true,
    messages: user?.notificationPreferences?.messages ?? true,
    systemUpdates: user?.notificationPreferences?.systemUpdates ?? true,
    creatorEarn: user?.notificationPreferences?.creatorEarn ?? true,
  });

  const handleSaveNotifPref = async (key: keyof typeof notifPrefs, val: boolean) => {
    const updated = { ...notifPrefs, [key]: val };
    setNotifPrefs(updated);
    const res = await updateNotificationPrefs(updated);
    if (res.success) {
      showToast(isBengali ? '✓ নোটিফিকেশন সেটিংস সংরক্ষিত' : '✓ Notification preference updated');
    }
  };

  // ---------------------------------------------------------------------------
  // Friends & Social Preferences
  // ---------------------------------------------------------------------------
  const [friendRequestScope, setFriendRequestScope] = useState<'everyone' | 'friends_of_friends'>('everyone');
  const [showMutuals, setShowMutuals] = useState(true);
  const [searchDiscoverable, setSearchDiscoverable] = useState(true);

  // ---------------------------------------------------------------------------
  // Messages Preferences
  // ---------------------------------------------------------------------------
  const [readReceipts, setReadReceipts] = useState(true);

  // ---------------------------------------------------------------------------
  // Media Preferences State
  // ---------------------------------------------------------------------------
  const [mediaPrefs, setMediaPrefs] = useState({
    dataSaver: user?.mediaPreferences?.dataSaver ?? false,
    autoplay: user?.mediaPreferences?.autoplay ?? true,
    mediaQuality: user?.mediaPreferences?.mediaQuality || 'standard',
  });

  const handleSaveMediaPref = async (patch: Partial<typeof mediaPrefs>) => {
    const updated = { ...mediaPrefs, ...patch };
    setMediaPrefs(updated as any);
    const res = await updateMediaPrefs(updated);
    if (res.success) {
      showToast(isBengali ? '✓ মিডিয়া পছন্দ সংরক্ষিত হয়েছে' : '✓ Media preference saved');
    }
  };

  // ---------------------------------------------------------------------------
  // Storage & Downloads State (Local-first & Free-tier Safety)
  // ---------------------------------------------------------------------------
  const [storagePrefs, setStoragePrefs] = useState<StoragePreferences>(() => {
    return user?.storagePreferences || getStoredStoragePreferences();
  });
  const [cacheUsage, setCacheUsage] = useState<StorageUsageBreakdown | null>(null);
  const [deviceStorage, setDeviceStorage] = useState<DeviceStorageEstimate | null>(null);
  const [downloadedFiles, setDownloadedFiles] = useState<CachedMediaItem[]>([]);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<CachedMediaItem | null>(null);
  const [deviceCacheKB, setDeviceCacheKB] = useState(384);
  const [r2Quota, setR2Quota] = useState<any>(null);
  const [serverStorage, setServerStorage] = useState<any>(null);
  const [isRefreshingStorage, setIsRefreshingStorage] = useState(false);

  const loadStorageData = async () => {
    setIsRefreshingStorage(true);
    try {
      const [usage, deviceEst, quotaRes, serverRes] = await Promise.all([
        getLocalCacheStorageUsage(),
        getDeviceStorageEstimate(),
        fetch('/api/media/quota').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/storage/server-usage').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      setCacheUsage(usage);
      setDeviceCacheKB(usage.totalCacheKB);
      setDeviceStorage(deviceEst);
      setDownloadedFiles(getDownloadedFilesList());
      if (quotaRes) setR2Quota(quotaRes);
      if (serverRes) setServerStorage(serverRes);
    } catch (e) {
      console.warn('[Settings] Error refreshing storage telemetry:', e);
    } finally {
      setIsRefreshingStorage(false);
    }
  };

  useEffect(() => {
    loadStorageData();
  }, [activeSection]);

  useEffect(() => {
    if (user?.storagePreferences) {
      setStoragePrefs((prev) => ({ ...prev, ...user.storagePreferences }));
    }
  }, [user]);

  const handleSaveStoragePref = async (patch: Partial<StoragePreferences>) => {
    const updated = { ...storagePrefs, ...patch };
    setStoragePrefs(updated);
    saveStoredStoragePreferences(patch);

    if (isAuthenticated) {
      const res = await updateStoragePrefs(patch);
      if (res.success) {
        showToast(isBengali ? '✓ স্টোরেজ ও ডাউনলোড পছন্দ সংরক্ষিত হয়েছে' : '✓ Storage & download preferences saved');
      } else {
        showToast(res.error || (isBengali ? 'স্টোরেজ পছন্দ সংরক্ষণ ব্যর্থ' : 'Failed to save storage preferences'), true);
      }
    } else {
      showToast(isBengali ? '✓ লোকাল স্টোরেজ পছন্দ হালনাগাদ হয়েছে' : '✓ Local storage preferences updated');
    }
  };

  const handleClearCacheConfirmed = async (preserveDownloaded: boolean) => {
    setShowClearCacheModal(false);
    try {
      localStorage.removeItem('zangi_studio_draft');
      localStorage.removeItem('zangi_audio_cache');
      localStorage.removeItem('zangi_cached_posts');
      const res = await clearAllLocalMediaCache(preserveDownloaded);
      await loadStorageData();
      showToast(
        isBengali
          ? `✓ সাময়িক প্রিভিউ ক্যাশ মুছে ${(res.freedBytes / 1024).toFixed(1)} KB জায়গা খালি করা হয়েছে`
          : `✓ Cleared temporary cache, freed ${(res.freedBytes / 1024).toFixed(1)} KB`
      );
    } catch {
      showToast(isBengali ? 'ক্যাশ মুছতে সমস্যা হয়েছে' : 'Failed to clear cache', true);
    }
  };

  const handleClearImageCache = async () => {
    try {
      const res = await clearImageCache();
      await loadStorageData();
      showToast(
        isBengali
          ? `✓ ${res.clearedCount}টি ছবির ক্যাশ মুছে ${(res.freedBytes / 1024).toFixed(1)} KB খালি করা হয়েছে`
          : `✓ Cleared ${res.clearedCount} cached photos (${(res.freedBytes / 1024).toFixed(1)} KB freed)`
      );
    } catch {
      showToast(isBengali ? 'ছবির ক্যাশ মুছতে ব্যর্থ হয়েছে' : 'Failed to clear image cache', true);
    }
  };

  const handleClearVideoCache = async () => {
    try {
      const res = await clearVideoCache();
      await loadStorageData();
      showToast(
        isBengali
          ? `✓ ${res.clearedCount}টি ভিডিও ক্যাশ মুছে ${(res.freedBytes / (1024 * 1024)).toFixed(2)} MB খালি করা হয়েছে`
          : `✓ Cleared ${res.clearedCount} cached videos (${(res.freedBytes / (1024 * 1024)).toFixed(2)} MB freed)`
      );
    } catch {
      showToast(isBengali ? 'ভিডিও ক্যাশ মুছতে ব্যর্থ হয়েছে' : 'Failed to clear video cache', true);
    }
  };

  const handleDeleteDownloadedFileConfirmed = async () => {
    if (!fileToDelete) return;
    const target = fileToDelete;
    setFileToDelete(null);
    try {
      const res = await deleteDownloadedFile(target.url);
      await loadStorageData();
      showToast(
        isBengali
          ? `✓ ডাউনলোড করা ফাইল মুছে ফেলা হয়েছে (${(res.freedBytes / 1024).toFixed(1)} KB মুক্ত)`
          : `✓ Deleted downloaded file (${(res.freedBytes / 1024).toFixed(1)} KB freed)`
      );
    } catch {
      showToast(isBengali ? 'ফাইল মুছতে সমস্যা হয়েছে' : 'Failed to delete downloaded file', true);
    }
  };

  // ---------------------------------------------------------------------------
  // Searchable Settings Directory (16 Required Categories)
  // ---------------------------------------------------------------------------
  const searchIndex: SearchableSettingItem[] = useMemo(() => [
    {
      id: 'acc_profile',
      section: 'account',
      titleEn: 'Personal Information & Bio',
      titleBn: 'ব্যক্তিগত তথ্য ও বায়ো',
      descEn: 'Update your display name, creator bio, and handle',
      descBn: 'নাম, ক্রিয়েটর বায়ো ও হ্যান্ডেল পরিবর্তন করুন',
      keywords: ['name', 'bio', 'profile', 'username', 'email', 'avatar', 'হ্যান্ডেল', 'নাম', 'প্রোফাইল', 'বায়ো'],
      icon: UserIcon,
      colorClass: 'text-blue-500 bg-blue-500/10',
    },
    {
      id: 'acc_archive',
      section: 'account',
      titleEn: 'Download Your Information',
      titleBn: 'আপনার তথ্যের আর্কাইভ ডাউনলোড',
      descEn: 'Export a verified JSON archive of your account activity',
      descBn: 'অ্যাকাউন্টের সমস্ত তথ্যের ব্যাকআপ JSON ফাইল ডাউনলোড করুন',
      keywords: ['export', 'download', 'archive', 'backup', 'gdpr', 'json', 'ব্যাকআপ', 'ডাউনলোড', 'আর্কাইভ'],
      icon: FolderDown,
      colorClass: 'text-indigo-500 bg-indigo-500/10',
    },
    {
      id: 'pref_feed',
      section: 'preferences',
      titleEn: 'Feed & Content Priority',
      titleBn: 'ফিড ও কন্টেন্ট অগ্রাধিকার',
      descEn: 'Set Bengali creator priority, algorithm recommendations',
      descBn: 'বাংলা ক্রিয়েটরদের কনটেন্ট অগ্রাধিকার ও রিকমেন্ডেশন',
      keywords: ['feed', 'algorithm', 'priority', 'bengali', 'content', 'ফিড', 'রিকমেন্ডেশন', 'বাংলা'],
      icon: Layers,
      colorClass: 'text-cyan-500 bg-cyan-500/10',
    },
    {
      id: 'priv_account',
      section: 'privacy',
      titleEn: 'Private Account & Interactions',
      titleBn: 'প্রাইভেট অ্যাকাউন্ট ও ইন্টারঅ্যাকশন',
      descEn: 'Control who can see your profile, comment, or message',
      descBn: 'কে কমেন্ট ও মেসেজ করতে পারবে তা নিয়ন্ত্রণ করুন',
      keywords: ['private', 'privacy', 'comment', 'message', 'followers', 'প্রাইভেসী', 'কমেন্ট', 'মেসেজ', 'গোপনীয়তা'],
      icon: Shield,
      colorClass: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      id: 'priv_blocked',
      section: 'privacy',
      titleEn: 'Blocked Accounts',
      titleBn: 'ব্লক করা অ্যাকাউন্টসমূহ',
      descEn: 'Manage blocked profiles and restricted interactions',
      descBn: 'ব্লক করা ব্যবহারকারীদের তালিকা ও আনব্লক করুন',
      keywords: ['block', 'blocked', 'restrict', 'unblock', 'ব্লক', 'আনব্লক'],
      icon: EyeOff,
      colorClass: 'text-rose-500 bg-rose-500/10',
    },
    {
      id: 'sec_password',
      section: 'security',
      titleEn: 'Change Password',
      titleBn: 'পাসওয়ার্ড পরিবর্তন',
      descEn: 'Update your account login password with PBKDF2 encryption',
      descBn: 'নিরাপদ এনক্রিপশনে পাসওয়ার্ড আপডেট করুন',
      keywords: ['password', 'pass', 'security', 'login', 'পাসওয়ার্ড', 'লগইন'],
      icon: Lock,
      colorClass: 'text-amber-500 bg-amber-500/10',
    },
    {
      id: 'sec_2fa',
      section: 'security',
      titleEn: 'Two-Factor Authentication (2FA)',
      titleBn: 'টু-ফ্যাক্টর অথেনটিকেশন (2FA)',
      descEn: 'Protect your account using Google Authenticator TOTP codes',
      descBn: 'গুগল প্রমাণক দিয়ে অ্যাকাউন্টে অতিরিক্ত নিরাপত্তা স্তর যোগ করুন',
      keywords: ['2fa', 'totp', 'authenticator', 'two-factor', 'otp', 'গুগল', 'কোড', 'টু-ফ্যাক্টর'],
      icon: KeyRound,
      colorClass: 'text-purple-500 bg-purple-500/10',
    },
    {
      id: 'sec_sessions',
      section: 'security',
      titleEn: 'Where You Are Logged In',
      titleBn: 'সক্রিয় ডিভাইস ও সেশন তালিকা',
      descEn: 'Review active browsers, client IPs, and revoke unauthorized sessions',
      descBn: 'লগইন থাকা ডিভাইস দেখুন এবং সেশন বাতিল করুন',
      keywords: ['sessions', 'devices', 'active', 'logout', 'ip', 'browser', 'সেশন', 'ডিভাইস', 'লগআউট'],
      icon: Smartphone,
      colorClass: 'text-sky-500 bg-sky-500/10',
    },
    {
      id: 'notif_alerts',
      section: 'notifications',
      titleEn: 'Push & Activity Alerts',
      titleBn: 'অ্যাক্টিভিটি ও পুশ নোটিফিকেশন',
      descEn: 'Configure notifications for likes, comments, and creator tips',
      descBn: 'লাইক, কমেন্ট, ফলো ও কয়েন আয়ের নোটিফিকেশন নিয়ন্ত্রণ করুন',
      keywords: ['notifications', 'alerts', 'push', 'likes', 'comments', 'বিজ্ঞপ্তি', 'নোটিফিকেশন', 'অ্যালার্ট'],
      icon: Bell,
      colorClass: 'text-yellow-500 bg-yellow-500/10',
    },
    {
      id: 'soc_friends',
      section: 'friends',
      titleEn: 'Friends & Social Permissions',
      titleBn: 'বন্ধু ও সামাজিক যোগাযোগ অনুমতি',
      descEn: 'Who can send you friend requests and see mutual friends',
      descBn: 'কে ফ্রেন্ড রিকোয়েস্ট পাঠাতে পারবে ও মিউচুয়াল ফ্রেন্ড দৃশ্যমানতা',
      keywords: ['friends', 'friend requests', 'mutual', 'social', 'বন্ধু', 'রিকোয়েস্ট', 'মিউচুয়াল'],
      icon: Users,
      colorClass: 'text-teal-500 bg-teal-500/10',
    },
    {
      id: 'soc_messages',
      section: 'messages',
      titleEn: 'Direct Messaging & Read Receipts',
      titleBn: 'ডিরেক্ট মেসেজ ও রিড রিসিপ্ট',
      descEn: 'Toggle blue check read receipts and message request privacy',
      descBn: 'মেসেজ পড়ার টিকচিহ্ন ও মেসেজ রিকোয়েস্ট ফিল্টার',
      keywords: ['messages', 'chat', 'read receipts', 'dm', 'মেসেজ', 'চ্যাট', 'ইনবক্স'],
      icon: MessageSquare,
      colorClass: 'text-blue-500 bg-blue-500/10',
    },
    {
      id: 'med_quality',
      section: 'media',
      titleEn: 'Media Quality & Data Saver',
      titleBn: 'মিডিয়া কোয়ালিটি ও ডাটা সেভার',
      descEn: 'Manage mobile data saver and video autoplay rules',
      descBn: 'মোবাইল ডাটা সাশ্রয়ী মোড ও ভিডিও স্বয়ংক্রিয় প্লে নিয়ন্ত্রণ',
      keywords: ['media', 'video', 'quality', 'data saver', 'autoplay', 'ডাটা', 'ভিডিও', 'কোয়ালিটি'],
      icon: Film,
      colorClass: 'text-orange-500 bg-orange-500/10',
    },
    {
      id: 'sto_cache',
      section: 'storage',
      titleEn: 'Storage & Downloads',
      titleBn: 'স্টোরেজ ও ডাউনলোড',
      descEn: 'Device storage usage, cache size, auto-download, Wi-Fi only, save-to-gallery & cloud preferences',
      descBn: 'ডিভাইস স্টোরেজ, ক্যাশ সাইজ, অটো-ডাউনলোড, ওয়াই-ফাই ও ক্লাউড পছন্দ',
      keywords: ['storage', 'cache', 'download', 'downloads', 'wifi', 'r2', 'local', 'gallery', 'স্টোরেজ', 'ক্যাশ', 'ডাউনলোড', 'ওয়াইফাই', 'গ্যালারি'],
      icon: HardDrive,
      colorClass: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      id: 'acc_visuals',
      section: 'accessibility',
      titleEn: 'Accessibility & Display',
      titleBn: 'অ্যাক্সেসিবিলিটি ও ডিসপ্লে মোড',
      descEn: 'High contrast visual mode, comfortable large font, reduced motion',
      descBn: 'উচ্চ কনট্রাস্ট, বড় ফন্ট ও মোশন নিয়ন্ত্রণ মোড',
      keywords: ['accessibility', 'contrast', 'font', 'large font', 'motion', 'কনট্রাস্ট', 'ফন্ট', 'মোশন'],
      icon: Eye,
      colorClass: 'text-violet-500 bg-violet-500/10',
    },
    {
      id: 'sys_language',
      section: 'language',
      titleEn: 'Language Preference (বাংলা / English)',
      titleBn: 'ভাষা নির্বাচন (বাংলা / English)',
      descEn: 'Switch interface language between Bengali and English',
      descBn: 'অ্যাপের ইন্টারফেস ভাষা বাংলা অথবা ইংরেজিতে পরিবর্তন করুন',
      keywords: ['language', 'bengali', 'english', 'bangla', 'ভাষা', 'বাংলা', 'ইংরেজি'],
      icon: Languages,
      colorClass: 'text-pink-500 bg-pink-500/10',
    },
    {
      id: 'sys_theme',
      section: 'theme',
      titleEn: 'Display Theme (Dark / Light Mode)',
      titleBn: 'ডিসপ্লে থিম (ডার্ক / লাইট মোড)',
      descEn: 'Toggle between dark OLED mode and clean light theme',
      descBn: 'ডার্ক ও লাইট থিমের মধ্যে তাৎক্ষণিক পরিবর্তন করুন',
      keywords: ['theme', 'dark', 'light', 'mode', 'oled', 'থিম', 'ডার্ক', 'লাইট'],
      icon: Moon,
      colorClass: 'text-indigo-500 bg-indigo-500/10',
    },
    {
      id: 'cre_tools',
      section: 'creator',
      titleEn: 'Creator Studio & Scheduling',
      titleBn: 'ক্রিয়েটর স্টুডিও ও শিডিউলিং',
      descEn: 'Post scheduling calendar, AI caption polish, audio studio',
      descBn: 'পোস্ট শিডিউলিং ক্যালেন্ডার, এআই ক্যাপশন ও অডিও লাইব্রেরি',
      keywords: ['creator', 'studio', 'schedule', 'ai', 'script', 'calendar', 'স্টুডিও', 'শিডিউল', 'ক্রিয়েটর'],
      icon: Sparkles,
      colorClass: 'text-cyan-500 bg-cyan-500/10',
    },
    {
      id: 'mon_wallet',
      section: 'monetization',
      titleEn: 'Creator Pulse, Coins & Withdrawals',
      titleBn: 'ক্রিয়েটর পালস, কয়েন ও পেআউট',
      descEn: '70% revenue share, $100 min withdrawals via bKash, Nagad, and Rocket',
      descBn: '৭০% রেভিনিউ শেয়ার, বিকাশ, নগদ ও রকেটে উত্তোলন পদ্ধতি',
      keywords: ['monetization', 'withdrawal', 'coins', 'bkash', 'nagad', 'rocket', 'earnings', 'উত্তোলন', 'বিকাশ', 'নগদ', 'রকেট', 'কয়েন', 'মনিটাইজেশন'],
      icon: DollarSign,
      colorClass: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      id: 'adm_center',
      section: 'admin',
      titleEn: '👑 Master Admin Control Center (11 Modules)',
      titleBn: '👑 মাস্টার অ্যাডমিন কন্ট্রোল সেন্টার (১১টি মডিউল)',
      descEn: 'Master Admin Control Center (11 Modules) - Manage platform users, content moderation, payouts & AI telemetry',
      descBn: 'মাস্টার অ্যাডমিন কন্ট্রোল সেন্টার (১১টি মডিউল) - প্ল্যাটফর্ম পরিচালনা, ইউজার ব্যান, পেআউট অনুমোদন ও অডিট',
      keywords: ['admin', 'owner', 'center', 'moderation', 'reports', 'payouts', 'audit', 'telemetry', 'master', 'modules', 'control', 'অ্যাডমিন', 'ওনার', 'মডারেশন'],
      icon: ShieldAlert,
      colorClass: 'text-rose-500 bg-rose-500/10',
    },
    {
      id: 'hlp_standards',
      section: 'help',
      titleEn: 'Community Standards, Safety & Support',
      titleBn: 'কমিউনিটি স্ট্যান্ডার্ড, নিরাপত্তা ও সহায়তা',
      descEn: 'Platform policies, violation appeals process, contact support',
      descBn: 'প্ল্যাটফর্ম নীতিমালা, আপিল প্রক্রিয়া এবং সহায়তা কেন্দ্র',
      keywords: ['help', 'rules', 'community', 'standards', 'support', 'appeals', 'সহায়তা', 'নীতিমালা', 'রুলস'],
      icon: HelpCircle,
      colorClass: 'text-slate-500 bg-slate-500/10',
    },
  ], []);

  // Filtered search results
  const filteredSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter((item) => {
      // Show admin row in search only if authorized or if bootstrap is possible
      if (item.section === 'admin' && !isOwnerOrAdmin && !bootstrapInfo?.canBootstrap) {
        return false;
      }
      return (
        item.titleEn.toLowerCase().includes(q) ||
        item.titleBn.toLowerCase().includes(q) ||
        item.descEn.toLowerCase().includes(q) ||
        item.descBn.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, searchIndex, isOwnerOrAdmin, bootstrapInfo]);

  // Handle tap from search result
  const handleSelectSearchResult = (section: SettingsSectionId) => {
    setSearchQuery('');
    if (section === 'admin' && onOpenAdmin) {
      onOpenAdmin();
    } else {
      setActiveSection(section);
      if (section === 'privacy') loadBlockedList();
      if (section === 'security') loadSessionsList();
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border animate-in slide-in-from-top-3 ${
            statusMessage.isError
              ? 'bg-rose-950 border-rose-800 text-rose-200'
              : 'bg-emerald-950 border-emerald-800 text-emerald-200'
          }`}
        >
          {statusMessage.isError ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div
        className={`px-4 pt-3 pb-3 border-b sticky top-0 z-20 backdrop-blur-md transition-colors ${
          isDark ? 'bg-slate-950/90 border-slate-800/80' : 'bg-white/95 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <button
            onClick={() => {
              if (activeSection !== 'overview') {
                setActiveSection('overview');
              } else {
                onBack();
              }
            }}
            className={`p-2 rounded-2xl transition-colors flex items-center gap-1.5 font-bold text-xs ${
              isDark ? 'hover:bg-slate-900 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{activeSection !== 'overview' ? (isBengali ? 'সেটিংস' : 'Settings') : (isBengali ? 'হোমে ফিরুন' : 'Back')}</span>
          </button>

          <h1 className="font-extrabold text-sm sm:text-base tracking-tight truncate">
            {activeSection === 'overview' && (isBengali ? 'সেটিংস ও প্রাইভেসী' : 'Settings & Privacy')}
            {activeSection === 'account' && (isBengali ? 'অ্যাকাউন্ট ব্যবস্থাপনা' : 'Account Center')}
            {activeSection === 'preferences' && (isBengali ? 'কন্টেন্ট অগ্রাধিকার' : 'Preferences')}
            {activeSection === 'privacy' && (isBengali ? 'প্রাইভেসী ও ইন্টারঅ্যাকশন' : 'Privacy & Safety')}
            {activeSection === 'security' && (isBengali ? 'পাসওয়ার্ড ও নিরাপত্তা' : 'Security & Login')}
            {activeSection === 'notifications' && (isBengali ? 'বিজ্ঞপ্তি সেটিংস' : 'Notifications')}
            {activeSection === 'friends' && (isBengali ? 'বন্ধু ও সংযোগ' : 'Friends & Social')}
            {activeSection === 'messages' && (isBengali ? 'মেসেজ ও চ্যাট' : 'Direct Messages')}
            {activeSection === 'media' && (isBengali ? 'মিডিয়া ও ডাটা সেভার' : 'Media & Data Saver')}
            {activeSection === 'storage' && (isBengali ? 'স্টোরেজ ও ক্যাশ' : 'Storage & Cache')}
            {activeSection === 'accessibility' && (isBengali ? 'অ্যাক্সেসিবিলিটি' : 'Accessibility')}
            {activeSection === 'language' && (isBengali ? 'ভাষা নির্বাচন' : 'Language')}
            {activeSection === 'theme' && (isBengali ? 'ডিসপ্লে থিম' : 'Display Theme')}
            {activeSection === 'creator' && (isBengali ? 'ক্রিয়েটর টুলস' : 'Creator Tools')}
            {activeSection === 'monetization' && (isBengali ? 'মনিটাইজেশন ও পেআউট' : 'Monetization')}
            {activeSection === 'admin' && (isBengali ? '👑 সিকিউর অ্যাডমিন সেন্টার' : '👑 Admin Center')}
            {activeSection === 'help' && (isBengali ? 'কমিউনিটি স্ট্যান্ডার্ড ও সহায়তা' : 'Help & Standards')}
          </h1>

          {/* Language & Theme quick toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={onLanguageToggle}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                isDark ? 'bg-slate-900 border-slate-800 text-cyan-400' : 'bg-slate-100 border-slate-200 text-blue-600'
              }`}
              title="Toggle Bengali / English"
            >
              {isBengali ? 'EN' : 'বাং'}
            </button>
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-xl transition-all border ${
                isDark ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* SEARCH BAR (Requirement 1: Facebook / Phone Settings style) */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBengali ? 'Search settings / সেটিংস খুঁজুন...' : 'Search settings...'}
            aria-label="Search settings"
            className={`w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
              isDark
                ? 'bg-slate-900/90 border border-slate-800 text-slate-100 placeholder:text-slate-500'
                : 'bg-slate-100/90 border border-slate-200 text-slate-900 placeholder:text-slate-400'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* MAIN SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-28">
        {/* LIVE SEARCH RESULTS VIEW */}
        {searchQuery.trim().length > 0 ? (
          <div className="space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
              <span>{isBengali ? `খোঁজের ফলাফল (${filteredSearchResults.length})` : `Search Results (${filteredSearchResults.length})`}</span>
              <span>{isBengali ? 'যেকোনোটিতে ট্যাপ করুন' : 'Tap to open section'}</span>
            </div>

            {filteredSearchResults.length === 0 ? (
              <div className={`p-8 rounded-3xl text-center space-y-2 border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Search className="w-8 h-8 mx-auto text-slate-400 opacity-40" />
                <p className="text-sm font-bold text-slate-300">
                  {isBengali ? `"${searchQuery}" এর জন্য কোনো সেটিংস পাওয়া যায়নি` : `No matching settings found for "${searchQuery}"`}
                </p>
                <p className="text-xs text-slate-400">
                  {isBengali ? 'অন্য কোনো কি-ওয়ার্ড দিয়ে চেষ্টা করুন (যেমন: পাসওয়ার্ড, কয়েন, প্রাইভেসী)' : 'Try searching for password, bKash, notifications, privacy, or theme'}
                </p>
              </div>
            ) : (
              <div className={`rounded-3xl border overflow-hidden divide-y ${isDark ? 'bg-slate-900/70 border-slate-800/80 divide-slate-800/60' : 'bg-white border-slate-200 divide-slate-100 shadow-xs'}`}>
                {filteredSearchResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSearchResult(item.section)}
                      className={`p-3.5 flex items-center gap-3.5 cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${item.colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                            {isBengali ? item.titleBn : item.titleEn}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                            {item.section}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {isBengali ? item.descBn : item.descEn}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeSection === 'overview' ? (
          /* =========================================================================
             SECTION OVERVIEW: GROUPED CARDS (FACEBOOK & MODERN PHONE SETTINGS STYLE)
             ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* User Profile Card */}
            {isAuthenticated && user && (
              <div
                onClick={() => setActiveSection('account')}
                className={`p-4 rounded-3xl border cursor-pointer transition-all flex items-center justify-between ${
                  isDark
                    ? 'bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-purple-950/30 border-blue-900/40 hover:border-blue-800'
                    : 'bg-gradient-to-r from-blue-50/70 via-white to-purple-50/70 border-blue-200/80 hover:border-blue-300 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative">
                    <img
                      src={(user.avatarUrl && user.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                      alt={user.displayName}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/40"
                    />
                    {user.role === 'owner' && (
                      <span className="absolute -top-1 -right-1 text-xs">👑</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                        {user.displayName}
                      </span>
                      {user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 truncate font-mono">@{user.username} · {user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'owner'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : user.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}>
                        {user.role}
                      </span>
                      <span className="text-[11px] text-amber-400 font-bold font-mono">
                        {user.creatorCoins || 0} 🪙
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
            )}

            {/* GROUP 1: ACCOUNT & SECURITY */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                {isBengali ? 'অ্যাকাউন্ট ও নিরাপত্তা' : 'Account & Security'}
              </h2>
              <div className={`rounded-3xl border overflow-hidden divide-y ${isDark ? 'bg-slate-900/60 border-slate-800/80 divide-slate-800/60' : 'bg-white border-slate-200 divide-slate-100 shadow-xs'}`}>
                {/* Account */}
                <div
                  onClick={() => setActiveSection('account')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'অ্যাকাউন্ট তথ্য ও বায়ো' : 'Account Details & Bio'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'নাম, বায়ো ও ব্যক্তিগত ডেটা এক্সপোর্ট' : 'Name, bio & JSON archive export'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Security */}
                <div
                  onClick={() => {
                    setActiveSection('security');
                    loadSessionsList();
                  }}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'পাসওয়ার্ড ও 2FA নিরাপত্তা' : 'Security & Two-Factor Authentication'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'পাসওয়ার্ড পরিবর্তন, গুগল প্রমাণক ও সক্রিয় সেশন' : 'Password change, TOTP authenticator & active devices'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Privacy */}
                <div
                  onClick={() => {
                    setActiveSection('privacy');
                    loadBlockedList();
                  }}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'প্রাইভেসী ও ব্লকিং' : 'Privacy & Blocked Users'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'প্রাইভেট প্রোফাইল ও মেসেজ ইন্টারঅ্যাকশন' : 'Account privacy, who can message & blocked list'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* GROUP 2: PREFERENCES & SOCIAL */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                {isBengali ? 'পছন্দ ও সামাজিক সংযোগ' : 'Preferences & Experience'}
              </h2>
              <div className={`rounded-3xl border overflow-hidden divide-y ${isDark ? 'bg-slate-900/60 border-slate-800/80 divide-slate-800/60' : 'bg-white border-slate-200 divide-slate-100 shadow-xs'}`}>
                {/* Preferences */}
                <div
                  onClick={() => setActiveSection('preferences')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'কন্টেন্ট ও ফিড পছন্দ (Preferences)' : 'Preferences'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'বাংলা কনটেন্ট অগ্রাধিকার ও এআই ফিড পছন্দ' : 'Bengali content priority & AI assisted feed'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Notifications */}
                <div
                  onClick={() => setActiveSection('notifications')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'নোটিফিকেশন ও অ্যালার্ট' : 'Notifications'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'লাইক, কমেন্ট ও ক্রিয়েটর আয় বিজ্ঞপ্তি' : 'Likes, comments, follows & coin rewards'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Friends & Connections */}
                <div
                  onClick={() => setActiveSection('friends')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'বন্ধু ও ফ্রেন্ড রিকোয়েস্ট' : 'Friends & Connections'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'কে ফ্রেন্ড রিকোয়েস্ট পাঠাতে পারবে ও মিউচুয়াল ফ্রেন্ড' : 'Request eligibility & mutual friends visibility'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Messages */}
                <div
                  onClick={() => setActiveSection('messages')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'ডিরেক্ট মেসেজ ও রিড রিসিপ্ট' : 'Direct Messages'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'ব্লু টিক রিড রিসিপ্ট ও চ্যাট প্রাইভেসী' : 'Read receipts & message filters'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Media & Data Saver */}
                <div
                  onClick={() => setActiveSection('media')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                      <Film className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'মিডিয়া ও ডাটা সেভার' : 'Media & Data Saver'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'মোবাইল ডাটা সাশ্রয় ও ভিডিও অটো-প্লে' : 'Autoplay video rules & high-res media'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Storage & Cache */}
                <div
                  onClick={() => setActiveSection('storage')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'স্টোরেজ ও ডাউনলোড' : 'Storage & Downloads'}</span>
                      <span className="text-[11px] text-slate-400 block">
                        {isBengali
                          ? `${cacheUsage?.totalCacheMB || (deviceCacheKB / 1024).toFixed(1)} MB ক্যাশ ও ডাউনলোড, R2 ফ্রি-টিয়ার`
                          : `${cacheUsage?.totalCacheMB || (deviceCacheKB / 1024).toFixed(1)} MB cache & downloads, R2 safety`}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Accessibility */}
                <div
                  onClick={() => setActiveSection('accessibility')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'অ্যাক্সেসিবিলিটি ও ডিসপ্লে' : 'Accessibility & Display'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'হাই কনট্রাস্ট ও বড় ফন্ট মোড' : 'High contrast, larger font & motion control'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Language */}
                <div
                  onClick={() => setActiveSection('language')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                      <Languages className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'ভাষা (Language)' : 'App Language'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'বর্তমান ভাষা: বাংলা' : 'Current: English'}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono text-cyan-400">{isBengali ? 'বাংলা' : 'English'}</span>
                </div>

                {/* Theme */}
                <div
                  onClick={() => setActiveSection('theme')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'ডিসপ্লে থিম (Theme)' : 'Theme Mode'}</span>
                      <span className="text-[11px] text-slate-400 block">{isDark ? (isBengali ? 'ডার্ক মোড সক্রিয়' : 'Dark Mode Active') : (isBengali ? 'লাইট মোড সক্রিয়' : 'Light Mode Active')}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{isDark ? 'Dark' : 'Light'}</span>
                </div>
              </div>
            </div>

            {/* GROUP 3: CREATOR & MONETIZATION */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                {isBengali ? 'ক্রিয়েটর ও মনিটাইজেশন' : 'Creator Tools & Monetization'}
              </h2>
              <div className={`rounded-3xl border overflow-hidden divide-y ${isDark ? 'bg-slate-900/60 border-slate-800/80 divide-slate-800/60' : 'bg-white border-slate-200 divide-slate-100 shadow-xs'}`}>
                {/* Creator Tools */}
                <div
                  onClick={() => setActiveSection('creator')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'ক্রিয়েটর স্টুডিও ও শিডিউল' : 'Creator Studio & Scheduling'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'শিডিউলড পোস্ট ক্যালেন্ডার ও অডিও টুলস' : 'Scheduled posts queue & video tools'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Monetization */}
                <div
                  onClick={() => setActiveSection('monetization')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'ক্রিয়েটর পালস ও পেআউট' : 'Creator Pulse & Payouts'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? '৭০% রেভিনিউ শেয়ার, বিকাশ, নগদ ও রকেট উত্তোলন' : '70% revshare, bKash, Nagad & Rocket withdrawals'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* GROUP 4: PLATFORM ADMINISTRATION & GOVERNANCE */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                {isBengali ? 'প্ল্যাটফর্ম ও প্রশাসন' : 'Platform & Governance'}
              </h2>
              <div className={`rounded-3xl border overflow-hidden divide-y ${isDark ? 'bg-slate-900/60 border-slate-800/80 divide-slate-800/60' : 'bg-white border-slate-200 divide-slate-100 shadow-xs'}`}>
                {/* REQUIREMENT 3: ADMIN CENTER INSIDE SETTINGS (Only visible to authorized Owner/Admin) */}
                {isOwnerOrAdmin ? (
                  <div
                    onClick={() => {
                      if (onOpenAdmin) {
                        onOpenAdmin();
                      } else {
                        setActiveSection('admin');
                      }
                    }}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors border-l-4 border-l-rose-500 ${
                      isDark ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'bg-rose-50/70 hover:bg-rose-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs sm:text-sm text-rose-400">
                            {isBengali ? '👑 মাস্টার অ্যাডমিন কন্ট্রোল সেন্টার' : '👑 Master Admin Control Center (11 Modules)'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[9px] uppercase tracking-wider">
                            {user?.role === 'owner' ? 'Owner Exclusive' : 'Admin Access'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Master Admin Control Center (11 Modules) · {isBengali ? 'ইউজার ব্যবস্থাপনা, মডারেশন, পেআউট অনুমোদন ও সিস্টেম অডিট' : 'Users, moderation queue, bKash/Nagad/Rocket payouts & audit ledger'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-rose-400 font-bold text-xs">
                      <span>{isBengali ? 'প্রবেশ করুন' : 'Open'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                ) : bootstrapInfo?.canBootstrap ? (
                  /* Fresh installation Owner bootstrap hint */
                  <div
                    onClick={() => setActiveSection('admin')}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors border-l-4 border-l-amber-500 ${
                      isDark ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'bg-amber-50/70 hover:bg-amber-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs sm:text-sm text-amber-400 block">
                          {isBengali ? '👑 প্রথম ওনার বুটস্ট্র্যাপ উপলব্ধ' : '👑 First-Owner Bootstrap Available'}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {isBengali ? 'সার্ভার সিক্রেট দিয়ে প্রথম ওনার অ্যাকাউন্ট তৈরি করুন' : 'Initialize primary owner account via server setup secret'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </div>
                ) : null}

                {/* Help & Standards */}
                <div
                  onClick={() => setActiveSection('help')}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-slate-500/10 text-slate-400 flex items-center justify-center">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">{isBengali ? 'কমিউনিটি স্ট্যান্ডার্ড ও নীতিমালা' : 'Community Standards & Safety'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'প্ল্যাটফর্ম রুলস, আপিল ও সাপোর্ট' : 'Safety guidelines, appeals & legal terms'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Logout button */}
            {isAuthenticated && (
              <div className="pt-2">
                <button
                  onClick={logout}
                  className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border ${
                    isDark
                      ? 'bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 border-rose-900/40'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isBengali ? 'লগআউট করুন' : 'Sign Out of Zan-Gi'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             DETAILED SECTION SUB-PAGES WITH REAL PERSISTENT CONTROLS
             ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* SECTION 1: ACCOUNT */}
            {activeSection === 'account' && (
              <div className="space-y-4">
                <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold text-sm text-blue-400 flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    {isBengali ? 'প্রোফাইল তথ্য হালনাগাদ' : 'Profile Information'}
                  </h3>

                  <form onSubmit={handleSaveProfile} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        {isBengali ? 'প্রদর্শন নাম (Display Name)' : 'Display Name'}
                      </label>
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border ${
                          isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        {isBengali ? 'ক্রিয়েটর বায়ো (Bio)' : 'Creator Bio'}
                      </label>
                      <textarea
                        rows={3}
                        value={bioInput}
                        onChange={(e) => setBioInput(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border ${
                          isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-colors"
                    >
                      {isUpdatingProfile ? (isBengali ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBengali ? 'প্রোফাইল পরিবর্তন সংরক্ষণ' : 'Save Changes')}
                    </button>
                  </form>
                </div>

                <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                    <FolderDown className="w-4 h-4" />
                    {isBengali ? 'আপনার ব্যক্তিগত ডাটা আর্কাইভ' : 'Personal Data Export'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isBengali
                      ? 'আপনার সমস্ত পোস্ট, মেসেজ, ফলোয়ার্স ও ট্রানজাকশন হিস্ট্রি একটি সম্পূর্ণ JSON ফাইলে ডাউনলোড করুন।'
                      : 'Download a complete JSON export of your profile, posts, social graph, and financial ledger.'}
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <FolderDown className="w-3.5 h-3.5" />
                    <span>{isExporting ? (isBengali ? 'প্রস্তুত হচ্ছে...' : 'Exporting...') : (isBengali ? 'JSON ফাইল ডাউনলোড করুন' : 'Download JSON Archive')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 2: PREFERENCES */}
            {activeSection === 'preferences' && (
              <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  {isBengali ? 'ফিড ও কন্টেন্ট অগ্রাধিকার' : 'Feed Preferences'}
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-slate-200 block">{isBengali ? 'বাংলা কনটেন্ট প্রায়োরিটি' : 'Bengali Content Priority'}</span>
                      <span className="text-slate-400 text-[11px] block">{isBengali ? 'ফিডে বাংলাদেশি ক্রিয়েটরদের কাজ শীর্ষে দেখান' : 'Prioritize local creators and regional trends'}</span>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 accent-cyan-500 cursor-pointer"
                      onChange={() => showToast(isBengali ? '✓ ফিড অ্যালগরিদম আপডেট করা হয়েছে' : '✓ Feed algorithm updated')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-slate-200 block">{isBengali ? 'এআই জেনারেটেড ক্রিয়েশনস' : 'AI-Assisted Feed'}</span>
                      <span className="text-slate-400 text-[11px] block">{isBengali ? 'AI স্টুডিও থেকে তৈরি আর্ট ও স্ক্রিপ্ট হাইলাইট করুন' : 'Highlight AI Studio creations in explore tab'}</span>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 accent-cyan-500 cursor-pointer"
                      onChange={() => showToast(isBengali ? '✓ এআই ফিড পছন্দ সংরক্ষিত' : '✓ AI feed preference saved')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: PRIVACY */}
            {activeSection === 'privacy' && (
              <div className="space-y-4">
                <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {isBengali ? 'অ্যাকাউন্ট প্রাইভেসী ও দৃশ্যমানতা' : 'Account Privacy'}
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                      <div>
                        <span className="font-bold text-slate-200 block">{isBengali ? 'প্রাইভেট অ্যাকাউন্ট' : 'Private Account'}</span>
                        <span className="text-slate-400 text-[11px] block">{isBengali ? 'শুধুমাত্র অনুমোদিত ফলোয়াররাই আপনার পোস্ট দেখতে পাবেন' : 'Only approved followers can view your feed and reels'}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isPrivateAccount}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setIsPrivateAccount(val);
                          handleTogglePrivacy({ isPrivate: val });
                        }}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                      <label className="block font-bold text-slate-200">
                        {isBengali ? 'কে আপনার পোস্টে কমেন্ট করতে পারবে?' : 'Who can comment on your posts?'}
                      </label>
                      <select
                        value={whoCanComment}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setWhoCanComment(val);
                          handleTogglePrivacy({ whoCanComment: val });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium"
                      >
                        <option value="everyone">{isBengali ? 'সবাই (Everyone)' : 'Everyone'}</option>
                        <option value="followers">{isBengali ? 'শুধুমাত্র ফলোয়ার্স (Followers only)' : 'Followers only'}</option>
                        <option value="none">{isBengali ? 'কেউ নয় (No one)' : 'No one'}</option>
                      </select>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                      <label className="block font-bold text-slate-200">
                        {isBengali ? 'কে সরাসরি মেসেজ পাঠাতে পারবে?' : 'Who can send direct messages?'}
                      </label>
                      <select
                        value={whoCanMessage}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setWhoCanMessage(val);
                          handleTogglePrivacy({ whoCanMessage: val });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium"
                      >
                        <option value="everyone">{isBengali ? 'সবাই (Everyone)' : 'Everyone'}</option>
                        <option value="followers">{isBengali ? 'শুধুমাত্র ফলোয়ার্স (Followers only)' : 'Followers only'}</option>
                        <option value="none">{isBengali ? 'কেউ নয় (No one)' : 'No one'}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Blocked Users */}
                <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
                      <EyeOff className="w-4 h-4" />
                      {isBengali ? `ব্লক করা ব্যবহারকারী (${blockedUsersList.length})` : `Blocked Users (${blockedUsersList.length})`}
                    </h3>
                    <button
                      onClick={loadBlockedList}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{isBengali ? 'রিফ্রেশ' : 'Refresh'}</span>
                    </button>
                  </div>

                  {blockedUsersList.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      {isBengali ? 'আপনি কাউকে ব্লক করেননি।' : 'No blocked users.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {blockedUsersList.map((bu) => (
                        <div key={bu.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={(bu.avatarUrl && bu.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                              alt={bu.username}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                            <div>
                              <span className="font-bold text-xs block text-slate-200">{bu.displayName}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">@{bu.username}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnblock(bu.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs"
                          >
                            {isBengali ? 'আনব্লক' : 'Unblock'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 4: SECURITY */}
            {activeSection === 'security' && (
              <div className="space-y-4">
                {/* Change Password */}
                <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {isBengali ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
                  </h3>

                  <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        {isBengali ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          {isBengali ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                        </label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          {isBengali ? 'পুনরায় টাইপ করুন' : 'Confirm Password'}
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-medium"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs transition-colors"
                    >
                      {passwordLoading ? (isBengali ? 'পরিবর্তন হচ্ছে...' : 'Updating...') : (isBengali ? 'পাসওয়ার্ড আপডেট করুন' : 'Update Password')}
                    </button>
                  </form>
                </div>

                {/* 2FA */}
                <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-purple-400 flex items-center gap-2">
                        <KeyRound className="w-4 h-4" />
                        {isBengali ? 'টু-ফ্যাক্টর অথেনটিকেশন (2FA)' : 'Two-Factor Authentication'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {user?.twoFactorEnabled
                          ? (isBengali ? '✓ আপনার অ্যাকাউন্টে ২এফএ সক্রিয় রয়েছে' : '✓ 2FA is currently active on your account')
                          : (isBengali ? 'গুগল প্রমাণক (Google Authenticator) দিয়ে অতিরিক্ত সুরক্ষা যোগ করুন' : 'Add extra security with standard TOTP authenticator app')}
                      </p>
                    </div>
                    {!user?.twoFactorEnabled ? (
                      <button
                        onClick={handleStart2FASetup}
                        disabled={twoFALoading}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs transition-colors"
                      >
                        {isBengali ? 'সক্রিয় করুন' : 'Setup 2FA'}
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                        Active ✓
                      </span>
                    )}
                  </div>

                  {show2FASetup && twoFASetupData && (
                    <div className="p-4 bg-slate-950 rounded-2xl border border-purple-900/40 space-y-3 text-xs">
                      <p className="font-bold text-purple-300">
                        {isBengali ? '১. গুগল প্রমাণক অ্যাপে এই সিক্রেট কোডটি যোগ করুন:' : '1. Enter this secret in your authenticator app:'}
                      </p>
                      <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 font-mono text-cyan-400 font-bold flex items-center justify-between">
                        <span>{twoFASetupData.secret}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(twoFASetupData.secret);
                            setCopiedSecret(true);
                            setTimeout(() => setCopiedSecret(false), 2000);
                          }}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          {copiedSecret ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>

                      <p className="font-bold text-purple-300">
                        {isBengali ? '২. প্রমাণক অ্যাপের ৬-সংখ্যার কোডটি প্রবেশ করান:' : '2. Enter the 6-digit TOTP code generated:'}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={twoFACodeInput}
                          onChange={(e) => setTwoFACodeInput(e.target.value)}
                          placeholder="123456"
                          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-center w-36 text-sm"
                        />
                        <button
                          onClick={handleVerify2FACode}
                          disabled={twoFALoading || !twoFACodeInput.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs"
                        >
                          {isBengali ? 'যাচাই ও সক্রিয় করুন' : 'Verify & Enable'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Sessions */}
                <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-sky-400 flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      {isBengali ? `সক্রিয় সেশন (${sessions.length})` : `Active Sessions (${sessions.length})`}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={loadSessionsList}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      {sessions.length > 1 && (
                        <button
                          onClick={handleRevokeOthers}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                        >
                          {isBengali ? 'অন্যান্য সব বাতিল করুন' : 'Revoke All Others'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {sessions.map((s) => (
                      <div key={s.fullToken} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{s.userAgent}</span>
                            {s.isCurrent && (
                              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[9px]">
                                This Device
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                            IP: {s.ip} · Token: {s.tokenSnippet}
                          </span>
                        </div>
                        {!s.isCurrent && (
                          <button
                            onClick={() => handleRevokeSession(s.fullToken)}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 font-bold text-xs"
                          >
                            {isBengali ? 'লগআউট' : 'Revoke'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="font-bold text-sm text-yellow-400 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  {isBengali ? 'বিজ্ঞপ্তি পছন্দসমূহ' : 'Notification Preferences'}
                </h3>
                <div className="space-y-3 text-xs">
                  {[
                    { key: 'likes', titleBn: 'লাইক নোটিফিকেশন', titleEn: 'Likes Alerts', descBn: 'কেউ আপনার পোস্টে লাইক দিলে বিজ্ঞপ্তি পান', descEn: 'Get notified when someone likes your content' },
                    { key: 'comments', titleBn: 'মন্তব্য নোটিফিকেশন', titleEn: 'Comments Alerts', descBn: 'নতুন মন্তব্যের সময় তাৎক্ষণিক বিজ্ঞপ্তি', descEn: 'Receive alerts when users comment on your posts' },
                    { key: 'follows', titleBn: 'ফলোয়ার নোটিফিকেশন', titleEn: 'Follow Alerts', descBn: 'নতুন ক্রিয়েটর আপনাকে ফলো করলে জানান', descEn: 'Alerts when someone follows your creator profile' },
                    { key: 'messages', titleBn: 'মেসেজ বিজ্ঞপ্তি', titleEn: 'Direct Message Alerts', descBn: 'ইনবক্সে নতুন মেসেজ আসলে নোটিফিকেশন', descEn: 'Instant push notifications for direct messages' },
                    { key: 'creatorEarn', titleBn: 'ক্রিয়েটর কয়েন ও আর্নিং', titleEn: 'Creator Earnings & Tips', descBn: 'বিজ্ঞাপন রেভিনিউ শেয়ার ও টিপসের নোটিফিকেশন', descEn: 'Updates on 70% revshare and coin tips' },
                    { key: 'systemUpdates', titleBn: 'সিস্টেম ও নিরাপত্তা আপডেট', titleEn: 'System Security Updates', descBn: 'প্ল্যাটফর্মের গুরুত্বপূর্ণ সিকিউরিটি নোটিশ', descEn: 'Critical platform policy and account security alerts' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                      <div>
                        <span className="font-bold text-slate-200 block">{isBengali ? item.titleBn : item.titleEn}</span>
                        <span className="text-slate-400 text-[11px] block">{isBengali ? item.descBn : item.descEn}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean((notifPrefs as any)[item.key])}
                        onChange={(e) => handleSaveNotifPref(item.key as any, e.target.checked)}
                        className="w-4 h-4 accent-yellow-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 6: FRIENDS & SOCIAL */}
            {activeSection === 'friends' && (
              <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="font-bold text-sm text-teal-400 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {isBengali ? 'বন্ধু ও সংযোগ অনুমতি' : 'Friends & Social Permissions'}
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                    <label className="block font-bold text-slate-200">
                      {isBengali ? 'কে আপনাকে ফ্রেন্ড রিকোয়েস্ট পাঠাতে পারবে?' : 'Who can send you friend requests?'}
                    </label>
                    <select
                      value={friendRequestScope}
                      onChange={(e) => {
                        setFriendRequestScope(e.target.value as any);
                        showToast(isBengali ? '✓ ফ্রেন্ড রিকোয়েস্ট অনুমতি হালনাগাদ' : '✓ Friend request scope updated');
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium"
                    >
                      <option value="everyone">{isBengali ? 'সবাই (Everyone)' : 'Everyone'}</option>
                      <option value="friends_of_friends">{isBengali ? 'বন্ধুর বন্ধুরা (Friends of Friends)' : 'Friends of Friends'}</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-slate-200 block">{isBengali ? 'মিউচুয়াল ফ্রেন্ড দৃশ্যমানতা' : 'Show Mutual Friends'}</span>
                      <span className="text-slate-400 text-[11px] block">{isBengali ? 'অন্যান্য ব্যবহারকারীদের সাথে সাধারণ বন্ধু সংখ্যা প্রদর্শন' : 'Allow others to see common friends in profile'}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showMutuals}
                      onChange={(e) => {
                        setShowMutuals(e.target.checked);
                        showToast(isBengali ? '✓ মিউচুয়াল ফ্রেন্ড দৃশ্যমানতা সংরক্ষিত' : '✓ Mutual friends visibility updated');
                      }}
                      className="w-4 h-4 accent-teal-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-slate-200 block">{isBengali ? 'অনুসন্ধানে খুঁজযোগ্যতা' : 'Discoverable in Search'}</span>
                      <span className="text-slate-400 text-[11px] block">{isBengali ? 'অন্যান্য ব্যবহারকারীরা অনুসন্ধান বারে আপনার প্রোফাইল খুঁজে পাবে' : 'Allow people to discover your profile by search'}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={searchDiscoverable}
                      onChange={(e) => {
                        setSearchDiscoverable(e.target.checked);
                        showToast(isBengali ? '✓ সার্চ ফাইন্ডেবিলিটি সংরক্ষিত' : '✓ Search discoverability saved');
                      }}
                      className="w-4 h-4 accent-teal-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7: MESSAGES */}
            {activeSection === 'messages' && (
              <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {isBengali ? 'মেসেজ ও চ্যাট প্রাইভেসী' : 'Direct Messages Privacy'}
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-slate-200 block">{isBengali ? 'রিড রিসিপ্ট (পড়ার টিকচিহ্ন)' : 'Read Receipts (Blue Ticks)'}</span>
                      <span className="text-slate-400 text-[11px] block">{isBengali ? 'আপনি মেসেজ দেখেছেন কিনা তা প্রেরককে জানান' : 'Let others know when you have viewed their messages'}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={readReceipts}
                      onChange={(e) => {
                        setReadReceipts(e.target.checked);
                        showToast(isBengali ? '✓ রিড রিসিপ্ট সেটিংস হালনাগাদ' : '✓ Read receipts preference updated');
                      }}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 8: MEDIA */}
            {activeSection === 'media' && (
              <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="font-bold text-sm text-orange-400 flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  {isBengali ? 'মিডিয়া ও ডাটা অপ্টিমাইজেশন' : 'Media Quality & Data Saver'}
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-slate-200 block">{isBengali ? 'ডাটা সেভার মোড' : 'Data Saver Mode'}</span>
                      <span className="text-slate-400 text-[11px] block">{isBengali ? 'কম মোবাইল ডাটা খরচে ভিডিও ও ছবি লোড করুন' : 'Reduces video resolution and data consumption'}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={mediaPrefs.dataSaver}
                      onChange={(e) => handleSaveMediaPref({ dataSaver: e.target.checked })}
                      className="w-4 h-4 accent-orange-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-slate-200 block">{isBengali ? 'স্বয়ংক্রিয় ভিডিও প্লে' : 'Autoplay Videos'}</span>
                      <span className="text-slate-400 text-[11px] block">{isBengali ? 'ফিডে স্ক্রল করার সময় রিলস ও ভিডিও নিজে থেকে চলবে' : 'Autoplay clips in feed and reels views'}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={mediaPrefs.autoplay}
                      onChange={(e) => handleSaveMediaPref({ autoplay: e.target.checked })}
                      className="w-4 h-4 accent-orange-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                    <label className="block font-bold text-slate-200">
                      {isBengali ? 'ডিফল্ট আপলোড কোয়ালিটি' : 'Media Upload Quality'}
                    </label>
                    <select
                      value={mediaPrefs.mediaQuality}
                      onChange={(e) => handleSaveMediaPref({ mediaQuality: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium"
                    >
                      <option value="standard">{isBengali ? 'স্ট্যান্ডার্ড (ভারসাম্যপূর্ণ)' : 'Standard (Balanced 1080p)'}</option>
                      <option value="high">{isBengali ? 'হাই ডেফিনিশন (সর্বোচ্চ কোয়ালিটি)' : 'High Definition (Original quality)'}</option>
                      <option value="data_saver">{isBengali ? 'ডাটা সাশ্রয়ী (৭২০পি)' : 'Data Saver (720p Optimized)'}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 9: STORAGE & DOWNLOADS */}
            {activeSection === 'storage' && (
              <div className="space-y-4">
                {/* Header card with Refresh */}
                <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-emerald-400">
                          {isBengali ? 'স্টোরেজ ও ডাউনলোড ব্যবস্থাপনা' : 'Storage & Downloads Management'}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {isBengali ? 'লোকাল-ফার্স্ট স্টোরেজ, ক্যাশ এবং R2 ক্লাউড কোটা' : 'Local-first media, cache, downloads & R2 zero-budget safety'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={loadStorageData}
                      disabled={isRefreshingStorage}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStorage ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{isBengali ? 'রিফ্রেশ' : 'Refresh'}</span>
                    </button>
                  </div>

                  {/* Device Storage Status & Low Storage Warning */}
                  {deviceStorage?.isLowStorage && (
                    <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">
                          {isBengali ? 'ডিভাইস স্টোরেজ প্রায় পূর্ণ!' : 'Device storage is nearly full!'}
                        </strong>
                        <span className="text-[11px] text-amber-300/90 leading-tight">
                          {isBengali
                            ? 'নতুন ছবি, ভিডিও বা অডিও ডাউনলোড করতে ডিভাইসের কিছুটা জায়গা খালি করুন।'
                            : 'Available storage is under 100 MB. Free up device memory to continue downloading attachments.'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Storage Breakdown Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col justify-between">
                      <div>
                        <span className="text-slate-400 text-[10px] block">
                          {isBengali ? '🖼️ ছবির ক্যাশ' : '🖼️ Photos Cache'}
                        </span>
                        <strong className="text-sm font-mono text-white block mt-0.5">
                          {((cacheUsage?.imagesBytes || 0) / 1024).toFixed(1)} KB
                        </strong>
                        <span className="text-[10px] text-slate-500 block">
                          {cacheUsage?.imagesCount || 0} {isBengali ? 'টি আইটেম' : 'items'}
                        </span>
                      </div>
                      {(cacheUsage?.imagesBytes || 0) > 0 && (
                        <button
                          type="button"
                          onClick={handleClearImageCache}
                          className="mt-2 text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/60 font-semibold transition-colors cursor-pointer"
                        >
                          {isBengali ? 'ছবি মুছুন' : 'Clear Photos'}
                        </button>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col justify-between">
                      <div>
                        <span className="text-slate-400 text-[10px] block">
                          {isBengali ? '🎬 ভিডিও ক্যাশ' : '🎬 Videos Cache'}
                        </span>
                        <strong className="text-sm font-mono text-white block mt-0.5">
                          {((cacheUsage?.videosBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                        </strong>
                        <span className="text-[10px] text-slate-500 block">
                          {cacheUsage?.videosCount || 0} {isBengali ? 'টি আইটেম' : 'items'}
                        </span>
                      </div>
                      {(cacheUsage?.videosBytes || 0) > 0 && (
                        <button
                          type="button"
                          onClick={handleClearVideoCache}
                          className="mt-2 text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/60 font-semibold transition-colors cursor-pointer"
                        >
                          {isBengali ? 'ভিডিও মুছুন' : 'Clear Videos'}
                        </button>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col justify-between">
                      <div>
                        <span className="text-slate-400 text-[10px] block">
                          {isBengali ? '🎙️ ভয়েস ক্যাশ' : '🎙️ Audio Notes'}
                        </span>
                        <strong className="text-sm font-mono text-white block mt-0.5">
                          {((cacheUsage?.audioBytes || 0) / 1024).toFixed(1)} KB
                        </strong>
                        <span className="text-[10px] text-slate-500 block">
                          {cacheUsage?.audioCount || 0} {isBengali ? 'টি আইটেম' : 'items'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col justify-between">
                      <div>
                        <span className="text-slate-400 text-[10px] block">
                          {isBengali ? '💾 সেভ করা ফাইল' : '💾 Saved to Device'}
                        </span>
                        <strong className="text-sm font-mono text-emerald-400 block mt-0.5">
                          {((cacheUsage?.downloadedBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                        </strong>
                        <span className="text-[10px] text-slate-400 block">
                          {cacheUsage?.downloadedCount || 0} {isBengali ? 'টি ফাইল' : 'files'}
                        </span>
                      </div>
                      <span className="mt-2 text-[9px] text-emerald-400/80 font-mono">
                        {isBengali ? 'সুরক্ষিত' : 'Preserved'}
                      </span>
                    </div>
                  </div>

                  {/* Clear Cache Action Bar */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">
                        {isBengali ? 'ক্যাশ মেমোরি পরিষ্কার করুন' : 'Clear Cache Memory'}
                      </span>
                      <span className="text-slate-400 text-[11px] block">
                        {isBengali
                          ? `মোট ক্যাশ: ${cacheUsage?.totalCacheMB || (deviceCacheKB / 1024).toFixed(1)} MB (আসল পোস্ট, মেসেজ ও সেভ করা ফাইল কখনো মুছে যাবে না)`
                          : `Total cache: ${cacheUsage?.totalCacheMB || (deviceCacheKB / 1024).toFixed(1)} MB (real posts, messages and saved downloads are never deleted)`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleClearImageCache}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                      >
                        {isBengali ? '🖼️ ছবির ক্যাশ' : '🖼️ Photos'}
                      </button>
                      <button
                        type="button"
                        onClick={handleClearVideoCache}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                      >
                        {isBengali ? '🎬 ভিডিও ক্যাশ' : '🎬 Videos'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowClearCacheModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold border border-rose-500/30 text-xs transition-colors cursor-pointer"
                      >
                        {isBengali ? 'সম্পূর্ণ ক্যাশ মুছুন' : 'Clear All Cache'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 2: Auto-Download & Saving Controls */}
                <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    {isBengali ? 'স্বয়ংক্রিয় ডাউনলোড ও সেভ সেটিংস' : 'Auto-Download & Device Saving Preferences'}
                  </h4>

                  <div className="space-y-3 text-xs">
                    {/* Save media to device toggle */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                      <div>
                        <span className="font-bold text-slate-200 block">
                          {isBengali ? 'ডিভাইসে মিডিয়া সংরক্ষণ করুন' : 'Save media to device'}
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          {isBengali
                            ? 'আগত ছবি, ভিডিও ও ভয়েস নোট স্বয়ংক্রিয়ভাবে ডাউনলোড ও ডিভাইসে সেভ হবে'
                            : 'Save received photos, videos and voice notes to this device when downloaded'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(storagePrefs.saveMediaToDevice)}
                        onChange={(e) => handleSaveStoragePref({ saveMediaToDevice: e.target.checked })}
                        className="w-4 h-4 accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    {/* Wi-Fi only toggle */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                      <div>
                        <span className="font-bold text-slate-200 block">
                          {isBengali ? 'কেবলমাত্র ওয়াই-ফাই সংযোগে অটো-ডাউনলোড' : 'Wi-Fi-only auto-download'}
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          {isBengali
                            ? 'মোবাইল ডাটা সাশ্রয়ে কেবল ওয়াই-ফাই পেলে ছবি ও অডিও ডাউনলোড হবে'
                            : 'Restrict automatic downloads to Wi-Fi networks to save cellular data'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(storagePrefs.wifiOnly)}
                        onChange={(e) => handleSaveStoragePref({ wifiOnly: e.target.checked })}
                        className="w-4 h-4 accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    {/* Save to Gallery toggle */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                      <div>
                        <span className="font-bold text-slate-200 block">
                          {isBengali ? 'গ্যালারিতে সরাসরি সেভ (Save to Gallery)' : 'Save to Gallery (with permission)'}
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          {isBengali
                            ? 'ডাউনলোড করা ছবি ও ভিডিও ডিভাইসের ফটো গ্যালারিতে সরাসরি যোগ হবে'
                            : 'Export downloaded photos and videos directly into device media gallery'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(storagePrefs.saveToGallery)}
                        onChange={(e) => handleSaveStoragePref({ saveToGallery: e.target.checked })}
                        className="w-4 h-4 accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    {/* Granular Auto-Download Rules */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-1.5">
                        <label className="block font-bold text-slate-200">
                          {isBengali ? 'ছবির অটো-ডাউনলোড' : 'Photos Auto-Download'}
                        </label>
                        <select
                          value={storagePrefs.autoDownloadPhotos || 'never'}
                          onChange={(e) => handleSaveStoragePref({ autoDownloadPhotos: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                        >
                          <option value="never">{isBengali ? 'কখনো নয় (Never)' : 'Never'}</option>
                          <option value="wifi_only">{isBengali ? 'শুধু ওয়াই-ফাই (Wi-Fi Only)' : 'Wi-Fi Only'}</option>
                          <option value="always">{isBengali ? 'সর্বদা (Always)' : 'Always'}</option>
                        </select>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-1.5">
                        <label className="block font-bold text-slate-200">
                          {isBengali ? 'ভিডিও অটো-ডাউনলোড' : 'Videos Auto-Download'}
                        </label>
                        <select
                          value={storagePrefs.autoDownloadVideos || 'never'}
                          onChange={(e) => handleSaveStoragePref({ autoDownloadVideos: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                        >
                          <option value="never">{isBengali ? 'কখনো নয় (Never)' : 'Never'}</option>
                          <option value="wifi_only">{isBengali ? 'শুধু ওয়াই-ফাই (Wi-Fi Only)' : 'Wi-Fi Only'}</option>
                          <option value="always">{isBengali ? 'সর্বদা (Always)' : 'Always'}</option>
                        </select>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-1.5">
                        <label className="block font-bold text-slate-200">
                          {isBengali ? 'ভয়েস নোট ডাউনলোড' : 'Voice Notes Download'}
                        </label>
                        <select
                          value={storagePrefs.autoDownloadVoiceNotes || 'wifi_only'}
                          onChange={(e) => handleSaveStoragePref({ autoDownloadVoiceNotes: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                        >
                          <option value="never">{isBengali ? 'কখনো নয় (Never)' : 'Never'}</option>
                          <option value="wifi_only">{isBengali ? 'শুধু ওয়াই-ফাই (Wi-Fi Only)' : 'Wi-Fi Only'}</option>
                          <option value="always">{isBengali ? 'সর্বদা (Always)' : 'Always'}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Cloud Media Delivery vs Local-Only Media */}
                <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-blue-400" />
                    {isBengali ? 'ক্লাউড বনাম লোকাল মিডিয়া ও গোপনীয়তা' : 'Cloud Delivery vs Local-Only Media'}
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                      <div>
                        <span className="font-bold text-slate-200 block">
                          {isBengali ? 'ক্লাউড মিডিয়া ডেলিভারি (প্রস্তাবিত)' : 'Cloud Media Delivery (Recommended)'}
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          {isBengali
                            ? 'প্রাপক অফলাইনে থাকাকালীন এবং একাধিক ডিভাইসে অ্যাক্সেসের জন্য ব্যাকআপ সক্রিয় রাখুন'
                            : 'Retains secure cloud delivery so recipients can view attachments even when you are offline'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(storagePrefs.cloudDelivery)}
                        onChange={(e) => handleSaveStoragePref({ cloudDelivery: e.target.checked })}
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                      <div>
                        <span className="font-bold text-slate-200 block">
                          {isBengali ? 'লোকাল-অনলি মিডিয়া মোড' : 'Local-only media mode'}
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          {isBengali
                            ? 'মিডিয়া শুধু আপনার ডিভাইসে থাকবে, ক্লাউডে সংরক্ষণ করা হবে না'
                            : 'Stores media files exclusively on this device without uploading to cloud servers'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(storagePrefs.localOnlyMedia)}
                        onChange={(e) => handleSaveStoragePref({ localOnlyMedia: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Prominent Transparent Warning Box */}
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5 leading-relaxed">
                      <div className="font-bold flex items-center gap-1.5 text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          {isBengali ? 'গুরুত্বপূর্ণ সতর্কতা: লোকাল-অনলি মিডিয়া' : 'Important Notice: Local-Only Media'}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/90">
                        {isBengali
                          ? 'লোকাল-অনলি মিডিয়া কেবল আপনার এই নির্দিষ্ট ডিভাইসেই সংরক্ষিত থাকে। এটি অন্য কোনো ফোনে বা ব্রাউজারে পাওয়া যাবে না এবং অ্যাপ ডেটা মুছলে বা ফোন হারিয়ে গেলে স্থায়ীভাবে নষ্ট হতে পারে। তবে টেক্সট মেসেজ সর্বদাই নিরাপদ ডাটাবেজে সংরক্ষিত থাকে। প্রাপক অফলাইনে থাকাকালীন নির্ভরযোগ্য ডেলিভারির জন্য ক্লাউড ডেলিভারি সক্রিয় রাখা বাঞ্ছনীয়।'
                          : 'Local-only media is stored solely on this device. It will NOT be available on other devices and can be permanently lost if app data is cleared or your phone is lost. Text messages and thread metadata always remain safely persistent. For recipients who need access when you are offline, retain the cloud-delivery option.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 4: Cloudflare R2 Free-Tier Safety Telemetry */}
                <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      {isBengali ? 'ক্লাউডফ্লেয়ার R2 ফ্রি-টিয়ার নিরাপত্তা কোটা' : 'Cloudflare R2 Free-Tier Safety Telemetry'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[10px] font-bold">
                      {r2Quota?.status === 'ok' ? 'Free-Tier Safe' : r2Quota?.status || 'Active'}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs font-mono">
                    {/* Storage progress */}
                    <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-slate-300 text-xs">
                        <span className="font-sans font-semibold">
                          {isBengali ? 'অবজেক্ট স্টোরেজ ক্যাপাসিটি' : 'Tracked Storage Capacity'}
                        </span>
                        <span className="text-white font-bold">
                          {r2Quota?.storageUsedGB ?? 0} GB / 9.50 GB Hard Pause
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            (r2Quota?.storagePercentOfLimit || 0) > 90
                              ? 'bg-rose-500'
                              : (r2Quota?.storagePercentOfLimit || 0) > 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, r2Quota?.storagePercentOfLimit || 0)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                        <span>
                          {isBengali ? 'অবশিষ্ট ফ্রি ক্যাপাসিটি:' : 'Remaining capacity:'}{' '}
                          <strong className="text-emerald-400 font-mono font-bold">
                            {r2Quota?.storageRemainingGB ?? 9.5} GB
                          </strong>
                        </span>
                        <span>
                          {isBengali ? 'হার্ড কাটঅফ:' : 'Hard stop:'}{' '}
                          <strong className="text-white font-mono">9.5 GB</strong>
                        </span>
                      </div>
                    </div>

                    {/* Operations Quotas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-1">
                        <div className="text-slate-400 text-[11px] font-sans">
                          {isBengali ? 'Class A অপারেশনস (মাসে ১M ফ্রি):' : 'Class A Operations (1M free/mo):'}
                        </div>
                        <div className="text-sm font-bold text-white">
                          {(r2Quota?.classAOperations || 0).toLocaleString()} / 900,000
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          {isBengali ? '৯০% লিমিটে পুশ পজ সক্রিয় হবে' : '90% hard halt threshold'}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-1">
                        <div className="text-slate-400 text-[11px] font-sans">
                          {isBengali ? 'Class B অপারেশনস (মাসে ১০M ফ্রি):' : 'Class B Operations (10M free/mo):'}
                        </div>
                        <div className="text-sm font-bold text-white">
                          {(r2Quota?.classBOperations || 0).toLocaleString()} / 9,000,000
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          {isBengali ? '৯০% লিমিটে রিড পজ সক্রিয় হবে' : '90% hard halt threshold'}
                        </div>
                      </div>
                    </div>

                    {/* Local Disk Fallback Safety Limit */}
                    <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="font-sans font-bold text-slate-200 block text-xs">
                          {isBengali ? 'লোকাল ডিস্ক ফলব্যাক কোটা' : 'Local Disk Fallback Quota'}
                        </span>
                        <span className="text-slate-400 text-[11px] font-sans block">
                          {isBengali
                            ? `ব্যবহৃত: ${r2Quota?.localDiskUsedMB ?? 0} MB / সর্বোচ্চ 2.0 GB সিলিং (হোস্টিং সুরক্ষা)`
                            : `Used: ${r2Quota?.localDiskUsedMB ?? 0} MB / 2.0 GB ceiling (protects hosting disk)`}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px]">
                        2.0 GB Max
                      </span>
                    </div>

                    {/* Telemetry Timestamp & Billing Disclaimer */}
                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-1 font-sans">
                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>{isBengali ? 'সর্বশেষ সিঙ্ক সময়:' : 'Last telemetry refresh:'}</span>
                        <span className="font-mono text-slate-300">
                          {r2Quota?.lastRefreshTime ? new Date(r2Quota.lastRefreshTime).toLocaleTimeString() : 'Live'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed italic">
                        {isBengali
                          ? 'সতর্কবার্তা: অ্যাপ-সাইড এস্টিমেট জিরো-বিলিং গ্যারান্টি দেয় না কারণ ক্লাউডফ্লেয়ার টেলিমিত্রি প্রপাগেশনে কিছুটা বিলম্ব থাকতে পারে। কোনো পেইড ক্লাউডফ্লেয়ার প্রোডাক্ট সক্রিয় নয়।'
                          : (r2Quota?.disclaimer ||
                            'Application-level quotas are designed to prevent accidental overages, but do not guarantee zero charges because Cloudflare usage telemetry may experience propagation delays. No paid Cloudflare products or additional paid tiers are activated.')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 5: Downloaded Files Manager */}
                <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {isBengali ? 'ডিভাইসে সেভ করা ফাইল তালিকা' : 'Downloaded Media Files on Device'}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {downloadedFiles.length} {isBengali ? 'টি আইটেম' : 'items'}
                    </span>
                  </div>

                  {downloadedFiles.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs rounded-2xl bg-slate-950/30 border border-slate-800/60">
                      {isBengali
                        ? 'ডিভাইসে এখনও কোনো মিডিয়া সেভ করা হয়নি। মেসেজে আসা ছবি বা ভিডিও ডাউনলোড করলে এখানে দৃশ্যমান হবে।'
                        : 'No downloaded media saved to device yet. Photos, videos, and voice notes saved in direct messages will appear here.'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {downloadedFiles.map((file, idx) => (
                        <div
                          key={file.url || idx}
                          className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 text-xs font-mono">
                              {file.mediaType === 'image' ? '📷' : file.mediaType === 'video' ? '🎬' : '🎙️'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-200 block truncate text-xs">
                                {file.fileName || `media_${idx + 1}`}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {((file.sizeBytes || 0) / 1024).toFixed(1)} KB •{' '}
                                {file.downloadedAt ? new Date(file.downloadedAt).toLocaleDateString() : 'Saved'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 rounded-xl hover:bg-rose-500/20 text-rose-400 transition-colors shrink-0 cursor-pointer"
                            title={isBengali ? 'ফাইল মুছুন (নিশ্চিতকরণ প্রয়োজন)' : 'Delete file (confirmation required)'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 10: ACCESSIBILITY */}
            {activeSection === 'accessibility' && (
              <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="font-bold text-sm text-violet-400 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {isBengali ? 'অ্যাক্সেসিবিলিটি ও ডিসপ্লে মোড' : 'Accessibility & Comfort'}
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-slate-200 block">{isBengali ? 'উচ্চ কনট্রাস্ট মোড' : 'High Contrast Mode'}</span>
                      <span className="text-slate-400 text-[11px] block">{isBengali ? 'টেক্সট ও ব্যাকগ্রাউন্ডের মধ্যে বৈসাদৃশ্য বাড়িয়ে পড়ার সুবিধা বৃদ্ধি' : 'Increase color contrast for enhanced legibility'}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={highContrast}
                      onChange={(e) => setHighContrast(e.target.checked)}
                      className="w-4 h-4 accent-violet-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-slate-200 block">{isBengali ? 'বড় আরামদায়ক ফন্ট' : 'Larger Font Size'}</span>
                      <span className="text-slate-400 text-[11px] block">{isBengali ? 'অ্যাপের সমস্ত লেখার আকার বড় করুন' : 'Increase base typography size for mobile comfort'}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={largeFont}
                      onChange={(e) => setLargeFont(e.target.checked)}
                      className="w-4 h-4 accent-violet-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                    <div>
                      <span className="font-bold text-slate-200 block">{isBengali ? 'অ্যানিমেশন হ্রাস (Reduce Motion)' : 'Reduce Motion'}</span>
                      <span className="text-slate-400 text-[11px] block">{isBengali ? 'স্ক্রিন ট্রানজিশন ও অ্যানিমেশন বন্ধ রাখুন' : 'Minimize screen transition effects'}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={reduceMotion}
                      onChange={(e) => setReduceMotion(e.target.checked)}
                      className="w-4 h-4 accent-violet-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 11: LANGUAGE */}
            {activeSection === 'language' && (
              <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="font-bold text-sm text-pink-400 flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  {isBengali ? 'অ্যাপের ভাষা নির্বাচন' : 'Language Selection'}
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (!isBengali) onLanguageToggle();
                      showToast('বাংলা ভাষা সক্রিয় করা হয়েছে');
                    }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-colors ${
                      isBengali
                        ? 'bg-pink-500/15 border-pink-500/40 text-pink-300 font-bold'
                        : isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div>
                      <span className="block text-sm">বাংলা (Bengali)</span>
                      <span className="text-[11px] text-slate-400">বাংলাদেশি ক্রিয়েটরদের জন্য পূর্ণাঙ্গ বাংলা সহায়তা</span>
                    </div>
                    {isBengali && <CheckCircle2 className="w-4 h-4 text-pink-400" />}
                  </button>

                  <button
                    onClick={() => {
                      if (isBengali) onLanguageToggle();
                      showToast('English language activated');
                    }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-colors ${
                      !isBengali
                        ? 'bg-pink-500/15 border-pink-500/40 text-pink-300 font-bold'
                        : isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div>
                      <span className="block text-sm">English</span>
                      <span className="text-[11px] text-slate-400">Global creator language experience</span>
                    </div>
                    {!isBengali && <CheckCircle2 className="w-4 h-4 text-pink-400" />}
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 12: THEME */}
            {activeSection === 'theme' && (
              <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                  {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  {isBengali ? 'ডিসপ্লে থিম নির্বাচন' : 'Color Theme'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      if (!isDark) toggleTheme();
                      showToast(isBengali ? 'ডার্ক মোড সক্রিয়' : 'Dark Mode Active');
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer text-center space-y-2 transition-all ${
                      isDark
                        ? 'bg-slate-900 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Moon className="w-6 h-6 mx-auto text-indigo-400" />
                    <span className="font-bold text-xs block text-white">Dark OLED</span>
                    <span className="text-[10px] text-slate-400 block">{isBengali ? 'চোখের জন্য আরামদায়ক' : 'Deep contrast'}</span>
                  </div>

                  <div
                    onClick={() => {
                      if (isDark) toggleTheme();
                      showToast(isBengali ? 'লাইট মোড সক্রিয়' : 'Light Mode Active');
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer text-center space-y-2 transition-all ${
                      !isDark
                        ? 'bg-white border-indigo-500 text-indigo-600 ring-2 ring-indigo-500/30 shadow-md'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <Sun className="w-6 h-6 mx-auto text-amber-500" />
                    <span className="font-bold text-xs block text-slate-900">Light Clean</span>
                    <span className="text-[10px] text-slate-500 block">{isBengali ? 'পরিষ্কার সাদা থিম' : 'Crisp daylight'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 13: CREATOR TOOLS */}
            {activeSection === 'creator' && (
              <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {isBengali ? 'ক্রিয়েটর টুলস ও শিডিউলিং' : 'Creator Studio & Scheduling'}
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold block text-sm">{isBengali ? 'শিডিউলড পোস্ট স্টুডিও' : 'Scheduled Posts Studio'}</span>
                      <span className="text-[11px] text-slate-400 block">{isBengali ? 'নির্দিষ্ট সময়ে স্বয়ংক্রিয়ভাবে পোস্ট প্রকাশের ক্যালেন্ডার' : 'Automated publication queue and calendar'}</span>
                    </div>
                    <Calendar className="w-5 h-5 text-cyan-400" />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-300 space-y-2">
                    <span className="font-bold block text-sm">{isBengali ? 'বিজ্ঞাপন ব্যানার ও রিওয়ার্ড সেটিংস' : 'Ad Units Status'}</span>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>AdMob Provider:</span>
                      <strong className="text-white">{adConfig.isTestMode ? 'Test Suite (Sandboxed)' : 'Live Mobile Ads'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Ads Enabled:</span>
                      <strong className={adConfig.adsEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                        {adConfig.adsEnabled ? 'Active' : 'Disabled'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 14: MONETIZATION */}
            {activeSection === 'monetization' && (
              <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {isBengali ? 'ক্রিয়েটর পালস ও পেআউট নিয়মাবলী' : 'Monetization Rules & Rails'}
                </h3>
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl text-xs space-y-2 text-emerald-200">
                  <div className="font-bold text-sm text-emerald-300">
                    {isBengali ? '💰 ৭০% ক্রিয়েটর রেভিনিউ শেয়ার' : '💰 70% Creator Revenue Share'}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {isBengali
                      ? 'Zan-Gi প্ল্যাটফর্মে ক্রিয়েটররা তাদের অর্জিত বিজ্ঞাপনী আয়ের ৭০% সরাসরি তাদের বিকাশ, নগদ অথবা রকেট ওয়ালেটে উত্তোলন করতে পারেন। সর্বনিম্ন উত্তোলন সীমা ১০০.০০ মার্কিন ডলার (১০,০০০ কয়েন)।'
                      : 'Creators receive 70% of verified ad impressions credited as Creator Coins. Minimum withdrawal boundary is $100.00 USD via supported rails.'}
                  </p>
                  <div className="pt-2 border-t border-emerald-800/40 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold font-mono text-[10px]">bKash</span>
                    <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold font-mono text-[10px]">Nagad</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold font-mono text-[10px]">Rocket</span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 15: HELP & COMMUNITY STANDARDS */}
            {activeSection === 'help' && (
              <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  {isBengali ? 'কমিউনিটি স্ট্যান্ডার্ড ও নীতিমালা' : 'Community Standards & Support'}
                </h3>
                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-1">
                    <span className="font-bold text-white block">১. সততা ও সম্মান প্রদর্শন (Respect & Safety)</span>
                    <p className="text-slate-400 text-[11px]">কোনো প্রকার ঘৃণামূলক বক্তব্য, হয়রানি বা প্রতারণা বরদাস্ত করা হয় না।</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-1">
                    <span className="font-bold text-white block">২. কনটেন্ট কপিরাইট ও এআই স্বচ্ছতা</span>
                    <p className="text-slate-400 text-[11px]">অন্যের সৃষ্টি চুরি না করা এবং এআই দিয়ে তৈরি হলে উপযুক্ত লেবেল ব্যবহার করা বাঞ্ছনীয়।</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-1">
                    <span className="font-bold text-white block">৩. আপিল ও বিরোধ নিষ্পত্তি</span>
                    <p className="text-slate-400 text-[11px]">কোনো পোস্ট ফ্ল্যাগ হলে স্বচ্ছ অডিট লগের মাধ্যমে পুনর্বিবেচনা আবেদন করার অধিকার রয়েছে।</p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 16: ADMIN CENTER (IN CASE DIRECT DRILL-DOWN) */}
            {activeSection === 'admin' && (
              <div className="space-y-4">
                {isOwnerOrAdmin ? (
                  <div className={`p-4 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        {isBengali ? '👑 মাস্টার অ্যাডমিন কন্ট্রোল সেন্টার' : '👑 Master Admin Control Center (11 Modules)'}
                      </h3>
                      {onOpenAdmin && (
                        <button
                          onClick={onOpenAdmin}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>{isBengali ? 'ফুলস্ক্রিন অ্যাডমিন' : 'Open Admin Panel'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isBengali
                        ? 'আপনি প্ল্যাটফর্ম ওনার / অ্যাডমিন হিসেবে অনুমোদিত। অ্যাডমিন প্যানেল থেকে ইউজারদের ভূমিকা, রিপোর্ট মডারেশন, বিকাশ/নগদ/রকেট পেআউট অনুমোদন এবং এআই কনফিগারেশন পরিচালনা করতে পারবেন।'
                        : 'Authorized administrator session active. Access full user moderation, payout dispatches, AI limits, and platform financial ledgers.'}
                    </p>
                  </div>
                ) : bootstrapInfo?.canBootstrap ? (
                  <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-3xl space-y-3 text-xs">
                    <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      {isBengali ? 'প্রথম ওনার অ্যাকাউন্ট বুটস্ট্র্যাপ' : 'First-Owner Account Bootstrap'}
                    </h3>
                    <p className="text-slate-300">
                      {isBengali
                        ? 'এই সিস্টেমে এখনও কোনো ওনার অ্যাকাউন্ট নেই। সার্ভারে OWNER_BOOTSTRAP_SECRET কনফিগার থাকলে লগইন ডায়ালগে "প্রথম ওনার সেটআপ" থেকে অ্যাকাউন্ট সক্রিয় করুন।'
                        : 'No Owner account currently exists. Open the sign-in modal and click "First-Owner Setup" with the server secret.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    {isBengali ? 'অ্যাডমিন সেন্টার শুধুমাত্র অনুমোদিত ওনার ও অ্যাডমিনদের জন্য সীমিত।' : 'Admin Center is restricted to authorized owners and administrators.'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CLEAR CACHE CONFIRMATION MODAL */}
        {showClearCacheModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className={`w-full max-w-sm rounded-3xl p-5 border space-y-4 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {isBengali ? 'ক্যাশ মুছার নিশ্চয়তা' : 'Clear Storage Cache'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {isBengali ? 'আপনার সেভ করা ফাইল সুরক্ষিত থাকবে' : 'Your saved downloads remain intact'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isBengali
                  ? 'সাময়িক ড্রাফট ও ইমেজ প্রিভিউ ক্যাশ মুছে ফেলা হবে। তবে আপনার চ্যাট বার্তা এবং ডিভাইসে সেভ করা কোনো ফাইল মোছা হবে না।'
                  : 'Temporary studio drafts and preview cache will be cleared. Your message history and explicitly saved files will NOT be deleted.'}
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearCacheModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {isBengali ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleClearCacheConfirmed(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isBengali ? 'ক্যাশ মুছুন' : 'Clear Cache'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE DOWNLOADED FILE CONFIRMATION MODAL */}
        {fileToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className={`w-full max-w-sm rounded-3xl p-5 border space-y-4 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rose-400">
                    {isBengali ? 'ডাউনলোড করা ফাইল মুছবেন?' : 'Delete Downloaded Media?'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {isBengali ? 'নিশ্চিতকরণ আবশ্যক' : 'Confirmation required'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isBengali
                  ? `আপনি কি নিশ্চিতভাবে "${fileToDelete.fileName || 'মিডিয়া ফাইল'}" (${((fileToDelete.sizeBytes || 0) / 1024).toFixed(1)} KB) আপনার ডিভাইস থেকে মুছে ফেলতে চান? এটি পুনরায় ফিরিয়ে আনা সম্ভব নয়।`
                  : `Are you sure you want to delete "${fileToDelete.fileName || 'media file'}" (${((fileToDelete.sizeBytes || 0) / 1024).toFixed(1)} KB) from your device storage? This cannot be undone.`}
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFileToDelete(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {isBengali ? 'রাখুন (Cancel)' : 'Keep File'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteDownloadedFileConfirmed}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isBengali ? 'মুছে ফেলুন' : 'Delete File'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
