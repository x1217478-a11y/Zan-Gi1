export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl: string;
  bannerUrl?: string;
  bio: string;
  isVerified: boolean;
  isEmailVerified?: boolean;
  role?: 'owner' | 'admin' | 'creator' | 'user';
  isFollowing?: boolean;
  followersCount: number;
  followingCount: number;
  creatorCoins: number;
  monetaryBalanceCents?: number;
  languagePreference?: 'bn' | 'en';
  joinedDate?: string;
  isDeactivated?: boolean;
  isBanned?: boolean;
  isPrivate?: boolean;
  whoCanComment?: 'everyone' | 'followers' | 'none';
  whoCanMessage?: 'everyone' | 'followers' | 'none';
  blockedUserIds?: string[];
  twoFactorEnabled?: boolean;
  isPremium?: boolean;
  premiumTier?: 'basic' | 'pro' | 'creator_plus';
  premiumExpiresAt?: string;
  notificationPreferences?: NotificationPreferences;
  mediaPreferences?: MediaPreferences;
  storagePreferences?: StoragePreferences;
  profileVisitsCount?: number;
}

export interface NotificationPreferences {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  systemUpdates: boolean;
  creatorEarn: boolean;
}

export interface MediaPreferences {
  dataSaver: boolean;
  autoplay: boolean;
  mediaQuality: 'high' | 'standard' | 'data_saver';
}

export interface StoragePreferences {
  saveMediaToDevice: boolean;    // Save photos/videos/voice notes to user device when downloaded
  autoDownload: boolean;         // Global auto-download flag
  autoDownloadPhotos: 'never' | 'wifi_only' | 'always';
  autoDownloadVideos: 'never' | 'wifi_only' | 'always';
  autoDownloadVoiceNotes: 'never' | 'wifi_only' | 'always';
  wifiOnly: boolean;             // Restrict auto-download to Wi-Fi connections
  saveToGallery: boolean;        // Optional save to device gallery with permission
  cloudDelivery: boolean;        // Cloud backup for cross-device & offline recipient access
  localOnlyMedia: boolean;       // Local-only media mode (no cloud backup)
}

export interface SessionInfo {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
  userAgent: string;
  isCurrent?: boolean;
}

export interface SystemMetrics {
  totalUsers: number;
  activeSessions: number;
  totalPosts: number;
  totalReels: number;
  totalComments: number;
  flaggedReports: number;
  aiRequestsToday: number;
  geminiModel: string;
  totalGrossRevenueCents?: number;
  totalCreatorPayoutsCents?: number;
  pendingWithdrawalsCount?: number;
}

export interface AdminUserItem {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  role: 'owner' | 'admin' | 'creator' | 'user';
  isVerified: boolean;
  isEmailVerified: boolean;
  isDeactivated: boolean;
  isBanned: boolean;
  creatorCoins: number;
  isPremium?: boolean;
  premiumTier?: string;
  createdAt: string;
}

export interface ReportedPostItem {
  id: string;
  postId: string;
  postContent: string;
  postAuthorId: string;
  reporterId: string;
  reason: string;
  category?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  timestamp: string;
  aiRecommendation?: {
    suggestedAction: 'dismiss' | 'warning' | 'delete_post' | 'escalate';
    confidence: number;
    ruleCitation: string;
    reasoning: string;
  };
  appeal?: {
    id: string;
    statement: string;
    submittedAt: string;
    status: 'pending' | 'granted' | 'denied';
    reviewerNotes?: string;
  };
}

export type PostType = 'text' | 'image' | 'short_video' | 'sponsored_native_ad';

export interface MusicTrack {
  id: string;
  title: string;
  titleBn?: string;
  artist: string;
  artistBn?: string;
  category: 'trending' | 'bangla' | 'hindi' | 'english' | 'instrumental';
  durationSeconds: number;
  audioUrl: string;
  coverUrl?: string;
  isFavorite?: boolean;
}

export interface PostMusicAttachment {
  track: MusicTrack;
  startTime: number;
  endTime: number;
  originalVolume: number; // 0 to 1
  musicVolume: number;    // 0 to 1
}

export interface Reel {
  id: string;
  author: User;
  caption: string;
  captionBn: string;
  videoUrl: string;
  thumbnailUrl: string;
  audioTitle: string;
  audioTrack?: MusicTrack;
  audioUrl?: string;
  audioStartTime?: number;
  audioEndTime?: number;
  audioVolume?: number;
  originalVolume?: number;
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
  sharesCount: number;
  isSaved: boolean;
  hashtags: string[];
  durationSeconds: number;
  isDemoData?: boolean;
}

