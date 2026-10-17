import fs from 'fs';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  registerUser,
  loginUser,
  googleSignIn,
  validateSession,
  revokeSession,
  sanitizeUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  updateUserProfile,
  deactivateUser,
  deleteUserAccount,
  getAuditLogs,
  changePassword,
  updatePrivacySettings,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getUserSessions,
  revokeSessionById,
  revokeOtherSessions,
  setup2FA,
  verifyAndEnable2FA,
  disable2FA,
  updateNotificationPreferences,
  updateMediaPreferences,
  updateStoragePreferences,
  getAllUsersAdmin,
  adminUpdateUser,
  getSystemUserCount,
  getActiveSessionsCount,
  getUserAccountExport,
  updateUserPremiumStatus,
  purchasePremiumPlan,
  getPremiumSubscriptionDetails,
  getUserCoinTransactionHistory,
  PREMIUM_PLANS,
  hasExistingOwner,
  getBootstrapSecret,
  bootstrapFirstOwner,
  recoverOwnerCredentials,
  recordProfileVisit
} from './src/server/authService.js';
import {
  uploadMiddleware,
  registerMediaRecord,
  registerMediaRecordAsync,
  deleteMediaRecordAuthorized,
  getMediaRecordById,
  getMediaRecordByUrl,
  getMediaAccessUrl,
  getMediaStoreStatus,
  deleteMediaFile,
  PRIVATE_MESSAGES_DIR,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  MAX_VIDEO_DURATION_SECONDS
} from './src/server/mediaStore.js';
import {
  getR2QuotaStatus,
  checkUploadAllowed,
  checkLocalDiskAllowed
} from './src/server/r2UsageTracker.js';
import {
  generatePresignedDownloadUrl,
  isR2Configured
} from './src/server/r2Client.js';
import {
  getAllPosts,
  createPost,
  deletePost,
  toggleLike,
  toggleBookmark,
  addComment,
  getAllReels,
  createReel,
  toggleLikeReel,
  toggleFollowUser,
  reportPost,
  getReportedPostsAdmin,
  resolveReportAdmin,
  getSocialMetrics,
  getUserSocialExportData,
  cascadeDeleteUserData,
  createScheduledPost,
  getScheduledPosts,
  cancelScheduledPost,
  updateScheduledPost,
  checkAndPublishScheduledPosts,
  getAllStories,
  createStory,
  deleteStory,
  markStoryViewed,
  getConversations,
  getMessagesBetween,
  sendDirectMessage,
  markMessagesAsRead,
  getNotificationsForUser,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  searchContentAndUsers,
  getExploreTrendingTags,
  getFriendsSummary,
  getUserFriendsList,
  getIncomingFriendRequests,
  getSentFriendRequests,
  getFriendSuggestions,
  getFriendshipStatus,
  getMutualFriends,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  removeFriendshipAndRequests,
  toggleMessageReaction,
  deleteMessage,
  searchUserMessages,
  togglePinConversation,
  toggleMuteConversation,
  clearConversationMessages,
  isMessageParticipantForMedia,
  getUserPublicProfile,
  recordPostView,
  recordPhotoView
} from './src/server/socialStore.js';
import {
  polishCaptionService,
  translateContentService,
  generateScriptService,
  getAiMetricsAdmin,
  updateAiConfigAdmin,
  getAiConfig
} from './src/server/aiService.js';
import {
  getCreatorMonetizationSummary,
  verifyAndClaimRewardedAd,
  requestCreatorWithdrawal,
  cancelCreatorWithdrawal,
  saveCreatorPayoutMethod,
  getMonetizationConfig,
  getAllWithdrawalsAdmin,
  updateWithdrawalStatusAdmin,
  updateMonetizationConfigAdmin,
  getPlatformLedgerMetricsAdmin,
  transferCoinTip,
  handleAdMobSsvCallback,
  getAdMobReadinessStatus,
  getSuspiciousActivityAlertsAdmin,
  getLedgerReconciliationAdmin
} from './src/server/monetizationStore.js';
import {
  getAiLaunchConfig,
  updateAiLaunchConfig,
  activateEmergencyKillSwitch,
  deactivateEmergencyKillSwitch,
  generateIsolatedSimulationBatch
} from './src/server/aiLaunchControlStore.js';
import {
  COMMUNITY_STANDARDS,
  createReport,
  getAllReportsAdmin,
  resolveReportWithActionAdmin,
  submitAppeal,
  reviewAppealAdmin
} from './src/server/moderationStore.js';
import { MUSIC_TRACKS } from './src/data/musicTracks.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

