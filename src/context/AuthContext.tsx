import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (emailOrUsername: string, password?: string, twoFactorCode?: string) => Promise<{ success: boolean; requires2FA?: boolean; error?: string }>;
  register: (params: {
    email: string;
    username: string;
    displayName: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string; verificationCode?: string }>;
  googleLogin: (params: {
    email: string;
    displayName: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifyEmail: (code: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; resetCode?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (patch: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  deactivateAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updatePrivacy: (patch: { isPrivate?: boolean; whoCanComment?: 'everyone' | 'followers' | 'none'; whoCanMessage?: 'everyone' | 'followers' | 'none' }) => Promise<{ success: boolean; error?: string }>;
  blockUser: (targetId: string) => Promise<{ success: boolean; error?: string }>;
  unblockUser: (targetId: string) => Promise<{ success: boolean; error?: string }>;
  getBlockedUsers: () => Promise<any[]>;
  getSessions: () => Promise<any[]>;
  revokeSession: (tokenToRevoke: string) => Promise<{ success: boolean; error?: string }>;
  revokeOtherSessions: () => Promise<{ success: boolean; count?: number; error?: string }>;
  setup2FA: () => Promise<{ success: boolean; secret?: string; uri?: string; recoveryCodes?: string[]; error?: string }>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  disable2FA: (password: string) => Promise<{ success: boolean; error?: string }>;
  updateNotificationPrefs: (prefs: any) => Promise<{ success: boolean; error?: string }>;
  updateMediaPrefs: (prefs: any) => Promise<{ success: boolean; error?: string }>;
  updateStoragePrefs: (prefs: any) => Promise<{ success: boolean; storage?: any; error?: string }>;
  exportPersonalData: () => Promise<{ success: boolean; data?: any; error?: string }>;
  getAdminUsers: () => Promise<{ success: boolean; users?: any[]; error?: string }>;
  updateAdminUser: (targetId: string, patch: any) => Promise<{ success: boolean; error?: string }>;
  getAdminMetrics: () => Promise<{ success: boolean; metrics?: any; error?: string }>;
  getAdminReports: () => Promise<{ success: boolean; reports?: any[]; error?: string }>;
  resolveAdminReport: (reportId: string, action: 'dismiss' | 'delete_post') => Promise<{ success: boolean; error?: string }>;
  reportPost: (postId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  getAiAdminMetrics: () => Promise<{ success: boolean; metrics?: any; config?: any; error?: string }>;
  updateAiAdminConfig: (patch: any) => Promise<{ success: boolean; config?: any; error?: string }>;
  getScheduledPosts: () => Promise<{ success: boolean; scheduledPosts?: any[]; error?: string }>;
  createScheduledPost: (params: any) => Promise<{ success: boolean; scheduledPost?: any; error?: string }>;
  cancelScheduledPost: (id: string) => Promise<{ success: boolean; error?: string }>;
  triggerScheduledRunner: () => Promise<{ success: boolean; publishedCount?: number; error?: string }>;
  getBootstrapStatus: () => Promise<{ canBootstrap: boolean; hasOwner: boolean; secretConfigured: boolean }>;
  bootstrapOwner: (params: {
    secret: string;
    email: string;
    username: string;
    displayName: string;
    password: string;
    promoteExistingUserId?: string;
  }) => Promise<{ success: boolean; user?: any; error?: string }>;
  recoverOwner: (params: {
    recoverySecret: string;
    emailOrUsername: string;
    newPassword: string;
  }) => Promise<{ success: boolean; message?: string; error?: string }>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'zangi_auth_session_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Fetch /api/auth/me on mount or when token changes
  const refreshUser = async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(savedToken);
      } else {
        // Expired or invalid token
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.warn('Failed to verify session with backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (emailOrUsername: string, password?: string, twoFactorCode?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password, twoFactorCode }),
      });
      const data = await res.json();

      if (data.requires2FA) {
        setIsLoading(false);
        return { success: false, requires2FA: true, error: data.message };
      }

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setIsLoading(false);
        return { success: false, error: data.error };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Network error during login';
      setError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  const register = async (params: {
    email: string;
    username: string;
    displayName: string;
    password: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setIsLoading(false);
        return { success: false, error: data.error };
      }

      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
      }
      setIsLoading(false);
      return { success: true, verificationCode: data.verificationCode };
    } catch (err: any) {
      const msg = err.message || 'Network error during registration';
      setError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  const googleLogin = async (params: {
    email: string;
    displayName: string;
    avatarUrl?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Google authentication failed');
        setIsLoading(false);
        return { success: false, error: data.error };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Network error connecting to Google Auth';
      setError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    const currentToken = token || localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch (e) {
        // Continue clearing client state regardless
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  };

  const verifyEmail = async (code: string) => {
    if (!token) return { success: false, error: 'Must be logged in to verify email' };
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      if (user) {
        setUser({ ...user, isEmailVerified: true });
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Verification failed' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return { success: true, resetCode: data.resetCode };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updateProfile = async (patch: Partial<User>) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      setUser(data.user);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const deactivateAccount = async (password: string) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/auth/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      await logout();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const deleteAccount = async (password: string) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/auth/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      await logout();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updatePrivacy = async (patch: { isPrivate?: boolean; whoCanComment?: 'everyone' | 'followers' | 'none'; whoCanMessage?: 'everyone' | 'followers' | 'none' }) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/users/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      if (user) {
        setUser({ ...user, isPrivate: data.isPrivate, whoCanComment: data.whoCanComment, whoCanMessage: data.whoCanMessage });
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const blockUser = async (targetId: string) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch(`/api/users/block/${targetId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      if (user) {
        const nextBlocked = user.blockedUserIds ? [...user.blockedUserIds, targetId] : [targetId];
        setUser({ ...user, blockedUserIds: nextBlocked });
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const unblockUser = async (targetId: string) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch(`/api/users/unblock/${targetId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      if (user && user.blockedUserIds) {
        setUser({ ...user, blockedUserIds: user.blockedUserIds.filter(id => id !== targetId) });
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const getBlockedUsers = async () => {
    if (!token) return [];
    try {
      const res = await fetch('/api/users/blocked', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.blockedUsers || [];
    } catch {
      return [];
    }
  };

  const getSessions = async () => {
    if (!token) return [];
    try {
      const res = await fetch('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.sessions || [];
    } catch {
      return [];
    }
  };

  const revokeSession = async (tokenToRevoke: string) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: tokenToRevoke }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const revokeOtherSessions = async () => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/auth/sessions/revoke-others', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, count: data.count };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const setup2FA = async () => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, secret: data.secret, uri: data.uri, recoveryCodes: data.recoveryCodes };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const verify2FA = async (code: string) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/auth/2fa/verify-enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      if (user) setUser({ ...user, twoFactorEnabled: true });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const disable2FA = async (password: string) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      if (user) setUser({ ...user, twoFactorEnabled: false });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updateNotificationPrefs = async (prefs: any) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/users/preferences/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      if (user) setUser({ ...user, notificationPreferences: data.notifications });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updateMediaPrefs = async (prefs: any) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/users/preferences/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      if (user) setUser({ ...user, mediaPreferences: data.media });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updateStoragePrefs = async (prefs: any) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/users/preferences/storage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      if (user) setUser({ ...user, storagePreferences: data.storage });
      return { success: true, storage: data.storage };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const getAdminUsers = async () => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, users: data.users };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updateAdminUser = async (targetId: string, patch: any) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch(`/api/admin/users/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const getAdminMetrics = async () => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, metrics: data.metrics };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const getAdminReports = async () => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/admin/reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, reports: data.reports };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const resolveAdminReport = async (reportId: string, action: 'dismiss' | 'delete_post') => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const reportPost = async (postId: string, reason: string) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch(`/api/posts/${postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const exportPersonalData = async () => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/user/export-data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Export failed' };
    }
  };

  const getAiAdminMetrics = async () => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/admin/ai-metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, metrics: data.metrics, config: data.config };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to load AI metrics' };
    }
  };

  const updateAiAdminConfig = async (patch: any) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, config: data.config };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to update AI config' };
    }
  };

  const getScheduledPosts = async () => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/scheduled-posts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, scheduledPosts: data.scheduledPosts };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to load scheduled posts' };
    }
  };

  const createScheduledPost = async (params: any) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/scheduled-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, scheduledPost: data.scheduledPost };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to schedule post' };
    }
  };

  const cancelScheduledPost = async (id: string) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch(`/api/scheduled-posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to cancel scheduled post' };
    }
  };

  const triggerScheduledRunner = async () => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch('/api/scheduled-posts/trigger-runner', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, publishedCount: data.publishedCount };
    } catch (e: any) {
      return { success: false, error: e.message || 'Runner failed' };
    }
  };

  const getBootstrapStatus = async () => {
    try {
      const res = await fetch('/api/auth/bootstrap-status');
      if (res.ok) {
        return await res.json();
      }
      return { canBootstrap: false, hasOwner: true, secretConfigured: false };
    } catch {
      return { canBootstrap: false, hasOwner: true, secretConfigured: false };
    }
  };

  const bootstrapOwner = async (params: {
    secret: string;
    email: string;
    username: string;
    displayName: string;
    password: string;
    promoteExistingUserId?: string;
  }) => {
    try {
      const res = await fetch('/api/auth/bootstrap-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        if (data.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
          setToken(data.token);
        }
        setUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'Failed to bootstrap owner account' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error during bootstrap' };
    }
  };

  const recoverOwner = async (params: {
    recoverySecret: string;
    emailOrUsername: string;
    newPassword: string;
  }) => {
    try {
      const res = await fetch('/api/auth/owner-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Recovery failed' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        error,
        login,
        register,
        googleLogin,
        logout,
        verifyEmail,
        forgotPassword,
        resetPassword,
        updateProfile,
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
        getAdminUsers,
        updateAdminUser,
        getAdminMetrics,
        getAdminReports,
        resolveAdminReport,
        reportPost,
        getAiAdminMetrics,
        updateAiAdminConfig,
        getScheduledPosts,
        createScheduledPost,
        cancelScheduledPost,
        triggerScheduledRunner,
        getBootstrapStatus,
        bootstrapOwner,
        recoverOwner,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