export interface Comment {
  id: string;
  author: User;
  text: string;
  timestamp: string;
  likesCount: number;
  isLiked?: boolean;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  postType: PostType;
  mediaUrl?: string;
  mediaUrls?: string[];
  thumbnailUrl?: string;
  timestamp: string;
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
  comments?: Comment[];
  sharesCount: number;
  isSaved: boolean;
  hashtags: string[];
  isAiAssisted?: boolean;
  recommendationReason?: string;
  isDemoData: boolean;
  viewsCount?: number;
  photoViewsCount?: number;
  audience?: 'public' | 'friends' | 'only_me';
  audioTrack?: MusicTrack;
  audioUrl?: string;
  audioVolume?: number;
  originalVolume?: number;
  musicAttachment?: PostMusicAttachment;
}

export interface ScheduledPost {
  id: string;
  authorId: string;
  content: string;
  postType: PostType;
  mediaUrls: string[];
  thumbnailUrl?: string;
  scheduledAt: string; // ISO date string
  status: 'pending' | 'published' | 'cancelled';
  hashtags: string[];
  isAiAssisted?: boolean;
  createdAt: string;
  publishedPostId?: string;
  audioTrack?: MusicTrack;
  audioUrl?: string;
}

export interface Story {
  id: string;
  author: User;
  mediaUrl: string;
  caption?: string;
  hasUnseen: boolean;
  createdAt?: string;
  audioTrack?: MusicTrack;
  audioUrl?: string;
  audioVolume?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId?: string;
  text: string;
  timestamp: string;
  isAudio?: boolean;
  audioDuration?: string;
  audioUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  replyToId?: string;
  replyToPreview?: {
    id: string;
    senderName: string;
    text: string;
  };
  reactions?: Record<string, string>;
  isDeleted?: boolean;
  isRead?: boolean;
  createdAt?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  clientMessageId?: string;
}