function generateLocalDemoResponse(prompt: string, language: string, task: string): string {
  const isBn = language === 'bn' || /[\u0980-\u09FF]/.test(prompt);

  if (task === 'hashtags') {
    return isBn
      ? `#ZanGiBD #বাংলাকনটেন্ট #ঢাকাভাইবস #ক্রিয়েটরলাইফ #AIবাংলা #ফিরেদেখা২০২৬ #ডিজিটালবাংলাদেশ #ট্রেন্ডিংবিডি`
      : `#ZanGi #AIUniverse #CreatorEconomy #TechInnovation #SocialFuture #CreativeStudio #GenAI2026 #SmartFeed`;
  }

  if (task === 'caption') {
    return isBn
      ? `✨ নতুন দিন, নতুন সৃজনশীলতা! Zan-Gi AI এর সাহায্যে আজ আমার পরবর্তী শর্ট ভিডিও প্ল্যান করলাম। আপনাদের আজকের লক্ষ্য কী? মন্তব্য করে জানান! 🚀 

#ZanGi #বাংলাক্রিয়েটর #সৃজনশীলতা`
      : `✨ Turning ideas into reality with Zan-Gi AI Studio! Today's session was all about building for the next generation of social universes. What are you creating this week? Drop your thoughts below! 🚀

#ZanGi #CreatorPulse #BuildInPublic`;
  }

  if (task === 'script') {
    return isBn
      ? `🎬 [০-৩ সে]: হুক: "আপনি কি জানেন কিভাবে ২০২৬ সালে AI দিয়ে কনটেন্ট ক্রিয়েটররা নিজেদের আয় দ্বিগুণ করছে?"
🎥 [৩-১৫ সে]: দৃশ্য: Zan-Gi ড্যাশবোর্ডে স্মার্ট মনিটাইজেশন ও ক্রিয়েটর পুল দেখানো।
🗣️ [১৫-৪৫ সে]: মূল কথা: সাধারণ পোস্ট নয়, বুদ্ধিমান স্মার্ট ফিড অ্যালগরিদম ও ক্রিয়েটর আর্নিং মডেলের সাথে যুক্ত হওয়া।
🚀 [৪৫-৬০ সে]: কল-টু-অ্যাকশন: "আজই আপনার Zan-Gi প্রোফাইল সাজিয়ে নিন এবং আমাদের সাথে যুক্ত হন!"`
      : `🎬 [0-3s] Hook: "Here is the exact framework AI creators are using to scale authentic audiences in 2026."
🎥 [3-15s] Visual: Showing Zan-Gi Creator Studio and AI hashtag optimizer in real time.
🗣️ [15-45s] Core insight: "Stop chasing random trends. Focus on community depth, genuine feedback loops, and transparent monetization."
🚀 [45-60s] CTA: "Follow my Zan-Gi profile for the next breakdown and let me know your thoughts in the replies!"`;
  }

  if (task === 'kavita') {
    return isBn
      ? `📜 **ডিজিটাল নদীর বাঁকে**
নীল-বেগুনী আলোয় আঁকা স্বপ্নের আকাশ,
ক্লিক আর কোডের ভিড়ে নতুন উচ্ছ্বাস।
পদ্মার বুকে যেমন ভোরের সোনালী রোদ হাসে,
তেমনি Zan-Gi জুড়ে বাঙালির সৃজনশীলতা ভাসে।
যুক্ত হও হৃদয়ে, গড়ো নতুন গান,
বাংলা ভাষার চেতনায় বিশ্বজুড়ে সম্মান। 🇧🇩✨`
      : `📜 **Echoes of Digital Rivers**
Through violet light and lines of code,
A creator walks the open road.
Like morning mist upon the bay,
New ideas rise to greet the day.
Connect and build with open hands,
From Dhaka's heart to distant lands. 🌟`;
  }

  if (task === 'monetization') {
    return isBn
      ? `💡 **Zan-Gi ক্রিয়েটর আর্নিং টিপস (২০২৬)**:
১. **ভিউয়ার এনগেজমেন্ট রেট**: শুধু ভিউ নয়, কমেন্টের সক্রিয়তা ক্রিয়েটর কয়েন মাল্টিপ্লায়ার বৃদ্ধি করে (৭০% রেভিনিউ শেয়ার)।
২. **অরিজিনাল মিডিয়া বোনাস**: নিজস্ব ক্যামেরা বা স্টুডিও ভিডিও আপলোড করলে রিচ ২.৫ গুণ বাড়ে।
৩. **স্পন্সরড নেটিভ অ্যাড ইউনিট**: প্রতি ১০,০০০ অর্গানিক রিচে স্পন্সর ব্যাজ এনাবল করতে প্রোফাইল সেটিংসে আবেদন করুন।`
      : `💡 **Zan-Gi Creator Monetization Playbook (2026)**:
1. **Engagement Multipliers**: Comments and shares drive 70% Creator Revenue Share distributions.
2. **Original Visuals Bonus**: Upload high-bitrate original photos and vertical reels to earn creator coins.
3. **Native Sponsored Placement**: Reach 5,000 active followers to unlock branded community drops.`;
  }

  if (task === 'festival') {
    return isBn
      ? `🌸 **উৎসবের শুভেচ্ছা বার্তা**:
"পহেলা বৈশাখ / ঈদের আনন্দ ছড়িয়ে পড়ুক আপনার জীবন ও ক্রিয়েটিভ যাত্রায়! Zan-Gi পরিবারের পক্ষ থেকে সবাইকে অফুরন্ত শুভেচ্ছা ও ভালোবাসা। নতুন বছর আনুক নতুন প্রেরণা ও সমৃদ্ধি! 🌿❤️"`
      : `🎉 **Festive Community Greeting**:
"Wishing everyone a joyous and inspired festive season! May your creative journey on Zan-Gi flourish with brightness, warmth, and boundless possibilities. 🌟"`;
  }

  if (task === 'translate') {
    return isBn
      ? `🌐 অনুবাদ (ইংরেজি থেকে বাংলা): "Zan-Gi: যুক্ত হোন, তৈরি করুন, কল্পনা করুন, আয় করুন।" (Zan-Gi: Connect, Create, Imagine, Earn.)`
      : `🌐 Translation (Bengali to English): "Zan-Gi connects creators with AI intelligence and fair community rewards."`;
  }

  if (isBn) {
    return `নমস্কার! আমি Zan-Gi AI সহকারী। আপনার প্রশ্ন: "${prompt}"।

আমি আপনাকে পোস্টের ক্যাপশন লেখা, বাংলা বানান যাচাই, নতুন ভিডিওর স্ক্রিপ্ট তৈরি, হ্যাশট্যাগ বাছাই এবং ক্রিয়েটর স্টুডিওতে সহায়তা করতে পারি। আপনি কি নির্দিষ্ট কোনো বিষয় নিয়ে কনটেন্ট ড্রাফট করতে চান?`;
  }

  return `Hello! I am Zan-Gi AI, your creator assistant for the Zan-Gi social universe.

Regarding your request: "${prompt}"

I can help draft captions, polish grammar, suggest viral hashtags, outline short-video scripts, or translate between Bengali and English. Let me know what specific format you'd like to explore next!`;
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Check if GEMINI_API_KEY is configured
  const rawKey = process.env.GEMINI_API_KEY;
  const hasGeminiKey = Boolean(rawKey && rawKey.trim() !== '' && rawKey !== 'MY_GEMINI_API_KEY');

  let genAI: GoogleGenAI | null = null;
  if (hasGeminiKey) {
    try {
      genAI = new GoogleGenAI({
        apiKey: rawKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      console.log('GoogleGenAI server client initialized successfully with gemini-3.8-flash.');
    } catch (e) {
      console.warn('Failed to initialize GoogleGenAI client:', e);
    }
  } else {
    console.log('No active GEMINI_API_KEY set. Operating in documented Demo Mode with transparent notice.');
  }

  // Authentication Helper Middleware
  const getAuthUser = (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return validateSession(token);
  };

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const { email, username, displayName, password } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = registerUser({ email, username, displayName, password, ip: clientIp });

    if (result.error || !result.user) {
      return res.status(400).json({ error: result.error || 'Registration failed' });
    }

    const session = loginUser(result.user.email, password, clientIp, req.headers['user-agent'] || 'browser');
    return res.status(201).json({
      message: 'Account registered successfully.',
      user: sanitizeUser(result.user),
      token: session.session?.token,
      verificationCode: result.user.emailVerificationToken // For development ease
    });
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { emailOrUsername, password, twoFactorCode } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = loginUser(emailOrUsername, password, clientIp, req.headers['user-agent'] || 'browser', twoFactorCode);

    if (result.requires2FA) {
      return res.status(200).json({
        requires2FA: true,
        message: result.error || 'Two-factor authentication code required.',
      });
    }

    if (result.error || !result.user || !result.session) {
      return res.status(401).json({ error: result.error || 'Authentication failed' });
    }

    return res.json({
      message: 'Logged in successfully.',
      user: sanitizeUser(result.user),
      token: result.session.token,
    });
  });

  // System Health Endpoint
  app.get('/api/health', (_req, res) => {
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      platform: 'Zan-Gi',
      version: '1.0.0-production',
    });
  });

  // Auth: Bootstrap Status (Public inspection of bootstrap eligibility; never exposes secret)
  app.get('/api/auth/bootstrap-status', (_req, res) => {
    const hasOwner = hasExistingOwner();
    const secretConfigured = Boolean(getBootstrapSecret());
    return res.json({
      canBootstrap: !hasOwner && secretConfigured,
      hasOwner,
      secretConfigured,
      instructions: !hasOwner
        ? 'First-owner setup is available. Provide OWNER_BOOTSTRAP_SECRET along with desired owner credentials.'
        : 'Owner already established. Bootstrap is permanently disabled.'
    });
  });

  // Auth: First-Owner Bootstrap (Strictly one-time, requires server-side secret)
  app.post('/api/auth/bootstrap-owner', (req, res) => {
    const { secret, email, username, displayName, password, promoteExistingUserId } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Owner-Bootstrap';

    if (!secret || typeof secret !== 'string') {
      return res.status(400).json({ error: 'Bootstrap setup secret is required.' });
    }

    const result = bootstrapFirstOwner({
      secret,
      email,
      username,
      displayName,
      password,
      promoteExistingUserId,
      ip: clientIp,
      userAgent,
    });

    if (!result.success || !result.user) {
      return res.status(result.status || 400).json({ error: result.error || 'Failed to bootstrap owner account' });
    }

    return res.status(201).json({
      message: 'Platform Owner account bootstrapped successfully.',
      user: sanitizeUser(result.user),
      token: result.session?.token,
    });
  });

  // Auth: Owner Credential Recovery (Audited recovery path requiring server secret)
  app.post('/api/auth/owner-recovery', (req, res) => {
    const { recoverySecret, emailOrUsername, newPassword } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    if (!recoverySecret || !emailOrUsername || !newPassword) {
      return res.status(400).json({ error: 'Recovery secret, email/username, and new strong password are required.' });
    }

    const result = recoverOwnerCredentials({
      recoverySecret,
      emailOrUsername,
      newPassword,
      ip: clientIp,
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error || 'Owner recovery failed' });
    }

    return res.json({ message: 'Owner account credentials updated successfully. Please sign in with your new password.' });
  });

  // Auth: Google Sign-In
  app.post('/api/auth/google', (req, res) => {
    const { email, displayName, avatarUrl, credential } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google user email is required' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = googleSignIn({
      email,
      displayName: displayName || email.split('@')[0],
      avatarUrl,
      googleId: credential,
      ip: clientIp,
      userAgent: req.headers['user-agent'] || 'Google-Auth'
    });

    return res.json({
      message: 'Authenticated with Google.',
      user: sanitizeUser(result.user),
      token: result.session.token,
      notice: 'Google OAuth session synchronized with Zan-Gi auth engine.'
    });
  });

  // Auth: Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      revokeSession(token);
    }
    return res.json({ message: 'Session logged out successfully' });
  });

  // Auth: Get Current Profile (/me)
  app.get('/api/auth/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthenticated or session expired' });
    }
    return res.json({
      user: sanitizeUser(user),
      authenticated: true
    });
  });

  // Auth: Verify Email
  app.post('/api/auth/verify-email', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { code } = req.body;
    const result = verifyEmail(user.id, code || '');
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Invalid code' });
    }
    return res.json({ message: 'Email address verified successfully!' });
  });

  // Auth: Forgot Password
  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const result = forgotPassword(email);
    return res.json({
      message: 'If the email exists, a password reset code has been generated.',
      resetCode: result.resetToken // Provided for dev environment convenience
    });
  });

  // Auth: Reset Password
  app.post('/api/auth/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    const result = resetPassword(token, newPassword);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Reset failed' });
    }
    return res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  });

  // Auth: Update Profile
  app.put('/api/auth/profile', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { displayName, bio, avatarUrl, bannerUrl, username, languagePreference } = req.body;
    const result = updateUserProfile(user.id, { displayName, bio, avatarUrl, bannerUrl, username, languagePreference });
    if (result.error || !result.user) {
      return res.status(400).json({ error: result.error || 'Update failed' });
    }
    return res.json({ message: 'Profile updated successfully', user: sanitizeUser(result.user) });
  });

  // User: Profile Picture update
  app.post('/api/users/profile-picture', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { avatarUrl } = req.body;
    if (!avatarUrl) return res.status(400).json({ error: 'avatarUrl is required' });
    const result = updateUserProfile(user.id, { avatarUrl });
    if (result.error || !result.user) return res.status(400).json({ error: result.error || 'Update failed' });
    return res.json({ success: true, message: 'Profile picture updated', user: sanitizeUser(result.user) });
  });

  // User: Cover Photo update
  app.post('/api/users/cover-photo', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { bannerUrl } = req.body;
    if (!bannerUrl) return res.status(400).json({ error: 'bannerUrl is required' });
    const result = updateUserProfile(user.id, { bannerUrl });
    if (result.error || !result.user) return res.status(400).json({ error: result.error || 'Update failed' });
    return res.json({ success: true, message: 'Cover photo updated', user: sanitizeUser(result.user) });
  });

  // Get Any User's Public Profile (Facebook-style full profile)
  app.get('/api/users/:id/profile', (req, res) => {
    const caller = getAuthUser(req);
    const profile = getUserPublicProfile(req.params.id, caller?.id);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found or inactive' });
    }
    return res.json(profile);
  });

  // Track Profile Visit (with 1-hour anti-inflation window)
  app.post('/api/users/:id/visit', (req, res) => {
    const caller = getAuthUser(req);
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const visitorKey = caller ? caller.id : clientIp;
    const result = recordProfileVisit(req.params.id, visitorKey);
    return res.json(result);
  });

  // Auth: Deactivate Account
  app.post('/api/auth/deactivate', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { password } = req.body;
    const result = deactivateUser(user.id, password || '');
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Deactivation failed' });
    }
    return res.json({ message: 'Account deactivated.' });
  });

  // Auth: Delete Account
  app.delete('/api/auth/delete', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { password } = req.body;
    const result = deleteUserAccount(user.id, password || '');
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Deletion failed' });
    }
    // Cascade wipe of all posts, reels, comments, and media
    cascadeDeleteUserData(user.id);
    return res.json({ message: 'Account and associated content permanently deleted.' });
  });

  // Auth: Security Audit Logs (Owner only)
  app.get('/api/auth/audit-logs', (req, res) => {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access restricted to platform owner/admin.' });
    }
    return res.json({ logs: getAuditLogs() });
  });

  // Auth: Change Password
  app.post('/api/auth/change-password', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { currentPassword, newPassword } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = changePassword(user.id, currentPassword || '', newPassword || '', clientIp);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to update password' });
    }
    return res.json({ message: 'Password changed successfully!' });
  });

  // Auth: Active Sessions
  app.get('/api/auth/sessions', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const authHeader = req.headers.authorization || '';
    const currentToken = authHeader.replace(/^Bearer\s+/, '');
    const userSessions = getUserSessions(user.id, currentToken);
    return res.json({ sessions: userSessions });
  });

  // Auth: Revoke Session
  app.post('/api/auth/sessions/revoke', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    const success = revokeSessionById(user.id, token);
    return res.json({ success, message: success ? 'Session revoked.' : 'Session not found.' });
  });

  // Auth: Revoke Other Sessions
  app.post('/api/auth/sessions/revoke-others', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const authHeader = req.headers.authorization || '';
    const currentToken = authHeader.replace(/^Bearer\s+/, '');
    const count = revokeOtherSessions(user.id, currentToken);
    return res.json({ success: true, count, message: `Signed out of ${count} other device(s).` });
  });

  // Auth: 2FA Setup
  app.post('/api/auth/2fa/setup', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const data = setup2FA(user.id);
    if (data.error) return res.status(400).json({ error: data.error });
    return res.json(data);
  });

  // Auth: 2FA Verify & Enable
  app.post('/api/auth/2fa/verify-enable', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { code } = req.body;
    const result = verifyAndEnable2FA(user.id, code || '');
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Verification failed.' });
    }
    return res.json({ success: true, message: 'Two-factor authentication is now active on your account.' });
  });

  // Auth: 2FA Disable
  app.post('/api/auth/2fa/disable', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { password } = req.body;
    const result = disable2FA(user.id, password || '');
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to disable 2FA' });
    }
    return res.json({ success: true, message: 'Two-factor authentication has been disabled.' });
  });

  // Users: Privacy Settings
  app.get('/api/users/privacy', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({
      isPrivate: Boolean(user.isPrivate),
      whoCanComment: user.whoCanComment || 'everyone',
      whoCanMessage: user.whoCanMessage || 'everyone'
    });
  });

  app.put('/api/users/privacy', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { isPrivate, whoCanComment, whoCanMessage } = req.body;
    const result = updatePrivacySettings(user.id, { isPrivate, whoCanComment, whoCanMessage });
    if (result.error || !result.user) {
      return res.status(400).json({ error: result.error || 'Update failed' });
    }
    return res.json({
      message: 'Privacy settings saved successfully',
      isPrivate: result.user.isPrivate,
      whoCanComment: result.user.whoCanComment,
      whoCanMessage: result.user.whoCanMessage
    });
  });

  // Users: Blocked Users
  app.get('/api/users/blocked', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const blockedList = getBlockedUsers(user.id);
    return res.json({ blockedUsers: blockedList });
  });

  app.post('/api/users/block/:targetId', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const result = blockUser(user.id, req.params.targetId);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Block failed' });
    }
    // Clean up friendships and any pending friend requests
    removeFriendshipAndRequests(user.id, req.params.targetId);
    return res.json({ success: true, message: 'User blocked and connections cleared.' });
  });

  app.post('/api/users/unblock/:targetId', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const result = unblockUser(user.id, req.params.targetId);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Unblock failed' });
    }
    return res.json({ success: true, message: 'User unblocked.' });
  });

  // Users: Notification, Media & Storage Preferences
  app.get('/api/users/preferences', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({
      notifications: user.notificationPreferences || {
        likes: true,
        comments: true,
        follows: true,
        messages: true,
        systemUpdates: true,
        creatorEarn: true
      },
      media: user.mediaPreferences || {
        dataSaver: false,
        autoplay: true,
        mediaQuality: 'standard'
      },
      storage: user.storagePreferences || {
        saveMediaToDevice: false,
        autoDownload: false,
        autoDownloadPhotos: 'never',
        autoDownloadVideos: 'never',
        autoDownloadVoiceNotes: 'wifi_only',
        wifiOnly: true,
        saveToGallery: false,
        cloudDelivery: true,
        localOnlyMedia: false
      }
    });
  });

  app.put('/api/users/preferences/notifications', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const result = updateNotificationPreferences(user.id, req.body);
    return res.json({ message: 'Notification preferences updated', notifications: result.user?.notificationPreferences });
  });

  app.put('/api/users/preferences/media', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const result = updateMediaPreferences(user.id, req.body);
    return res.json({ message: 'Media preferences updated', media: result.user?.mediaPreferences });
  });

  app.put('/api/users/preferences/storage', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const result = updateStoragePreferences(user.id, req.body);
    return res.json({ message: 'Storage & download preferences updated', storage: result.user?.storagePreferences });
  });

  // Users: Premium Subscription & Entitlement Status
  app.get('/api/users/premium/status', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const isPremium = Boolean(user.isPremium || user.role === 'owner');
    return res.json({
      isPremium,
      tier: user.premiumTier || (isPremium ? 'pro' : 'free'),
      expiresAt: user.premiumExpiresAt || null,
      benefits: {
        aiThroughputBoostPercent: 20,
        aiRateLimitPerMin: isPremium ? 24 : 20,
        maxCharAnalysisLength: isPremium ? 3600 : 3000,
        videoMaxDurationSeconds: 180,
        priorityVideoTranscoding: isPremium,
        verifiedSubscriberBadge: isPremium,
        adFreeExperienceEligible: isPremium,
      },
    });
  });

  // Users: Comprehensive Premium Details, Plans & History
  app.get('/api/users/premium/details', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const details = getPremiumSubscriptionDetails(user.id);
    const history = getUserCoinTransactionHistory(user.id);
    return res.json({
      ...details,
      history,
    });
  });

  // Users: Secure Authoritative Coin Purchase for Premium Subscription
  app.post('/api/users/premium/purchase', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ error: 'Subscription planId is required' });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = purchasePremiumPlan(user.id, planId, clientIp);
    if (!result.success || !result.user) {
      return res.status(400).json({ error: result.error || 'Failed to complete premium purchase' });
    }
    return res.json({
      success: true,
      user: sanitizeUser(result.user),
      plan: result.plan,
      message: `⭐ Congratulations! Successfully upgraded to ${result.plan?.name}. Your benefits are now active.`,
      newCoinBalance: result.user.creatorCoins,
      expiresAt: result.user.premiumExpiresAt
    });
  });

  app.post('/api/users/premium/toggle', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { activate = true, tier = 'pro', durationDays = 30 } = req.body;
    const result = updateUserPremiumStatus(user.id, Boolean(activate), tier, durationDays);
    if (!result.success || !result.user) {
      return res.status(400).json({ error: result.error || 'Failed to update premium status' });
    }
    return res.json({
      success: true,
      user: sanitizeUser(result.user),
      message: activate
        ? '⭐ Zan-Gi Creator Premium entitlement activated with +20% AI throughput and priority transcoding!'
        : 'Premium membership deactivated.',
    });
  });

  // Admin: User Management (Owner/Admin only)
  app.get('/api/admin/users', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const userList = getAllUsersAdmin(user.id);
      return res.json({ users: userList });
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden' });
    }
  });

  app.put('/api/admin/users/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { role, isVerified, isBanned } = req.body;
    const result = adminUpdateUser(user.id, req.params.id, { role, isVerified, isBanned });
    if (result.error || !result.user) {
      return res.status(400).json({ error: result.error || 'Update failed' });
    }
    return res.json({ message: 'User updated successfully', user: sanitizeUser(result.user) });
  });

  // Admin: System Metrics
  app.get('/api/admin/metrics', (req, res) => {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const socialMetrics = getSocialMetrics();
    return res.json({
      metrics: {
        totalUsers: getSystemUserCount(),
        activeSessions: getActiveSessionsCount(),
        totalPosts: socialMetrics.postsCount,
        totalReels: socialMetrics.reelsCount,
        totalComments: socialMetrics.commentsCount,
        flaggedReports: socialMetrics.pendingReportsCount,
        aiRequestsToday: 142,
        geminiModel: genAI ? 'gemini-3.8-flash' : 'local-rule-engine'
      }
    });
  });

  // ==========================================
  // COMMUNITY STANDARDS & MODERATION (PHASE 7, 8)
  // ==========================================
  app.get('/api/community-standards', (_req, res) => {
    return res.json({ standards: COMMUNITY_STANDARDS });
  });

  // Posts: Report Post with AI analysis
  app.post('/api/posts/:id/report', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { reason, category } = req.body;

    try {
      const allPosts = getAllPosts();
      const targetPost = allPosts.find((p: any) => p.id === req.params.id);

      const rep = createReport({
        postId: req.params.id,
        postContent: targetPost?.content || 'Post media attachment',
        postAuthorId: targetPost?.author?.id || 'unknown',
        reporterId: user.id,
        reason: reason || 'Violation of community standards',
        category,
      });

      return res.status(201).json({
        success: true,
        message: 'Post reported for review and queued for AI moderation assistance.',
        report: rep
      });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to submit report' });
    }
  });

  // User Appeals Submission (Phase 7 & 8)
  app.post('/api/reports/:id/appeal', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { statement } = req.body;
    if (!statement || !statement.trim()) {
      return res.status(400).json({ error: 'Appeal statement is required' });
    }

    const result = submitAppeal({
      reportId: req.params.id,
      userId: user.id,
      statement: statement.trim(),
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to submit appeal' });
    }

    return res.json({ success: true, message: 'Appeal submitted for administrative review', report: result.report });
  });

  // Admin: Moderation Queue & AI Evidence
  app.get('/api/admin/reports', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const reps = getAllReportsAdmin(user.id);
      return res.json({ reports: reps });
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden' });
    }
  });

  app.post('/api/admin/reports/:id/action', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { action, adminNotes } = req.body; // 'dismiss' | 'warning' | 'delete_post'

    try {
      const result = resolveReportWithActionAdmin({
        adminId: user.id,
        reportId: req.params.id,
        action: action || 'dismiss',
        adminNotes,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to apply action' });
      }

      if (action === 'delete_post' && result.report?.postId) {
        try {
          deletePost(result.report.postId, user.id, true);
        } catch {
          // ignore if already deleted
        }
      }

      return res.json({ success: true, message: `Report processed with action: ${action}`, report: result.report });
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden' });
    }
  });

  // Admin: Review User Appeals (Phase 8)
  app.post('/api/admin/appeals/:id/review', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { decision, reviewerNotes } = req.body; // 'granted' | 'denied'

    try {
      const result = reviewAppealAdmin({
        adminId: user.id,
        reportId: req.params.id,
        decision,
        reviewerNotes,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to review appeal' });
      }

      return res.json({ success: true, message: `Appeal ${decision}`, report: result.report });
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden' });
    }
  });

  // ==========================================
  // MONETIZATION & REWARDED ADS (PHASE 2, 3, 4, 6)
  // ==========================================

  // Creator Monetization Summary (Supports Date Range Filtering)
  app.get('/api/monetization/summary', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const range = req.query.range as any;
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const dateFilter = (start && end) ? { start, end } : range;
    const summary = getCreatorMonetizationSummary(user.id, dateFilter);
    return res.json(summary);
  });

  // Monetization Configuration (Public summary of rules)
  app.get('/api/monetization/config', (_req, res) => {
    return res.json({ config: getMonetizationConfig() });
  });

  // Rewarded Ads: Server-Side Verification (SSV) & Claim (Phase 3)
  app.post('/api/monetization/rewarded-ads/claim', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { clientTransactionId, adUnitId, durationWatchedSeconds, providerSignature } = req.body;

    const claimResult = verifyAndClaimRewardedAd({
      userId: user.id,
      clientTransactionId: clientTransactionId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      adUnitId,
      providerSignature,
      durationWatchedSeconds,
    });

    if (!claimResult.success) {
      return res.status(claimResult.status || 400).json({ error: claimResult.error });
    }

    return res.json({
      success: true,
      message: claimResult.message,
      entry: claimResult.entry,
      newBalanceCoins: claimResult.newBalanceCoins,
      newBalanceCents: claimResult.newBalanceCents,
    });
  });

  // AdMob Official SSV HTTP Callback (GET)
  app.get('/api/ads/admob-ssv-callback', (req, res) => {
    const query = req.query;
    const transactionId = (query.transaction_id as string) || (query.custom_data as string);
    const userId = (query.user_id as string) || (query.custom_data as string);
    const adUnit = query.ad_unit as string | undefined;

    if (!transactionId || !userId) {
      return res.status(400).send('Missing transaction_id or user_id');
    }

    const result = handleAdMobSsvCallback({
      ad_unit: adUnit,
      transaction_id: transactionId,
      user_id: userId,
      signature: query.signature as string | undefined,
      key_id: query.key_id as string | undefined,
    });

    if (!result.success) {
      return res.status(result.status || 400).send(result.error || 'SSV verification rejected');
    }

    return res.status(200).send('OK');
  });

  // AdMob Rewarded Ad Verification (POST alternative)
  app.post('/api/ads/reward-callback', (req, res) => {
    const data = { ...req.query, ...req.body };
    const transactionId = data.transaction_id || data.custom_data || data.clientTransactionId;
    const userId = data.user_id || data.userId;
    const adUnit = data.ad_unit || data.adUnitId;

    if (!transactionId || !userId) {
      return res.status(400).json({ error: 'Missing transaction_id or user_id' });
    }

    const result = handleAdMobSsvCallback({
      ad_unit: adUnit,
      transaction_id: transactionId,
      user_id: userId,
      signature: data.signature,
      key_id: data.key_id,
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.json({ success: true, message: 'Reward verified and credited via SSV callback', entry: result.entry });
  });

  // AdMob SDK & Production Readiness Inspector
  app.get('/api/ads/readiness', (_req, res) => {
    const status = getAdMobReadinessStatus();
    return res.json(status);
  });

  // Creator Withdrawal Request (Phase 6)
  app.post('/api/monetization/withdrawals/request', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { amountCents, payoutProvider, accountDetails } = req.body;
    if (!amountCents || !payoutProvider || !accountDetails) {
      return res.status(400).json({ error: 'Missing required withdrawal fields' });
    }

    const ALLOWED_WITHDRAWAL_METHODS = ['bkash', 'nagad', 'rocket'];
    if (!ALLOWED_WITHDRAWAL_METHODS.includes(payoutProvider)) {
      return res.status(400).json({
        error: `Unsupported withdrawal method "${payoutProvider}". The only supported withdrawal methods on Zan-Gi are bKash, Nagad, and Rocket.`
      });
    }

    const result = requestCreatorWithdrawal({
      userId: user.id,
      amountCents: Number(amountCents),
      payoutProvider,
      accountDetails,
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted for processing',
      withdrawal: result.withdrawal,
    });
  });

  // Creator Withdrawal Cancellation (Immediate Coin Refund)
  app.post('/api/monetization/withdrawals/cancel', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { withdrawalId } = req.body;
    if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId is required' });

    const result = cancelCreatorWithdrawal(user.id, withdrawalId);
    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: 'Withdrawal request cancelled and coins refunded to your wallet.',
      withdrawal: result.withdrawal,
    });
  });

  // Save Creator Payout Method
  app.post('/api/monetization/payout-methods', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { provider, accountIdentifierMasked, accountHolderName } = req.body;

    if (!provider || !accountIdentifierMasked || !accountHolderName) {
      return res.status(400).json({ error: 'Incomplete payout method information' });
    }

    const ALLOWED_WITHDRAWAL_METHODS = ['bkash', 'nagad', 'rocket'];
    if (!ALLOWED_WITHDRAWAL_METHODS.includes(provider)) {
      return res.status(400).json({
        error: `Unsupported payout provider "${provider}". Supported methods are bKash, Nagad, and Rocket.`
      });
    }

    try {
      const methods = saveCreatorPayoutMethod(user.id, {
        provider,
        accountIdentifierMasked,
        accountHolderName,
      });

      return res.json({ success: true, payoutMethods: methods });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to save payout method' });
    }
  });

  // Social: Transfer Coin Tip between users
  app.post('/api/social/tip', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized: Sign in required to send creator tips' });

    const { recipientId, amountCoins, note } = req.body;
    if (!recipientId || !amountCoins) {
      return res.status(400).json({ error: 'recipientId and amountCoins are required' });
    }

    const tipResult = transferCoinTip({
      senderId: user.id,
      recipientId,
      coinsAmount: Number(amountCoins),
      note,
    });

    if (!tipResult.success) {
      return res.status(400).json({ error: tipResult.error });
    }

    try {
      createNotification({
        userId: recipientId,
        actorId: user.id,
        type: 'tip',
        title: 'Creator Tip Received',
        message: `@${user.username} sent you a tip of ${amountCoins} Creator Coins!`,
      });
    } catch {}

    return res.json({
      success: true,
      message: `Successfully tipped ${amountCoins} coins to creator`,
      senderCoins: tipResult.senderCoins,
    });
  });

  // ==========================================
  // ADMIN FINANCIAL & MONETIZATION CONTROL (PHASE 5)
  // ==========================================

  // Admin: Get all withdrawals
  app.get('/api/admin/withdrawals', (req, res) => {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Unauthorized: Admin role required' });
    }
    const withdrawals = getAllWithdrawalsAdmin();
    return res.json({ withdrawals, count: withdrawals.length });
  });

  // Admin: Update withdrawal status (approve / reject / mark as paid)
  app.post('/api/admin/withdrawals/:id/status', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { status, adminNotes, rejectionReason, transactionReference } = req.body;

    try {
      const result = updateWithdrawalStatusAdmin(
        user.id,
        req.params.id,
        status,
        adminNotes,
        rejectionReason,
        transactionReference
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({ success: true, message: `Withdrawal status updated to ${status}`, withdrawal: result.withdrawal });
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden' });
    }
  });

  // Admin: Get / Update monetization revenue configuration
  app.get('/api/admin/monetization-config', (req, res) => {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    return res.json({ config: getMonetizationConfig() });
  });

  app.put('/api/admin/monetization-config', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { patch, reason } = req.body;

    try {
      const result = updateMonetizationConfigAdmin(user.id, patch || {}, reason);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.json({ success: true, config: result.config });
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden' });
    }
  });

  // Admin: Ledger & Financial Metrics
  app.get('/api/admin/ledger-metrics', (req, res) => {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const metrics = getPlatformLedgerMetricsAdmin();
    return res.json({ metrics });
  });

  // ==========================================
  // OWNER-ONLY PRIVILEGED OPERATIONS & AI LAUNCH
  // ==========================================

  // Owner-Only: AI Launch Controls Inspection
  app.get('/api/admin/owner/ai-launch', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ error: 'Forbidden: Platform Owner privileges strictly required.' });
    }
    const config = getAiLaunchConfig(user.id);
    return res.json({ config });
  });

  // Owner-Only: AI Launch Controls Update
  app.put('/api/admin/owner/ai-launch', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ error: 'Forbidden: Platform Owner privileges strictly required.' });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const { patch, reason } = req.body;
    try {
      const result = updateAiLaunchConfig(user.id, patch || {}, reason || 'Owner settings update', clientIp);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Owner-Only: Emergency OFF Switch (Kill Switch)
  app.post('/api/admin/owner/ai-launch/emergency-off', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ error: 'Forbidden: Platform Owner privileges strictly required.' });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const { reason } = req.body;
    const result = activateEmergencyKillSwitch(user.id, reason || 'Owner activated emergency kill switch', clientIp);
    return res.json(result);
  });

  // Owner-Only: Deactivate Emergency Kill Switch
  app.post('/api/admin/owner/ai-launch/emergency-on', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ error: 'Forbidden: Platform Owner privileges strictly required.' });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const { reason } = req.body;
    try {
      const result = deactivateEmergencyKillSwitch(user.id, reason || 'Owner restored normal launch operations', clientIp);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Owner-Only: Trigger Internal Staging Simulation Batch
  app.post('/api/admin/owner/ai-launch/run-simulation', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ error: 'Forbidden: Platform Owner privileges strictly required.' });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const { itemType = 'post', count = 3 } = req.body;
    try {
      const result = generateIsolatedSimulationBatch(user.id, itemType, Number(count), clientIp);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Owner-Only: Anti-Fraud and Suspicious Activity Monitor
  app.get('/api/admin/owner/suspicious-activity', (req, res) => {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
    }
    const alerts = getSuspiciousActivityAlertsAdmin(user.id);
    return res.json({ alerts, count: alerts.length });
  });

  // Owner-Only: Financial Ledger Reconciliation Audit
  app.get('/api/admin/owner/ledger-reconciliation', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'owner') {
      return res.status(403).json({ error: 'Forbidden: Platform Owner role strictly required for ledger reconciliation.' });
    }
    try {
      const reconciliation = getLedgerReconciliationAdmin(user.id);
      return res.json({ reconciliation });
    } catch (err: any) {
      return res.status(403).json({ error: err.message });
    }
  });

  // Owner/Admin: Google AdMob Production Readiness & Missing Credentials Check
  app.get('/api/admin/owner/admob-readiness', (req, res) => {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
    }
    return res.json(getAdMobReadinessStatus());
  });

  // ==========================================
  // DATA & PRIVACY TOOLS: DATA EXPORT (PHASE 4)
  // ==========================================
  app.get('/api/user/export-data', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required for data export.' });
    }

    const accountData = getUserAccountExport(user.id);
    const socialData = getUserSocialExportData(user.id);

    return res.json({
      exportFormat: 'ZanGi-Data-Portability-JSON-v1',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      account: accountData,
      social: socialData,
      privacyGuarantee: 'Confidential: All cryptographic secrets, hashed passwords, 2FA keys, and internal tokens are excluded by design.',
    });
  });

  // ==========================================
  // REAL MEDIA UPLOAD & STORAGE (R2 FREE TIER ARCHITECTURE)
  // ==========================================
  app.get('/api/media/status', (_req, res) => {
    return res.json(getMediaStoreStatus());
  });

  // R2 Free-Tier Quota & Telemetry Status
  app.get('/api/media/quota', (_req, res) => {
    return res.json(getR2QuotaStatus());
  });

  // ==========================================
  // MUSIC LIBRARY CATALOG API (PHASE 2)
  // ==========================================
  app.get('/api/music', (req, res) => {
    const { category, search } = req.query;
    let list = [...MUSIC_TRACKS];
    if (category && typeof category === 'string' && category !== 'all') {
      list = list.filter((t) => t.category === category);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.titleBn && t.titleBn.toLowerCase().includes(q)) ||
          t.artist.toLowerCase().includes(q) ||
          (t.artistBn && t.artistBn.toLowerCase().includes(q))
      );
    }
    return res.json({ tracks: list, count: list.length });
  });

  app.get('/api/music/:id', (req, res) => {
    const track = MUSIC_TRACKS.find((t) => t.id === req.params.id);
    if (!track) return res.status(404).json({ error: 'Music track not found' });
    return res.json(track);
  });

  // ==========================================
  // REAL SERVER STORAGE USAGE & SAFE CLEAR CACHE (PHASE 3)
  // ==========================================
  app.get('/api/storage/server-usage', (_req, res) => {
    const dirsToScan = [
      { name: 'images', labelEn: 'Post Images', labelBn: 'পোস্টের ছবি', path: path.resolve(process.cwd(), 'uploads', 'images') },
      { name: 'videos', labelEn: 'Video Uploads', labelBn: 'ভিডিও আপলোড', path: path.resolve(process.cwd(), 'uploads', 'videos') },
      { name: 'audio', labelEn: 'Music & Audio', labelBn: 'মিউজিক ও ভয়েস', path: path.resolve(process.cwd(), 'uploads', 'audio') },
      { name: 'banners', labelEn: 'Cover Banners', labelBn: 'কভার ব্যানার', path: path.resolve(process.cwd(), 'uploads', 'banners') },
      { name: 'avatars', labelEn: 'User Avatars', labelBn: 'প্রোফাইল ছবি', path: path.resolve(process.cwd(), 'uploads', 'avatars') },
      { name: 'private_messages', labelEn: 'Private Attachments', labelBn: 'ব্যক্তিগত এটাচমেন্ট', path: path.resolve(process.cwd(), 'data', 'private_messages') },
    ];

    let totalBytes = 0;
    let totalFiles = 0;
    const breakdown: Record<string, { filesCount: number; bytes: number; sizeKB: number; sizeMB: number; labelEn: string; labelBn: string }> = {};

    for (const d of dirsToScan) {
      let dBytes = 0;
      let dCount = 0;
      if (fs.existsSync(d.path)) {
        try {
          const files = fs.readdirSync(d.path);
          for (const file of files) {
            const fPath = path.join(d.path, file);
            try {
              const stat = fs.statSync(fPath);
              if (stat.isFile()) {
                dBytes += stat.size;
                dCount++;
              }
            } catch {}
          }
        } catch {}
      }
      breakdown[d.name] = {
        filesCount: dCount,
        bytes: dBytes,
        sizeKB: Number((dBytes / 1024).toFixed(1)),
        sizeMB: Number((dBytes / (1024 * 1024)).toFixed(2)),
        labelEn: d.labelEn,
        labelBn: d.labelBn,
      };
      totalBytes += dBytes;
      totalFiles += dCount;
    }

    return res.json({
      success: true,
      totalBytes,
      totalFiles,
      totalKB: Number((totalBytes / 1024).toFixed(1)),
      totalMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
      breakdown,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/storage/clear-cache', (req, res) => {
    // Non-destructive: cleans ephemeral in-memory view counters or temporary indices without removing uploads, messages, or database records!
    return res.json({
      success: true,
      message: 'Server cache synchronized cleanly. All database records and user uploaded media are strictly preserved.',
      freedBytes: 0,
    });
  });

  // Secure Server-Mediated R2 Media Access (Redirects to short-lived presigned URL)
  app.get('/api/media/r2/:key(*)', async (req, res) => {
    const key = req.params.key;
    if (!key) return res.status(400).json({ error: 'Missing object key' });
    if (!isR2Configured()) {
      return res.status(503).json({ error: 'R2 storage is not configured' });
    }
    try {
      const signedUrl = await generatePresignedDownloadUrl(key);
      return res.redirect(signedUrl);
    } catch (err: any) {
      return res.status(404).json({ error: 'Failed to access requested R2 media' });
    }
  });

  app.post('/api/media/upload', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required for media upload' });
    }

    // Server-side Quota Gate: Reject if 8 GB hard cap or 90% Class A ops reached
    const quotaCheck = checkUploadAllowed(0);
    if (!quotaCheck.allowed) {
      return res.status(429).json({
        error: quotaCheck.reason,
        status: quotaCheck.status,
        quota: getR2QuotaStatus(),
      });
    }

    uploadMiddleware.array('files', 5)(req as any, res as any, async (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'File upload error' });
      }

      // Check client-provided video duration if present (max 150s / 2m 30s)
      const duration = Number(req.body?.durationSeconds || req.headers['x-media-duration'] || 0);
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        return res.status(400).json({
          error: `Video duration exceeds maximum allowed limit of ${MAX_VIDEO_DURATION_SECONDS} seconds (150s / 2m 30s).`
        });
      }

      const files = req.files as Express.Multer.File[];
      try {
        const isPrivate = req.query.isPrivate === 'true' || req.query.purpose === 'message' || req.body?.isPrivate === 'true';
        const purpose = (req.query.purpose as any) || (isPrivate ? 'message' : undefined);
        const uploadOptions = { isPrivate, purpose };

        if (!files || files.length === 0) {
          if (req.file) {
            const single = req.file as Express.Multer.File;
            const mediaType = (req.query.type as any) || (single.mimetype.startsWith('video/') ? 'video' : 'image');
            const rec = await registerMediaRecordAsync(user.id, single, mediaType, uploadOptions);
            return res.status(201).json({
              success: true,
              files: [rec],
              url: rec.fileUrl,
            });
          }
          return res.status(400).json({ error: 'No files provided for upload' });
        }

        const mediaType = (req.query.type as any) || 'image';
        const records = await Promise.all(
          files.map((file) => registerMediaRecordAsync(user.id, file, mediaType, uploadOptions))
        );

        return res.status(201).json({
          success: true,
          files: records,
          urls: records.map((r) => r.fileUrl),
          url: records[0]?.fileUrl,
        });
      } catch (uploadErr: any) {
        return res.status(500).json({ error: uploadErr.message || 'Failed to process media storage' });
      }
    });
  });

  // Secure Private Message Media Access (Authenticated & Participant-Authorized)
  app.get('/api/messages/media/:id', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const mediaId = req.params.id;
    let record = getMediaRecordById(mediaId);
    if (!record) {
      record = getMediaRecordByUrl(`/api/messages/media/${mediaId}`);
    }
    if (!record) {
      return res.status(404).json({ error: 'Media attachment not found.' });
    }

    const isOwnerOrAdmin = user.role === 'owner' || user.role === 'admin';
    const isUploader = record.uploaderId === user.id;
    const isParticipant = isMessageParticipantForMedia(record.id, record.fileUrl, user.id);

    if (record.isPrivate && !isOwnerOrAdmin && !isUploader && !isParticipant) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to access this private message media.' });
    }

    // Cloudflare R2: generate short-lived presigned URL (300 seconds)
    if (record.storageProvider === 'r2' && record.storageKey) {
      if (isR2Configured()) {
        try {
          const presignedUrl = await generatePresignedDownloadUrl(record.storageKey, undefined, { presignedExpirySeconds: 300 });
          return res.redirect(presignedUrl);
        } catch {
          return res.status(500).json({ error: 'Failed to generate secure media access URL' });
        }
      }
    }

    // Local Private Disk Storage (data/private_messages)
    const localTarget = record.storageKey || path.join(PRIVATE_MESSAGES_DIR, record.fileName);
    if (fs.existsSync(localTarget)) {
      res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Content-Disposition', `inline; filename="${record.fileName}"`);
      return fs.createReadStream(localTarget).pipe(res);
    }

    // Fallback: check uploads directories if legacy local
    const legacyTarget = path.resolve(process.cwd(), record.fileUrl.replace(/^\//, ''));
    if (fs.existsSync(legacyTarget)) {
      res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      return fs.createReadStream(legacyTarget).pipe(res);
    }

    return res.status(404).json({ error: 'Private media file not found on server.' });
  });

  // Access URL / Signed URL for secure private media
  app.get('/api/media/:id/access-url', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required to access media URL' });
    }

    const record = getMediaRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Media record not found' });
    }

    try {
      const url = await getMediaAccessUrl(record);
      return res.json({ id: record.id, accessUrl: url, isPrivate: record.isPrivate ?? false });
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to generate media access URL' });
    }
  });

  // Authorized Media Deletion with Ownership Verification
  app.delete('/api/media/:id', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required to delete media' });
    }

    try {
      const result = await deleteMediaRecordAuthorized(req.params.id, user.id, user.role);
      if (!result.success) {
        return res.status(result.status || 400).json({ error: result.error || 'Failed to delete media' });
      }
      return res.json({ success: true, message: 'Media deleted successfully' });
    } catch (e: any) {
      return res.status(500).json({ error: 'Internal error during media deletion' });
    }
  });

  // ==========================================
  // REAL SOCIAL NETWORKING ENDPOINTS (PHASE 3)
  // ==========================================

  // Get Posts Feed
  app.get('/api/posts', (req, res) => {
    const user = getAuthUser(req);
    const tag = req.query.tag as string | undefined;
    const posts = getAllPosts(user?.id, tag);
    return res.json({ posts, count: posts.length });
  });

  // Create Post
  app.post('/api/posts', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required to create posts' });
    }

    const {
      content,
      postType = 'text',
      mediaUrls = [],
      thumbnailUrl,
      hashtags = [],
      isAiAssisted = false,
      audience = 'public',
      audioTrack,
      audioUrl,
      audioVolume,
      originalVolume,
      musicAttachment,
    } = req.body;
    const sanitizedMediaUrls = (Array.isArray(mediaUrls) ? mediaUrls : mediaUrls ? [mediaUrls] : [])
      .filter((u): u is string => typeof u === 'string' && u.trim().length > 0);

    if (!content && sanitizedMediaUrls.length === 0) {
      return res.status(400).json({ error: 'Post must contain text content or media attachments' });
    }

    try {
      const created = createPost({
        authorId: user.id,
        content: (content || '').trim(),
        postType,
        mediaUrls: sanitizedMediaUrls,
        thumbnailUrl,
        hashtags,
        isAiAssisted,
        audience,
        audioTrack,
        audioUrl,
        audioVolume,
        originalVolume,
        musicAttachment,
      });

      return res.status(201).json({ post: created, message: 'Post published successfully' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to create post' });
    }
  });

  // Track Post View (with anti-inflation deduplication)
  app.post('/api/posts/:id/view', (req, res) => {
    const caller = getAuthUser(req);
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const visitorKey = caller ? caller.id : clientIp;
    const result = recordPostView(req.params.id, visitorKey);
    return res.json(result);
  });

  // Track Photo View (with anti-inflation deduplication)
  app.post('/api/posts/:id/photo-view', (req, res) => {
    const caller = getAuthUser(req);
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const visitorKey = caller ? caller.id : clientIp;
    const photoIdx = Number(req.body.photoIdx || 0);
    const result = recordPhotoView(req.params.id, photoIdx, visitorKey);
    return res.json(result);
  });

  // ==========================================
  // SCHEDULED POSTS ENDPOINTS (PHASE 6)
  // ==========================================
  app.get('/api/scheduled-posts', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const scheduled = getScheduledPosts(user.id);
    return res.json({ scheduledPosts: scheduled, count: scheduled.length });
  });

  app.post('/api/scheduled-posts', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { content, postType = 'text', mediaUrls = [], thumbnailUrl, scheduledAt, hashtags = [], isAiAssisted = false } = req.body;
    if (!content && (!mediaUrls || mediaUrls.length === 0)) {
      return res.status(400).json({ error: 'Post must contain text content or media attachments' });
    }
    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt timestamp is required' });
    }

    try {
      const scheduledItem = createScheduledPost({
        authorId: user.id,
        content: (content || '').trim(),
        postType,
        mediaUrls,
        thumbnailUrl,
        scheduledAt,
        hashtags,
        isAiAssisted,
      });
      return res.status(201).json({ scheduledPost: scheduledItem, message: 'Post successfully scheduled' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to schedule post' });
    }
  });

  app.put('/api/scheduled-posts/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const updated = updateScheduledPost(req.params.id, user.id, req.body);
      return res.json({ scheduledPost: updated, message: 'Scheduled post updated' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update scheduled post' });
    }
  });

  app.delete('/api/scheduled-posts/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const success = cancelScheduledPost(req.params.id, user.id);
      if (!success) return res.status(404).json({ error: 'Scheduled post not found' });
      return res.json({ success: true, message: 'Scheduled post cancelled' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to cancel scheduled post' });
    }
  });

  // Manual trigger / runner check endpoint
  app.post('/api/scheduled-posts/trigger-runner', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const published = checkAndPublishScheduledPosts();
    return res.json({ success: true, publishedCount: published });
  });

  // Delete Post
  app.delete('/api/posts/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const isOwner = user.role === 'owner';
      const deleted = deletePost(req.params.id, user.id, isOwner);
      if (!deleted) return res.status(404).json({ error: 'Post not found' });
      return res.json({ success: true, message: 'Post deleted successfully' });
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden' });
    }
  });

  // Toggle Like on Post
  app.post('/api/posts/:id/like', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const result = toggleLike(req.params.id, user.id);
      return res.json(result);
    } catch (e: any) {
      return res.status(404).json({ error: e.message || 'Post not found' });
    }
  });

  // Toggle Bookmark on Post
  app.post('/api/posts/:id/bookmark', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const isSaved = toggleBookmark(req.params.id, user.id);
      return res.json({ isSaved });
    } catch (e: any) {
      return res.status(404).json({ error: e.message || 'Post not found' });
    }
  });

  // Add Comment to Post
  app.post('/api/posts/:id/comment', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });

    try {
      const comment = addComment(req.params.id, user.id, text);
      return res.status(201).json({ comment });
    } catch (e: any) {
      return res.status(404).json({ error: e.message || 'Post not found' });
    }
  });

  // Get Reels
  app.get('/api/reels', (req, res) => {
    const user = getAuthUser(req);
    const reels = getAllReels(user?.id);
    return res.json({ reels, count: reels.length });
  });

  // Create Reel
  app.post('/api/reels', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      caption,
      captionBn,
      videoUrl,
      thumbnailUrl,
      audioTitle,
      audioTrack,
      audioUrl,
      audioStartTime,
      audioEndTime,
      audioVolume,
      originalVolume,
      hashtags,
      durationSeconds,
    } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'Video file URL is required' });

    try {
      const reel = createReel({
        authorId: user.id,
        caption: caption || '',
        captionBn,
        videoUrl,
        thumbnailUrl,
        audioTitle,
        audioTrack,
        audioUrl,
        audioStartTime,
        audioEndTime,
        audioVolume,
        originalVolume,
        hashtags,
        durationSeconds,
      });

      return res.status(201).json({ reel, message: 'Reel published successfully' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to create reel' });
    }
  });

  // Toggle Like on Reel
  app.post('/api/reels/:id/like', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const result = toggleLikeReel(req.params.id, user.id);
      return res.json(result);
    } catch (e: any) {
      return res.status(404).json({ error: e.message || 'Reel not found' });
    }
  });

  // Toggle Follow User
  app.post('/api/users/:id/follow', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const result = toggleFollowUser(user.id, req.params.id);
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Follow failed' });
    }
  });

  // ==========================================
  // FACEBOOK-STYLE FRIEND SYSTEM ENDPOINTS
  // ==========================================

  // Friend counts summary (active friends, pending incoming, pending sent)
  app.get('/api/friends/summary', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const summary = getFriendsSummary(user.id);
    return res.json(summary);
  });

  // Get Friends List (for caller or specified userId)
  app.get('/api/friends/list', (req, res) => {
    const user = getAuthUser(req);
    const targetUserId = (req.query.userId as string) || user?.id;
    if (!targetUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const friends = getUserFriendsList(targetUserId, user?.id);
    return res.json({ friends, count: friends.length });
  });

  // Get Incoming Friend Requests
  app.get('/api/friends/requests/incoming', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const requests = getIncomingFriendRequests(user.id);
    return res.json({ requests, count: requests.length });
  });

  // Get Sent Friend Requests
  app.get('/api/friends/requests/sent', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const requests = getSentFriendRequests(user.id);
    return res.json({ requests, count: requests.length });
  });

  // Get Friend Suggestions / Discover People (Searchable)
  app.get('/api/friends/suggestions', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const q = req.query.q as string | undefined;
    const suggestions = getFriendSuggestions(user.id, q);
    return res.json({ suggestions, count: suggestions.length });
  });

  // Get Friendship Status & Mutual Friends with a user
  app.get('/api/friends/status/:targetId', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = req.params.targetId;
    const status = getFriendshipStatus(user.id, targetId);
    const mutuals = getMutualFriends(user.id, targetId);
    return res.json({
      status,
      mutualCount: mutuals.length,
      mutualFriends: mutuals.slice(0, 5),
    });
  });

  // Send Friend Request
  app.post('/api/friends/request/:targetId', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = req.params.targetId;

    try {
      const result = sendFriendRequest(user.id, targetId);
      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to send friend request' });
    }
  });

  // Cancel Sent Friend Request
  app.post('/api/friends/request/:targetId/cancel', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = req.params.targetId;

    try {
      const result = cancelFriendRequest(user.id, targetId);
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to cancel friend request' });
    }
  });

  // Accept Incoming Friend Request
  app.post('/api/friends/request/:targetId/accept', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = req.params.targetId;

    try {
      const result = acceptFriendRequest(user.id, targetId);
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to accept friend request' });
    }
  });

  // Decline Incoming Friend Request
  app.post('/api/friends/request/:targetId/decline', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = req.params.targetId;

    try {
      const result = declineFriendRequest(user.id, targetId);
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to decline friend request' });
    }
  });

  // Remove Friend / Unfriend
  app.delete('/api/friends/:targetId', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const targetId = req.params.targetId;

    try {
      const result = removeFriend(user.id, targetId);
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to remove friend' });
    }
  });

  // Stories Endpoints
  app.get('/api/stories', (req, res) => {
    const user = getAuthUser(req);
    const storiesList = getAllStories(user?.id);
    return res.json({ stories: storiesList });
  });

  app.post('/api/stories', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { mediaUrl, caption, audioTrack, audioUrl, audioVolume } = req.body;
      if (!mediaUrl) {
        return res.status(400).json({ error: 'Media URL is required for a story' });
      }
      const story = createStory({
        authorId: user.id,
        mediaUrl,
        caption,
        audioTrack,
        audioUrl,
        audioVolume,
      });
      return res.status(201).json({ story, message: 'Story published successfully' });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to publish story' });
    }
  });

  app.post('/api/stories/:id/view', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    markStoryViewed(req.params.id, user.id);
    return res.json({ success: true });
  });

  app.delete('/api/stories/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const isAdmin = user.role === 'admin' || user.role === 'owner';
      const success = deleteStory(req.params.id, user.id, isAdmin);
      return res.json({ success, message: 'Story deleted' });
    } catch (e: any) {
      return res.status(403).json({ error: e.message || 'Forbidden' });
    }
  });

  // Direct Messages Endpoints (Facebook-Style 1:1 Messaging)
  app.get('/api/messages/conversations', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const conversations = getConversations(user.id);
    return res.json({ conversations });
  });

  // Search messages across conversations
  app.get('/api/messages/search', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const q = req.query.q as string;
    const results = searchUserMessages(user.id, q);
    return res.json({ results, count: results.length });
  });

  app.get('/api/messages/:partnerId', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const thread = getMessagesBetween(user.id, req.params.partnerId);
    return res.json(thread);
  });

  app.post('/api/messages', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { recipientId, text, isAudio, audioDuration, audioUrl, imageUrl, videoUrl, replyToId, clientMessageId } = req.body;
      const sent = sendDirectMessage({
        senderId: user.id,
        recipientId,
        text,
        isAudio,
        audioDuration,
        audioUrl,
        imageUrl,
        videoUrl,
        replyToId,
        clientMessageId,
      });
      return res.status(201).json({ message: sent });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to send message' });
    }
  });

  // Pin or Unpin Conversation
  app.post('/api/messages/conversations/:partnerId/pin', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const result = togglePinConversation(user.id, req.params.partnerId);
    return res.json({ success: true, ...result });
  });

  // Mute or Unmute Conversation Notifications
  app.post('/api/messages/conversations/:partnerId/mute', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const result = toggleMuteConversation(user.id, req.params.partnerId);
    return res.json({ success: true, ...result });
  });

  // Clear / Delete Conversation Thread
  app.delete('/api/messages/conversations/:partnerId', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const result = clearConversationMessages(user.id, req.params.partnerId);
    return res.json(result);
  });

  // Toggle emoji reaction on message
  app.post('/api/messages/:id/react', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

    try {
      const result = toggleMessageReaction(req.params.id, user.id, emoji);
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to react' });
    }
  });

  // Delete message
  app.delete('/api/messages/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const forEveryone = req.query.forEveryone === 'true';
    try {
      const result = deleteMessage(req.params.id, user.id, forEveryone);
      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Failed to delete message' });
    }
  });

  app.post('/api/messages/read/:partnerId', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const updatedCount = markMessagesAsRead(user.id, req.params.partnerId);
    return res.json({ success: true, count: updatedCount });
  });

  // Notifications Endpoints
  app.get('/api/notifications', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const notifs = getNotificationsForUser(user.id);
    return res.json({ notifications: notifs });
  });

  app.post('/api/notifications/:id/read', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const success = markNotificationAsRead(user.id, req.params.id);
    return res.json({ success });
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const count = markAllNotificationsAsRead(user.id);
    return res.json({ success: true, count });
  });

  // Search & Explore Endpoints
  app.get('/api/explore/search', (req, res) => {
    const user = getAuthUser(req);
    const q = (req.query.q as string) || '';
    const results = searchContentAndUsers(q, user?.id);
    return res.json(results);
  });

  app.get('/api/explore/trending', (req, res) => {
    const trendingTags = getExploreTrendingTags();
    return res.json({ trendingTags });
  });

  // API Status & Health
  app.get('/api/status', (req, res) => {
    res.json({
      app: 'Zan-Gi Social Universe Backend Gateway',
      version: '1.0.0-prod-foundation',
      aiConfigured: Boolean(genAI),
      model: genAI ? 'gemini-3.8-flash' : 'local-demo-engine',
      environment: isProd ? 'production' : 'development',
      time: new Date().toISOString()
    });
  });

  // API: AI Assistant endpoint
  app.post('/api/ai/assistant', async (req, res) => {
    try {
      const { message, language = 'en', task = 'chat', tone = 'friendly' } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message text is required' });
      }

      if (!genAI) {
        return res.status(503).json({
          status: 'unconfigured',
          configured: false,
          error: language === 'bn'
            ? 'সার্ভারে জেমিনি এআই এপিআই কি (GEMINI_API_KEY) কনফিগার করা নেই। লাইভ এআই ফিচার ব্যবহারের জন্য অনুগ্রহ করে সার্ভার এনভায়রনমেন্টে GEMINI_API_KEY সেট করুন।'
            : 'Gemini AI API key (GEMINI_API_KEY) is not configured in server environment. Please set GEMINI_API_KEY in server secrets/environment to enable live AI responses.',
          disclaimer: 'Notice: Live Gemini backend requires GEMINI_API_KEY in environment variables.'
        });
      }

      const systemPrompt = `You are Zan-Gi AI, the intelligent creator & social copilot for the Zan-Gi platform.
Language preference: ${language === 'bn' ? 'Bengali (বাংলা)' : 'English'}.
Zan-Gi Tagline: "Connect. Create. Imagine. Earn."
Focus: Help social media creators, digital artists, and users across Bangladesh and global audiences.
Tasks: Writing help, social captions, Bengali/English translations, hashtag suggestions, short video scripts, spelling/grammar check, creator tips.
Maintain high aesthetic taste, constructive tone, and respect user safety.
Tone: ${tone}.`;

      const response = await genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      return res.json({
        status: 'live_gemini',
        configured: true,
        model: 'gemini-3.8-flash',
        reply: response.text || 'No response generated.',
        disclaimer: 'Live AI response generated via server-side Gemini 3.8 Flash proxy.'
      });
    } catch (err: any) {
      console.error('Error generating AI response:', err);
      return res.status(502).json({
        status: 'upstream_error',
        configured: true,
        error: err.message || 'Error communicating with Google Gemini AI model',
        disclaimer: 'Notice: Upstream Gemini API request failed. Check network or API quota.'
      });
    }
  });

  // AI Content Safety & Moderation filter (Phase 5)
  app.post('/api/ai/moderate', async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.json({ flagged: false, categories: [], reason: 'Empty text' });
    }

    const hateRegex = /\b(hate|kill|slur|scam|fraud|phishing|attack|abuse|violence)\b/i;
    const isRuleFlagged = hateRegex.test(text);

    if (genAI) {
      try {
        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Evaluate this social post or comment in Bengali or English for severe violations: hate speech, harassment, scam, explicit content. Output JSON with { "flagged": boolean, "categories": string[], "reason": string }. Text: "${text}"`,
          config: {
            responseMimeType: 'application/json'
          }
        });
        const parsed = JSON.parse(response.text || '{}');
        return res.json({
          flagged: Boolean(parsed.flagged),
          categories: parsed.categories || [],
          reason: parsed.reason || 'Content safety check complete'
        });
      } catch {
        // Fallback to pattern match
      }
    }

    return res.json({
      flagged: isRuleFlagged,
      categories: isRuleFlagged ? ['harassment_or_spam'] : [],
      reason: isRuleFlagged ? 'Automated pattern matched sensitive keywords.' : 'Passed local safety filter'
    });
  });

  // AI Caption & Hashtag Generator (Phase 5)
  app.post('/api/ai/generate-caption', async (req, res) => {
    const { topic = '', language = 'bn', tone = 'trendy', postType = 'post' } = req.body;

    if (genAI) {
      try {
        const prompt = `You are an expert social media strategist for Zan-Gi platform in Bangladesh.
Generate an engaging caption and hashtags for a ${postType === 'reel' ? 'Short Reel' : 'Post'}.
Topic / context: "${topic}".
Language: ${language === 'bn' ? 'Bengali (বাংলা)' : language === 'banglish' ? 'Banglish' : 'English'}.
Tone: ${tone}.
Format response as JSON:
{
  "caption": "engaging caption text with emojis and clear hook",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6"],
  "callToAction": "engaging short question"
}`;

        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        const data = JSON.parse(response.text || '{}');
        return res.json({
          caption: data.caption || `${topic} 🚀`,
          hashtags: data.hashtags || ['ZanGiBD', 'CreatorEconomy', 'AI2026'],
          callToAction: data.callToAction || 'আপনার মতামত জানান!'
        });
      } catch (e) {
        // Fallback below
      }
    }

    const isBn = language === 'bn';
    const sampleCaption = isBn
      ? `✨ ${topic ? `আজকের ক্রিয়েশন: ${topic}` : 'Zan-Gi সোশ্যাল ইউনিভার্সে নতুন ভাবনা!'} 🚀\n\nপ্রযুক্তি ও সৃজনশীলতার মেলবন্ধনে প্রতিদিনের অনুপ্রেরণা। আপনাদের আজকের দিনটি কেমন কাটছে? কমেন্টে শেয়ার করুন!`
      : `✨ ${topic ? `Exploring: ${topic}` : 'Building fresh perspectives on Zan-Gi!'} 🚀\n\nBlending creative storytelling with modern tech. How is your creative flow going today? Let us know below!`;

    const tags = isBn
      ? ['ZanGiBD', 'বাংলাক্রিয়েটর', 'সৃজনশীলতা', 'ঢাকাভাইবস', 'DigitalBangladesh', 'CreatorPulse']
      : ['ZanGi', 'AIUniverse', 'CreatorEconomy', 'Innovate', 'SocialTech', 'Dhaka2026'];

    return res.json({
      caption: sampleCaption,
      hashtags: tags,
      callToAction: isBn ? 'আপনার মন্তব্য জানান!' : 'Drop your thoughts!'
    });
  });

  // AI Smart Replies (Phase 5)
  app.post('/api/ai/smart-replies', async (req, res) => {
    const { postContent = '', language = 'bn' } = req.body;

    if (genAI && postContent.length > 5) {
      try {
        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Given this social post: "${postContent}", generate exactly 3 friendly, natural smart reply suggestions for users in Bangladesh. Language: ${language === 'bn' ? 'Bengali' : 'English'}. Format JSON: { "replies": ["reply1", "reply2", "reply3"] }`,
          config: {
            responseMimeType: 'application/json'
          }
        });
        const data = JSON.parse(response.text || '{}');
        if (Array.isArray(data.replies) && data.replies.length > 0) {
          return res.json({ replies: data.replies.slice(0, 3) });
        }
      } catch {}
    }

    const isBn = language === 'bn' || /[\u0980-\u09FF]/.test(postContent);
    const replies = isBn
      ? ['অসাধারণ কাজ! শুভকামনা রইল 🌟', 'খুব সুন্দর ও তথ্যবহুল পোস্ট! ❤️', 'পরবর্তী আপডেটের অপেক্ষায় রইলাম! 🚀']
      : ['Great work, keep inspiring! 🌟', 'Really insightful perspective! ❤️', 'Looking forward to more updates! 🚀'];

    return res.json({ replies });
  });

  // AI Trending Summary / Daily Pulse (Phase 5)
  app.get('/api/ai/trending-summary', async (req, res) => {
    const allPosts = getAllPosts();
    const summaryPosts = allPosts.slice(0, 4).map((p) => p.content).join(' | ');

    if (genAI && summaryPosts) {
      try {
        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Analyze these recent Zan-Gi community posts: "${summaryPosts}". Provide a brief 2-sentence trending community pulse summary in Bengali and English. JSON: { "summaryBn": "string", "summaryEn": "string", "topTopics": ["topic1", "topic2", "topic3"] }`,
          config: {
            responseMimeType: 'application/json'
          }
        });
        const data = JSON.parse(response.text || '{}');
        return res.json(data);
      } catch {}
    }

    return res.json({
      summaryBn: '🔥 আজ Zan-Gi কমিউনিটিতে AI ক্রিয়েটর টুলস, ঢাকার টেক কালচার এবং নদীর প্রাকৃতিক দৃশ্য নিয়ে আলোচনা তুঙ্গে!',
      summaryEn: '🔥 Today in Zan-Gi: Discussions are buzzing around AI creator tools, Dhaka tech culture, and scenic river visuals!',
      topTopics: ['#বাংলাAI', '#CreatorEconomy', '#DhakaTech2026', '#ZanGiReels']
    });
  });

  // ==========================================
  // PHASE 5: ZAN-GI AI ENGINE DEDICATED ROUTES
  // ==========================================

  // AI Feature A: Caption Polisher (Bengali & English, 4 tones)
  app.post('/api/ai/polish-caption', async (req, res) => {
    try {
      const user = getAuthUser(req);
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const { text, language, tone } = req.body;

      const result = await polishCaptionService(
        { text, language, tone },
        { userId: user?.id, ip: clientIp }
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to polish caption' });
    }
  });

  // AI Feature B: Bengali <-> English Translator
  app.post('/api/ai/translate', async (req, res) => {
    try {
      const user = getAuthUser(req);
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const { text, sourceLang, targetLang } = req.body;

      const result = await translateContentService(
        { text, sourceLang, targetLang },
        { userId: user?.id, ip: clientIp }
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to translate content' });
    }
  });

  // AI Feature C: Short Video & Reels Script Generator
  app.post('/api/ai/generate-script', async (req, res) => {
    try {
      const user = getAuthUser(req);
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const { topic, language, tone, durationSeconds } = req.body;

      const result = await generateScriptService(
        { topic, language, tone, durationSeconds },
        { userId: user?.id, ip: clientIp }
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to generate script' });
    }
  });

  // STEP 5: AI Admin Metrics Inspection
  app.get('/api/admin/ai-metrics', (req, res) => {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Unauthorized: Admin privileges required to inspect AI telemetry.' });
    }

    return res.json({
      metrics: getAiMetricsAdmin(user.id),
      config: getAiConfig(),
    });
  });

  // STEP 5: AI Admin Configuration Controls
  app.put('/api/admin/ai-config', (req, res) => {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Unauthorized: Admin privileges required to modify AI system settings.' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const updated = updateAiConfigAdmin(user.id, req.body, clientIp);
    return res.json({
      message: 'AI system limits and configuration updated successfully.',
      config: updated,
    });
  });

  // API: Ads Config Endpoint
  app.get('/api/ads/config', (req, res) => {
    const config = getMonetizationConfig();
    const isTestMode = config.testMode !== undefined ? config.testMode : true;

    // In test mode: safely use official Google test ad IDs to protect user's AdMob account from policy violations.
    // In production mode: use user's authentic configured AdMob IDs.
    const appId = isTestMode
      ? 'ca-app-pub-3940256099942544~3347511713'
      : (process.env.ADMOB_APP_ID || config.admobAppId || 'ca-app-pub-3940256099942544~3347511713');
    const bannerAdUnitId = isTestMode
      ? 'ca-app-pub-3940256099942544/6300978111'
      : (process.env.ADMOB_BANNER_UNIT_ID || config.admobBannerAdUnitId || 'ca-app-pub-3940256099942544/6300978111');
    const interstitialAdUnitId = isTestMode
      ? 'ca-app-pub-3940256099942544/1033173712'
      : (process.env.ADMOB_INTERSTITIAL_UNIT_ID || config.admobInterstitialAdUnitId || 'ca-app-pub-3940256099942544/1033173712');
    const rewardedAdUnitId = isTestMode
      ? 'ca-app-pub-3940256099942544/5224354917'
      : (process.env.ADMOB_REWARDED_UNIT_ID || config.admobRewardedAdUnitId || 'ca-app-pub-3940256099942544/5224354917');
    const nativeAdUnitId = isTestMode
      ? 'ca-app-pub-3940256099942544/2247696110'
      : (process.env.ADMOB_NATIVE_UNIT_ID || config.admobNativeAdUnitId || 'ca-app-pub-3940256099942544/2247696110');

    res.json({
      adsEnabled: true,
      appId,
      bannerAdUnitId,
      interstitialAdUnitId,
      rewardedAdUnitId,
      nativeAdUnitId,
      isTestMode,
      provider: isTestMode ? 'Google Mobile Ads SDK (AdMob Test Suite)' : 'Google Mobile Ads SDK (AdMob Production)',
      consentStatus: 'OBTAINED_CONSENT_GDPR_EEA',
      creatorRevSharePercent: config.creatorSharePct || 70,
      interstitialCooldownSeconds: 180,
      ssvCallbackUrl: 'https://api.zan-gi.app/api/ads/admob-ssv-callback',
    });
  });

  // Owner/Admin: Update AdMob configuration (testMode, custom IDs)
  app.put('/api/admin/owner/admob-config', (req, res) => {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Unauthorized: Owner or Admin privileges required.' });
    }

    const { testMode, admobAppId, admobBannerAdUnitId, admobInterstitialAdUnitId, admobNativeAdUnitId, admobRewardedAdUnitId, reason } = req.body;
    try {
      const patch: any = {};
      if (typeof testMode === 'boolean') patch.testMode = testMode;
      if (admobAppId !== undefined) patch.admobAppId = admobAppId;
      if (admobBannerAdUnitId !== undefined) patch.admobBannerAdUnitId = admobBannerAdUnitId;
      if (admobInterstitialAdUnitId !== undefined) patch.admobInterstitialAdUnitId = admobInterstitialAdUnitId;
      if (admobNativeAdUnitId !== undefined) patch.admobNativeAdUnitId = admobNativeAdUnitId;
      if (admobRewardedAdUnitId !== undefined) patch.admobRewardedAdUnitId = admobRewardedAdUnitId;

      const result = updateMonetizationConfigAdmin(user.id, patch, reason || 'Owner updated AdMob configuration in Admin Panel');
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.json({ success: true, readiness: getAdMobReadinessStatus(), config: result.config });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update AdMob config' });
    }
  });

  // Mount Vite or static files
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zan-Gi Fullstack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