export interface ConversationSummary {
  partner: User;
  lastMessage: ChatMessage;
  unreadCount: number;
  isBlocked?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actor?: User;
  type: 'like' | 'comment' | 'follow' | 'tip' | 'payout' | 'system';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CreatorLiveRoom {
  id: string;
  title: string;
  host: User;
  activeListeners: number;
  topicTags: string[];
  isLiveNow: boolean;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  language: 'bn' | 'en';
  taskType?: string;
  modelSignature?: string;
  isDemoFallback?: boolean;
}

export interface AdConfiguration {
  adsEnabled: boolean;
  appId?: string;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
  nativeAdUnitId: string;
  isTestMode: boolean;
  consentObtained: boolean;
  creatorRevenueSharePercentage: number;
}

// ==========================================
// MONETIZATION & LEDGER TYPES (PHASE 2, 4, 6)
// ==========================================

export type LedgerEntryType =
  | 'rewarded_ad'
  | 'creator_coin_purchase'
  | 'tip'
  | 'withdrawal'
  | 'adjustment'
  | 'fee'
  | 'reversal';

export type LedgerCategory =
  | 'earning'
  | 'payout'
  | 'platform_fee'
  | 'tax'
  | 'reversal';

export type LedgerStatus =
  | 'pending'
  | 'available'
  | 'held'
  | 'paid'
  | 'reversed';

export interface LedgerEntry {
  id: string;
  userId: string;
  type: LedgerEntryType;
  category: LedgerCategory;
  status: LedgerStatus;
  grossAmountCents: number; // Integer minor units (e.g. 50 = $0.50)
  creatorAmountCents: number; // 70% of distributable base
  platformAmountCents: number; // 30% of distributable base
  taxAmountCents: number; // Separate 2% VAT on taxable platform service base
  netPayableCents: number;
  coinsAmount: number;
  description: string;
  referenceId: string;
  createdAt: string;
  isDemo?: boolean;
}

export type SupportedPayoutProvider = 'bkash' | 'nagad' | 'rocket';
export type PayoutProvider = 'bkash' | 'nagad' | 'rocket';
export const SUPPORTED_PAYOUT_PROVIDERS: readonly SupportedPayoutProvider[] = ['bkash', 'nagad', 'rocket'] as const;

export interface PayoutDetails {
  provider: PayoutProvider;
  accountIdentifierMasked: string; // e.g. "017***4589" or "017***4589-7"
  accountHolderName: string;
  verifiedAt?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amountCents: number;
  coinsDeducted: number;
  feeAmountCents?: number;
  netPayoutCents?: number;
  payoutMethod: PayoutProvider;
  payoutDetails: PayoutDetails;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  rejectionReason?: string;
  adminNotes?: string;
  transactionReference?: string;
  createdAt: string;
  processedAt?: string;
}

export interface ContentPerformanceItem {
  id: string;
  type: 'post' | 'reel';
  title: string;
  viewsCount: number;
  watchTimeSeconds: number;
  likesCount: number;
  commentsCount: number;
  estimatedEarningsCents: number;
  createdAt: string;
}

export interface MonetizationConfig {
  creatorSharePct: number; // 70
  platformSharePct: number; // 30
  vatTaxRatePct: number; // 2.0 (auditable separate line)
  vatTreatment: string; // 'platform_service_tax'
  minWithdrawalCents: number; // 10000 ($100.00)
  withdrawalFeePct: number; // e.g. 1.5%
  dailyRewardedAdCap: number; // 10
  rewardedAdCooldownSeconds: number; // 60
  rewardedAdGrossCents: number; // 50
  rewardCoinsPerAd: number; // 50
  testMode: boolean;
  admobAppId?: string;
  admobRewardedAdUnitId?: string;
  admobInterstitialAdUnitId?: string;
  admobBannerAdUnitId?: string;
  admobNativeAdUnitId?: string;
  admobSsvKeyId?: string;
  auditHistory: Array<{
    changedAt: string;
    adminId: string;
    reason: string;
    changes: Record<string, { from: any; to: any }>;
  }>;
}

export interface MonetizationSummary {
  isEligible: boolean;
  accountStatus: 'active' | 'under_review' | 'restricted';
  eligibilityMetrics: {
    followerCount: number;
    requiredFollowers: number;
    accountAgeDays: number;
    requiredAccountAgeDays: number;
    guidelineStrikes: number;
    isVerifiedBadge: boolean;
  };
  totalGrossRevenueCents: number;
  totalCreatorShareCents: number;
  totalPlatformShareCents: number;
  totalTaxWithheldCents: number;
  availableBalanceCents: number;
  heldBalanceCents: number;
  totalPaidOutCents: number;
  creatorCoins: number;
  completedRewardedAds: number;
  eligibleImpressions: number;
  watchTimeMinutes: number;
  estimatedVsFinalized: {
    finalizedRevenueCents: number;
    estimatedPendingRevenueCents: number;
    heldInWithdrawalsCents: number;
  };
  postsAndReelsPerformance: ContentPerformanceItem[];
  withdrawalFeePct: number;
  dailyEarningsCents: number;
  weeklyEarningsCents: number;
  monthlyEarningsCents: number;
  dateRangeApplied?: string;
  payoutMethods: PayoutDetails[];
  recentLedgerEntries: LedgerEntry[];
  recentWithdrawals: WithdrawalRequest[];
  isDemoData: boolean;
}

export interface AiLaunchConfig {
  isDiscoveryAssistanceEnabled: boolean;
  isContentRecommendationsEnabled: boolean;
  isLaunchPreviewEnabled: boolean;
  isSimulatedActivityEnabled: boolean;
  emergencyKillSwitchActive: boolean;
  simulationRateLimitPerHour: number;
  simulationSessionExpiresAt: string | null;
  simulationMaxItems: number;
  activeSimulationsCount: number;
  auditHistory: Array<{
    timestamp: string;
    action: string;
    ownerId: string;
    details: any;
    ip: string;
  }>;
}

export interface SuspiciousActivityItem {
  id: string;
  userId: string;
  username: string;
  type: 'rapid_ad_claims' | 'multiple_accounts_ip' | 'duplicate_ssv_attempt' | 'excessive_withdrawal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  details: string;
}

export interface AdMobReadinessStatus {
  isProductionReady: boolean;
  missingKeys: string[];
  isTestMode: boolean;
  consentFramework: string;
  appIdConfigured: boolean;
  rewardedUnitConfigured: boolean;
  interstitialUnitConfigured: boolean;
  bannerUnitConfigured: boolean;
  nativeUnitConfigured: boolean;
  guidance: string[];
  configuredUnits?: {
    appId: string;
    bannerAdUnitId: string;
    interstitialAdUnitId: string;
    nativeAdUnitId: string;
    rewardedAdUnitId: string;
  };
  activeMode?: 'test_mode' | 'production_mode';
  ssvCallbackUrl?: string;
}


// ==========================================
// COMMUNITY STANDARDS & RULES (PHASE 7, 8)
// ==========================================

export interface CommunityRule {
  id: string;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  severity: 'minor' | 'moderate' | 'high' | 'critical';
  prohibitedBehaviors: string[];
}

// ==========================================
// FACEBOOK-STYLE FRIEND SYSTEM (PHASE 7)
// ==========================================

export interface FriendItem {
  friend: User;
  friendshipId?: string;
  friendsSince: string;
  mutualCount: number;
  mutualFriends?: User[];
  viewerStatus?: 'friends' | 'pending_sent' | 'pending_received' | 'none';
}

export interface FriendRequestItem {
  requestId: string;
  sender?: User;
  recipient?: User;
  createdAt: string;
  mutualCount: number;
  mutualFriends?: User[];
}

export interface FriendSuggestionItem {
  user: User;
  status: 'friends' | 'pending_sent' | 'pending_received' | 'none';
  mutualCount: number;
  mutualFriends?: User[];
}

export interface FriendsSummary {
  friendsCount: number;
  incomingCount: number;
  sentCount: number;
}
