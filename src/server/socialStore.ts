import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { findUserById, sanitizeUser, getAllActiveUsers } from './authService.js';
import { deleteMediaFile } from './mediaStore.js';
import { atomicWriteJson, safeReadJson } from './database.js';

export interface DbFriendship {
  id: string;
  user1Id: string; // Lexicographically lower user id
  user2Id: string; // Lexicographically higher user id
  createdAt: string;
}

export interface DbFriendRequest {
  id: string;
  senderId: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface DbComment {
  id: string;
  authorId: string;
  text: string;
  timestamp: string;
  createdAt: string;
  likesCount: number;
}

export interface DbReport {
  id: string;
  postId: string;
  postContent: string;
  postAuthorId: string;
  reporterId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  timestamp: string;
}

export interface DbPost {
  id: string;
  authorId: string;
  content: string;
  postType: 'text' | 'image' | 'short_video' | 'sponsored_native_ad';
  mediaUrls: string[];
  thumbnailUrl?: string;
  timestamp: string;
  createdAt: string;
  likedUserIds: string[];
  bookmarkedUserIds: string[];
  comments: DbComment[];
  sharesCount: number;
  hashtags: string[];
  isAiAssisted: boolean;
  recommendationReason?: string;
  isDemoData: boolean;
  viewsCount?: number;
  photoViewsCount?: number;
  audience?: 'public' | 'friends' | 'only_me';
  audioTrack?: any;
  audioUrl?: string;
  audioVolume?: number;
  originalVolume?: number;
  musicAttachment?: any;
}

export interface DbReel {
  id: string;
  authorId: string;
  caption: string;
  captionBn: string;
  videoUrl: string;
  thumbnailUrl?: string;
  audioTitle: string;
  audioTrack?: any;
  audioUrl?: string;
  audioStartTime?: number;
  audioEndTime?: number;
  audioVolume?: number;
  originalVolume?: number;
  likedUserIds: string[];
  bookmarkedUserIds: string[];
  comments: DbComment[];
  sharesCount: number;
  hashtags: string[];
  durationSeconds: number;
  createdAt: string;
  isDemoData: boolean;
}

export interface DbScheduledPost {
  id: string;
  authorId: string;
  content: string;
  postType: 'text' | 'image' | 'short_video';
  mediaUrls: string[];
  thumbnailUrl?: string;
  scheduledAt: string; // ISO date string
  status: 'pending' | 'published' | 'cancelled' | 'failed';
  hashtags: string[];
  isAiAssisted?: boolean;
  createdAt: string;
  publishedPostId?: string;
  retryCount?: number;
  lastError?: string;
  audioTrack?: any;
  audioUrl?: string;
}

export interface DbStory {
  id: string;
  authorId: string;
  mediaUrl: string;
  caption?: string;
  viewedByUserIds: string[];
  createdAt: string;
  audioTrack?: any;
  audioUrl?: string;
  audioVolume?: number;
}

export interface DbMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
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
  deletedForUserIds?: string[];
  isRead: boolean;
  createdAt: string;
}

export interface DbNotification {
  id: string;
  userId: string;
  actorId?: string;
  type: 'like' | 'comment' | 'follow' | 'tip' | 'payout' | 'system' | 'friend_request' | 'friend_accept';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'social_db.json');

let posts: DbPost[] = [];
let reels: DbReel[] = [];
let follows: Map<string, string[]> = new Map(); // userId -> list of followingUserIds
let reports: DbReport[] = [];
let scheduledPosts: DbScheduledPost[] = [];
let stories: DbStory[] = [];
let messages: DbMessage[] = [];
let notifications: DbNotification[] = [];
let friendships: DbFriendship[] = [];
let friendRequests: DbFriendRequest[] = [];
let conversationPreferences: Map<string, { pinned: string[]; muted: string[] }> = new Map();

// Seed initial content (Clearly labeled as DEMO CONTENT)
function seedInitialData() {
  posts = [
    {
      id: 'post_seed_1',
      authorId: 'user_fahim',
      content:
        'স্বাগতম Zan-Gi প্ল্যাটফর্মে! 🚀 ২০২৬ সালের নতুন AI-ফার্স্ট সোশ্যাল ইউনিভার্স। এখানে বাংলা ও ইংরেজি উভয় ভাষায় তাৎক্ষণিক কনটেন্ট ড্রাফটিং, স্মার্ট ফিড এবং ক্রিয়েটরদের জন্য সরাসরি রেভিনিউ শেয়ারিং যুক্ত করা হয়েছে। আপনার প্রতিক্রিয়া কী?',
      postType: 'image',
      mediaUrls: ['/src/assets/images/zangi_feed_cybercity_1791614814919.jpg'],
      timestamp: '১০ মিনিট আগে',
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      likedUserIds: ['user_owner', 'user_nusrat'],
      bookmarkedUserIds: [],
      comments: [
        {
          id: 'comm_1',
          authorId: 'user_nusrat',
          text: 'অসাধারণ ফিচারস! ক্রিয়েটর স্টুডিওর রেসপন্স টাইম চমৎকার।',
          timestamp: '৫ মিনিট আগে',
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          likesCount: 12,
        },
      ],
      sharesCount: 22,
      hashtags: ['ZanGiBD', 'বাংলাAI', 'DhakaTech2026', 'CreatorEconomy'],
      isAiAssisted: true,
      recommendationReason: 'Because you follow Tech & AI Creators in Dhaka',
      isDemoData: true,
    },
    {
      id: 'post_seed_2',
      authorId: 'user_nusrat',
      content:
        'Sunday morning aerial exploration over the Meghna river delta. The interplay between morning mist and river channels is unmatched! Generated ambient soundscapes right in Zan-Gi Creator Studio. 🌿✨',
      postType: 'image',
      mediaUrls: ['/src/assets/images/zangi_feed_nature_1791614825382.jpg'],
      timestamp: '১ ঘণ্টা আগে',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      likedUserIds: ['user_fahim'],
      bookmarkedUserIds: ['user_fahim'],
      comments: [],
      sharesCount: 49,
      hashtags: ['BeautifulBangladesh', 'NatureVisuals', 'CreatorPulse'],
      isAiAssisted: false,
      recommendationReason: 'Popular in Visual Arts & Landscape Photography',
      isDemoData: true,
    },
    {
      id: 'post_seed_3',
      authorId: 'user_owner',
      content:
        'Sample Native Ad Placement: Test your mobile monetization flow with Google Mobile Ads SDK (Ad Unit: ca-app-pub-3940256099942544/2247696110). Supports banners, native feed cards, interstitial cooldowns, and rewarded units with creator coin grants.',
      postType: 'sponsored_native_ad',
      mediaUrls: [],
      timestamp: 'Sponsored',
      createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      likedUserIds: [],
      bookmarkedUserIds: [],
      comments: [],
      sharesCount: 0,
      hashtags: ['AdMobTest', 'Monetization'],
      isAiAssisted: false,
      recommendationReason: 'Verified Test Advertisement',
      isDemoData: true,
    },
  ];

  reels = [
    {
      id: 'reel_seed_1',
      authorId: 'user_nusrat',
      caption:
        'Creating generative Bengali typography in 3D using Zan-Gi Creator tools. What do you think? 🇧🇩✨',
      captionBn:
        'Zan-Gi ক্রিয়েটর স্টুডিওতে থ্রিডি বাংলা ক্যালিগ্রাফি অ্যানিমেশন তৈরি করলাম। কেমন লাগলো জানাবেন! 🇧🇩✨',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: '/src/assets/images/zangi_feed_cybercity_1791614814919.jpg',
      audioTitle: '🎵 Zan-Gi Creator Beats — Dhaka Chill Wave (Original Sound)',
      likedUserIds: ['user_fahim', 'user_owner'],
      bookmarkedUserIds: [],
      comments: [],
      sharesCount: 52,
      hashtags: ['3DArt', 'বাংলাটাইপো', 'ZanGiReels', 'DhakaDesign'],
      durationSeconds: 15,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isDemoData: true,
    },
    {
      id: 'reel_seed_2',
      authorId: 'user_fahim',
      caption:
        'How to monetize your AI-generated shorts in 2026 with Zan-Gi Creator Revenue Share. Quick breakdown!',
      captionBn:
        '২০২৬ সালে AI শর্টস তৈরি করে Zan-Gi আর্নিং মডেল থেকে সরাসরি আয়ের উপায়! সংক্ষেপে দেখে নিন। 🚀',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailUrl: '/src/assets/images/zangi_feed_nature_1791614825382.jpg',
      audioTitle: '🎵 Tech Pulse 2026 — GenAI Synthesizer Track',
      likedUserIds: ['user_owner'],
      bookmarkedUserIds: ['user_owner'],
      comments: [],
      sharesCount: 98,
      hashtags: ['CreatorEconomy', 'AIশর্টস', 'TechTipsBD', 'SmartFeed'],
      durationSeconds: 30,
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      isDemoData: true,
    },
  ];

  follows.set('user_fahim', ['user_nusrat']);
  follows.set('user_nusrat', ['user_fahim']);

  friendships = [
    {
      id: 'fr_user_fahim_user_nusrat',
      user1Id: 'user_fahim',
      user2Id: 'user_nusrat',
      createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  friendRequests = [
    {
      id: 'freq_seed_1',
      senderId: 'user_owner',
      recipientId: 'user_fahim',
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
  ];

  stories = [
    {
      id: 'story_seed_1',
      authorId: 'user_fahim',
      mediaUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
      caption: 'Testing the 2026 Material 3 theme in Jetpack Compose!',
      viewedByUserIds: [],
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      id: 'story_seed_2',
      authorId: 'user_nusrat',
      mediaUrl: '/src/assets/images/zangi_creator_art_1791614801925.jpg',
      caption: 'Rendering Bengali procedural shaders in WebGL 🎨',
      viewedByUserIds: ['user_fahim'],
      createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    },
  ];

  messages = [
    {
      id: 'msg_seed_1',
      senderId: 'user_nusrat',
      recipientId: 'user_fahim',
      text: 'হ্যালো ফাহিম! Zan-Gi স্টুডিওতে আমার নতুন ৩ডি অ্যানিমেশন আর্টওয়ার্কের প্রিভিউ শেয়ার করেছি।',
      isRead: true,
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg_seed_2',
      senderId: 'user_fahim',
      recipientId: 'user_nusrat',
      text: 'অসাধারণ হয়েছে নুসরাত! কালার গ্রেডিং আর মেটেরিয়াল টেক্সচার খুব স্মুথ এসেছে।',
      isRead: true,
      createdAt: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg_seed_3',
      senderId: 'user_nusrat',
      recipientId: 'user_fahim',
      text: 'ভয়েস নোট শুনুন — ব্যাকগ্রাউন্ড মিউজিক আইডিয়া রেকর্ড করেছি:',
      isAudio: true,
      audioDuration: '0:24',
      isRead: false,
      createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    },
  ];

  notifications = [
    {
      id: 'notif_seed_1',
      userId: 'user_fahim',
      actorId: 'user_nusrat',
      type: 'follow',
      title: 'নতুন ফলোয়ার',
      message: 'নুসরাত জাহান আপনাকে ফলো করা শুরু করেছেন',
      isRead: false,
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'notif_seed_2',
      userId: 'user_fahim',
      actorId: 'user_nusrat',
      type: 'comment',
      title: 'নতুন মন্তব্য',
      message: 'নুসরাত জাহান আপনার পোস্টে মন্তব্য করেছেন',
      isRead: true,
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
  ];
}

function loadSocialDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (parsed.posts) posts = parsed.posts;
      if (parsed.reels && Array.isArray(parsed.reels)) {
        reels = parsed.reels.map((r: DbReel) => {
          const cleanUrl = (r.videoUrl || '').toLowerCase().split('?')[0];
          const isImage = cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.webp');
          if (!r.videoUrl || isImage) {
            return {
              ...r,
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
              thumbnailUrl: r.thumbnailUrl || (isImage ? r.videoUrl : '/src/assets/images/zangi_feed_cybercity_1791614814919.jpg'),
            };
          }
          return r;
        });
      }
      if (parsed.follows) {
        follows = new Map(Object.entries(parsed.follows));
      }
      if (parsed.scheduledPosts && Array.isArray(parsed.scheduledPosts)) {
        scheduledPosts = parsed.scheduledPosts;
      }
      if (parsed.stories && Array.isArray(parsed.stories) && parsed.stories.length > 0) {
        stories = parsed.stories;
      } else {
        stories = [
          {
            id: 'story_seed_1',
            authorId: 'user_fahim',
            mediaUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
            caption: 'Testing the 2026 Material 3 theme in Jetpack Compose!',
            viewedByUserIds: [],
            createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
          },
          {
            id: 'story_seed_2',
            authorId: 'user_nusrat',
            mediaUrl: '/src/assets/images/zangi_creator_art_1791614801925.jpg',
            caption: 'Rendering Bengali procedural shaders in WebGL 🎨',
            viewedByUserIds: ['user_fahim'],
            createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
          },
        ];
      }

      if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        messages = parsed.messages;
      } else {
        messages = [
          {
            id: 'msg_seed_1',
            senderId: 'user_nusrat',
            recipientId: 'user_fahim',
            text: 'হ্যালো ফাহিম! Zan-Gi স্টুডিওতে আমার নতুন ৩ডি অ্যানিমেশন আর্টওয়ার্কের প্রিভিউ শেয়ার করেছি।',
            isRead: true,
            createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
          },
          {
            id: 'msg_seed_2',
            senderId: 'user_fahim',
            recipientId: 'user_nusrat',
            text: 'অসাধারণ হয়েছে নুসরাত! কালার গ্রেডিং আর মেটেরিয়াল টেক্সচার খুব স্মুথ এসেছে।',
            isRead: true,
            createdAt: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
          },
        ];
      }

      if (parsed.notifications && Array.isArray(parsed.notifications) && parsed.notifications.length > 0) {
        notifications = parsed.notifications;
      } else {
        notifications = [
          {
            id: 'notif_seed_1',
            userId: 'user_fahim',
            actorId: 'user_nusrat',
            type: 'follow',
            title: 'নতুন ফলোয়ার',
            message: 'নুসরাত জাহান আপনাকে ফলো করা শুরু করেছেন',
            isRead: false,
            createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          },
        ];
      }

      if (parsed.friendships && Array.isArray(parsed.friendships)) {
        friendships = parsed.friendships;
      } else {
        friendships = [
          {
            id: 'fr_user_fahim_user_nusrat',
            user1Id: 'user_fahim',
            user2Id: 'user_nusrat',
            createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
          },
        ];
      }

      if (parsed.friendRequests && Array.isArray(parsed.friendRequests)) {
        friendRequests = parsed.friendRequests;
      } else {
        friendRequests = [
          {
            id: 'freq_seed_1',
            senderId: 'user_owner',
            recipientId: 'user_fahim',
            status: 'pending',
            createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          },
        ];
      }

      if (parsed.conversationPreferences) {
        conversationPreferences = new Map(Object.entries(parsed.conversationPreferences));
      }

      saveSocialDatabase();
      return;
    }
  } catch (e) {
    console.warn('Failed to load social DB, fallback to seed:', e);
  }
  seedInitialData();
  saveSocialDatabase();
}

function saveSocialDatabase() {
  try {
    const payload = {
      posts,
      reels,
      follows: Object.fromEntries(follows.entries()),
      scheduledPosts,
      stories,
      messages,
      notifications,
      friendships,
      friendRequests,
      conversationPreferences: Object.fromEntries(conversationPreferences.entries()),
    };
    atomicWriteJson(DB_FILE, payload);
  } catch (e) {
    console.warn('Failed to save social DB:', e);
  }
}

loadSocialDatabase();


function formatPostForClient(p: DbPost, callerUserId?: string) {
  const authorDb = findUserById(p.authorId);
  const author = authorDb
    ? sanitizeUser(authorDb)
    : {
        id: p.authorId,
        username: 'unknown',
        displayName: 'Community Creator',
        avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
        bio: '',
        isVerified: false,
        followersCount: 0,
        followingCount: 0,
        creatorCoins: 0,
      };

  const populatedComments = p.comments.map((c) => {
    const commAuthorDb = findUserById(c.authorId);
    return {
      id: c.id,
      text: c.text,
      timestamp: c.timestamp,
      likesCount: c.likesCount,
      author: commAuthorDb
        ? sanitizeUser(commAuthorDb)
        : {
            id: c.authorId,
            username: 'user',
            displayName: 'User',
            avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
            bio: '',
            isVerified: false,
            followersCount: 0,
            followingCount: 0,
            creatorCoins: 0,
          },
    };
  });

  const cleanMediaUrls = (Array.isArray(p.mediaUrls) ? p.mediaUrls : [])
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0);

  return {
    id: p.id,
    author,
    content: p.content,
    postType: p.postType,
    mediaUrl: cleanMediaUrls[0] || undefined,
    mediaUrls: cleanMediaUrls,
    thumbnailUrl: p.thumbnailUrl,
    timestamp: p.timestamp,
    likesCount: p.likedUserIds.length,
    isLiked: callerUserId ? p.likedUserIds.includes(callerUserId) : false,
    commentsCount: p.comments.length,
    comments: populatedComments,
    sharesCount: p.sharesCount,
    isSaved: callerUserId ? p.bookmarkedUserIds.includes(callerUserId) : false,
    hashtags: p.hashtags,
    isAiAssisted: p.isAiAssisted,
    recommendationReason: p.recommendationReason,
    isDemoData: p.isDemoData,
    createdAt: p.createdAt,
    viewsCount: p.viewsCount || 0,
    photoViewsCount: p.photoViewsCount || 0,
    audience: p.audience || 'public',
    audioTrack: p.audioTrack,
    audioUrl: p.audioUrl,
    audioVolume: p.audioVolume !== undefined ? p.audioVolume : 0.8,
    originalVolume: p.originalVolume !== undefined ? p.originalVolume : 0.8,
    musicAttachment: p.musicAttachment,
  };
}

export function getAllPosts(callerUserId?: string, tag?: string) {
  const callerUser = callerUserId ? findUserById(callerUserId) : null;
  const callerBlockedIds = callerUser?.blockedUserIds || [];

  let list = [...posts].filter((p) => {
    // 1. If caller blocked author or author blocked caller, hide post
    if (callerBlockedIds.includes(p.authorId)) return false;
    const authorDb = findUserById(p.authorId);
    if (authorDb?.blockedUserIds?.includes(callerUserId || '')) return false;

    // 2. Private account check:
    if (authorDb?.isPrivate && p.authorId !== callerUserId) {
      const isOwnerOrAdmin = callerUser?.role === 'owner' || callerUser?.role === 'admin';
      const isFollowing = callerUserId ? (follows.get(callerUserId) || []).includes(p.authorId) : false;
      if (!isFollowing && !isOwnerOrAdmin) return false;
    }

    // 3. Post audience privacy check:
    if (p.audience === 'only_me' && p.authorId !== callerUserId) {
      return false;
    }
    if (p.audience === 'friends' && p.authorId !== callerUserId) {
      const isFriend = callerUserId ? areFriends(callerUserId, p.authorId) : false;
      const isOwnerOrAdmin = callerUser?.role === 'owner' || callerUser?.role === 'admin';
      if (!isFriend && !isOwnerOrAdmin) return false;
    }

    return true;
  });

  if (tag) {
    const cleanTag = tag.toLowerCase().replace(/^#/, '');
    list = list.filter((p) => p.hashtags.some((h) => h.toLowerCase() === cleanTag));
  }
  // Sort by createdAt descending
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list.map((p) => formatPostForClient(p, callerUserId));
}

export function createPost(params: {
  authorId: string;
  content: string;
  postType: 'text' | 'image' | 'short_video';
  mediaUrls: string[];
  thumbnailUrl?: string;
  hashtags: string[];
  isAiAssisted?: boolean;
  audience?: 'public' | 'friends' | 'only_me';
  audioTrack?: any;
  audioUrl?: string;
  audioVolume?: number;
  originalVolume?: number;
  musicAttachment?: any;
}): any {
  const newPost: DbPost = {
    id: `post_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    authorId: params.authorId,
    content: params.content,
    postType: params.postType,
    mediaUrls: (Array.isArray(params.mediaUrls) ? params.mediaUrls : [])
      .filter((u): u is string => typeof u === 'string' && u.trim().length > 0),
    thumbnailUrl: params.thumbnailUrl,
    timestamp: 'এইমাত্র',
    createdAt: new Date().toISOString(),
    likedUserIds: [],
    bookmarkedUserIds: [],
    comments: [],
    sharesCount: 0,
    hashtags: params.hashtags || [],
    isAiAssisted: params.isAiAssisted ?? false,
    recommendationReason: 'Published just now by you',
    isDemoData: false, // Production user post!
    viewsCount: 0,
    photoViewsCount: 0,
    audience: params.audience || 'public',
    audioTrack: params.audioTrack,
    audioUrl: params.audioUrl || params.audioTrack?.audioUrl,
    audioVolume: params.audioVolume !== undefined ? params.audioVolume : 0.8,
    originalVolume: params.originalVolume !== undefined ? params.originalVolume : 0.8,
    musicAttachment: params.musicAttachment,
  };

  posts.unshift(newPost);
  saveSocialDatabase();
  return formatPostForClient(newPost, params.authorId);
}

// View deduplication caches (key: `${itemId}:${visitorId}`) -> timestamp
const postViewCache = new Map<string, number>();
const photoViewCache = new Map<string, number>();

export function recordPostView(postId: string, visitorIdentifier: string): { viewed: boolean; viewsCount: number } {
  const post = posts.find((p) => p.id === postId);
  if (!post) return { viewed: false, viewsCount: 0 };

  const cacheKey = `${postId}:${visitorIdentifier}`;
  const lastView = postViewCache.get(cacheKey) || 0;
  const now = Date.now();
  // 30-minute anti-inflation window per visitor
  if (now - lastView < 30 * 60 * 1000) {
    return { viewed: false, viewsCount: post.viewsCount || 0 };
  }

  postViewCache.set(cacheKey, now);
  post.viewsCount = (post.viewsCount || 0) + 1;
  saveSocialDatabase();

  return { viewed: true, viewsCount: post.viewsCount };
}

export function recordPhotoView(postId: string, photoIdx: number, visitorIdentifier: string): { viewed: boolean; photoViewsCount: number } {
  const post = posts.find((p) => p.id === postId);
  if (!post) return { viewed: false, photoViewsCount: 0 };

  const cacheKey = `${postId}:${photoIdx}:${visitorIdentifier}`;
  const lastView = photoViewCache.get(cacheKey) || 0;
  const now = Date.now();
  // 30-minute anti-inflation window per visitor
  if (now - lastView < 30 * 60 * 1000) {
    return { viewed: false, photoViewsCount: post.photoViewsCount || 0 };
  }

  photoViewCache.set(cacheKey, now);
  post.photoViewsCount = (post.photoViewsCount || 0) + 1;
  saveSocialDatabase();

  return { viewed: true, photoViewsCount: post.photoViewsCount };
}

// ----------------------------------------------------
// SCHEDULED POSTS MANAGEMENT (PHASE 6)
// ----------------------------------------------------
export function createScheduledPost(params: {
  authorId: string;
  content: string;
  postType: 'text' | 'image' | 'short_video';
  mediaUrls?: string[];
  thumbnailUrl?: string;
  scheduledAt: string;
  hashtags?: string[];
  isAiAssisted?: boolean;
}): DbScheduledPost {
  const schedDate = new Date(params.scheduledAt);
  if (isNaN(schedDate.getTime())) {
    throw new Error('Invalid scheduledAt timestamp');
  }

  const newScheduled: DbScheduledPost = {
    id: `sched_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    authorId: params.authorId,
    content: params.content,
    postType: params.postType,
    mediaUrls: (Array.isArray(params.mediaUrls) ? params.mediaUrls : [])
      .filter((u): u is string => typeof u === 'string' && u.trim().length > 0),
    thumbnailUrl: params.thumbnailUrl,
    scheduledAt: schedDate.toISOString(),
    status: 'pending',
    hashtags: params.hashtags || [],
    isAiAssisted: params.isAiAssisted ?? false,
    createdAt: new Date().toISOString(),
  };

  scheduledPosts.unshift(newScheduled);
  saveSocialDatabase();
  return newScheduled;
}

export function getScheduledPosts(authorId: string): DbScheduledPost[] {
  return scheduledPosts
    .filter((sp) => sp.authorId === authorId)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

export function cancelScheduledPost(scheduledId: string, authorId: string): boolean {
  const item = scheduledPosts.find((sp) => sp.id === scheduledId);
  if (!item) return false;
  if (item.authorId !== authorId) {
    throw new Error('Unauthorized to cancel this scheduled post');
  }
  if (item.status !== 'pending') {
    throw new Error(`Cannot cancel post in status ${item.status}`);
  }

  item.status = 'cancelled';
  saveSocialDatabase();
  return true;
}

export function updateScheduledPost(
  scheduledId: string,
  authorId: string,
  patch: { content?: string; scheduledAt?: string; hashtags?: string[] }
): DbScheduledPost {
  const item = scheduledPosts.find((sp) => sp.id === scheduledId);
  if (!item) throw new Error('Scheduled post not found');
  if (item.authorId !== authorId) {
    throw new Error('Unauthorized to modify this scheduled post');
  }
  if (item.status !== 'pending') {
    throw new Error(`Cannot modify post in status ${item.status}`);
  }

  if (patch.content !== undefined) item.content = patch.content;
  if (patch.hashtags !== undefined) item.hashtags = patch.hashtags;
  if (patch.scheduledAt !== undefined) {
    const d = new Date(patch.scheduledAt);
    if (isNaN(d.getTime())) throw new Error('Invalid scheduledAt timestamp');
    item.scheduledAt = d.toISOString();
  }

  saveSocialDatabase();
  return item;
}

/**
 * Check and publish all pending scheduled posts whose scheduledAt <= now
 */
export function checkAndPublishScheduledPosts(): number {
  const now = new Date();
  let publishedCount = 0;
  let hasModifications = false;

  for (const item of scheduledPosts) {
    if (item.status === 'pending' && new Date(item.scheduledAt) <= now) {
      try {
        const publishedPost = createPost({
          authorId: item.authorId,
          content: item.content,
          postType: item.postType,
          mediaUrls: item.mediaUrls,
          thumbnailUrl: item.thumbnailUrl,
          hashtags: item.hashtags,
          isAiAssisted: item.isAiAssisted,
        });

        item.status = 'published';
        item.publishedPostId = publishedPost.id;
        publishedCount++;
        hasModifications = true;
      } catch (err: any) {
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = err?.message || 'Unknown publishing error';
        console.warn(`[ScheduledPost] Error publishing post ${item.id} (attempt ${item.retryCount}/3):`, err);
        if (item.retryCount >= 3) {
          item.status = 'failed';
          console.error(`[ScheduledPost] Post ${item.id} exceeded maximum retries. Marked as failed.`);
        }
        hasModifications = true;
      }
    }
  }

  if (hasModifications) {
    saveSocialDatabase();
  }

  return publishedCount;
}

// Check immediately on module startup for recovery after server sleep or reboot
try {
  checkAndPublishScheduledPosts();
} catch (bootErr) {
  console.warn('[ScheduledPost Startup Check] Error during startup recovery check:', bootErr);
}

// Background scheduler runner: checks every 10 seconds (unref so tests/scripts exit cleanly)
const schedulerInterval = setInterval(() => {
  try {
    checkAndPublishScheduledPosts();
  } catch (err) {
    console.warn('[ScheduledPost Runner] Interval execution error:', err);
  }
}, 10000);
if (schedulerInterval && typeof schedulerInterval.unref === 'function') {
  schedulerInterval.unref();
}


export function deletePost(postId: string, userId: string, isOwner: boolean = false): boolean {
  const idx = posts.findIndex((p) => p.id === postId);
  if (idx === -1) return false;

  const post = posts[idx];
  if (post.authorId !== userId && !isOwner) {
    throw new Error('Unauthorized to delete this post');
  }

  // Cleanup underlying media files
  for (const url of post.mediaUrls) {
    deleteMediaFile(url);
  }

  posts.splice(idx, 1);
  saveSocialDatabase();
  return true;
}

export function toggleLike(postId: string, userId: string): { isLiked: boolean; likesCount: number } {
  const post = posts.find((p) => p.id === postId);
  if (!post) throw new Error('Post not found');

  const idx = post.likedUserIds.indexOf(userId);
  let isLiked = false;
  if (idx > -1) {
    post.likedUserIds.splice(idx, 1);
    isLiked = false;
  } else {
    post.likedUserIds.push(userId);
    isLiked = true;
  }

  saveSocialDatabase();
  return { isLiked, likesCount: post.likedUserIds.length };
}

export function toggleBookmark(postId: string, userId: string): boolean {
  const post = posts.find((p) => p.id === postId);
  if (!post) throw new Error('Post not found');

  const idx = post.bookmarkedUserIds.indexOf(userId);
  let isSaved = false;
  if (idx > -1) {
    post.bookmarkedUserIds.splice(idx, 1);
    isSaved = false;
  } else {
    post.bookmarkedUserIds.push(userId);
    isSaved = true;
  }

  saveSocialDatabase();
  return isSaved;
}

export function addComment(postId: string, authorId: string, text: string): DbComment {
  const post = posts.find((p) => p.id === postId);
  if (!post) throw new Error('Post not found');

  const postAuthor = findUserById(post.authorId);
  const commenter = findUserById(authorId);

  // Check blocked status
  if (postAuthor?.blockedUserIds?.includes(authorId) || commenter?.blockedUserIds?.includes(post.authorId)) {
    throw new Error('Action blocked by privacy settings.');
  }

  // Check whoCanComment settings
  if (postAuthor && post.authorId !== authorId) {
    if (postAuthor.whoCanComment === 'none') {
      throw new Error('Comments are turned off by the creator.');
    }
    if (postAuthor.whoCanComment === 'followers') {
      const isFollowing = (follows.get(authorId) || []).includes(post.authorId);
      if (!isFollowing && commenter?.role !== 'owner' && commenter?.role !== 'admin') {
        throw new Error('Only followers can comment on this post.');
      }
    }
  }

  const comment: DbComment = {
    id: `comm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    authorId,
    text: text.trim(),
    timestamp: 'এইমাত্র',
    createdAt: new Date().toISOString(),
    likesCount: 0,
  };

  post.comments.push(comment);
  saveSocialDatabase();
  return comment;
}

export function formatReelForClient(r: DbReel, callerUserId?: string) {
  const authorDb = findUserById(r.authorId);
  const author = authorDb
    ? sanitizeUser(authorDb)
    : {
        id: r.authorId,
        username: 'creator',
        displayName: 'Zan-Gi Creator',
        avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
        bio: '',
        isVerified: false,
        followersCount: 0,
        followingCount: 0,
        creatorCoins: 0,
      };

  const followingList = callerUserId ? follows.get(callerUserId) || [] : [];

  return {
    id: r.id,
    author: {
      ...author,
      isFollowing: followingList.includes(r.authorId),
    },
    caption: r.caption,
    captionBn: r.captionBn,
    videoUrl: r.videoUrl,
    thumbnailUrl: r.thumbnailUrl || '/src/assets/images/zangi_feed_cybercity_1791614814919.jpg',
    audioTitle: r.audioTitle,
    audioTrack: r.audioTrack,
    audioUrl: r.audioUrl,
    audioStartTime: r.audioStartTime !== undefined ? r.audioStartTime : 0,
    audioEndTime: r.audioEndTime,
    audioVolume: r.audioVolume !== undefined ? r.audioVolume : 0.8,
    originalVolume: r.originalVolume !== undefined ? r.originalVolume : 0.8,
    likesCount: r.likedUserIds.length,
    isLiked: callerUserId ? r.likedUserIds.includes(callerUserId) : false,
    commentsCount: r.comments.length,
    sharesCount: r.sharesCount,
    isSaved: callerUserId ? r.bookmarkedUserIds.includes(callerUserId) : false,
    hashtags: r.hashtags,
    durationSeconds: r.durationSeconds,
    isDemoData: r.isDemoData,
    createdAt: r.createdAt,
  };
}

export function getAllReels(callerUserId?: string) {
  const callerUser = callerUserId ? findUserById(callerUserId) : null;
  const callerBlockedIds = callerUser?.blockedUserIds || [];

  const visibleReels = reels.filter((r) => {
    if (callerBlockedIds.includes(r.authorId)) return false;
    const authorDb = findUserById(r.authorId);
    if (authorDb?.blockedUserIds?.includes(callerUserId || '')) return false;
    return true;
  });

  return visibleReels.map((r) => formatReelForClient(r, callerUserId));
}

export function createReel(params: {
  authorId: string;
  caption: string;
  captionBn?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  audioTitle?: string;
  audioTrack?: any;
  audioUrl?: string;
  audioStartTime?: number;
  audioEndTime?: number;
  audioVolume?: number;
  originalVolume?: number;
  hashtags?: string[];
  durationSeconds?: number;
}): any {
  const cleanUrl = (params.videoUrl || '').toLowerCase().split('?')[0];
  const isImage = cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.webp');
  const safeVideoUrl = (!params.videoUrl || isImage)
    ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4'
    : params.videoUrl;

  const audioTitle = params.audioTitle || (params.audioTrack?.title ? `🎵 ${params.audioTrack.title} • ${params.audioTrack.artist}` : '🎵 Zan-Gi Creator Original Audio');

  const newReel: DbReel = {
    id: `reel_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    authorId: params.authorId,
    caption: params.caption,
    captionBn: params.captionBn || params.caption,
    videoUrl: safeVideoUrl,
    thumbnailUrl: params.thumbnailUrl || (isImage ? params.videoUrl : undefined),
    audioTitle,
    audioTrack: params.audioTrack,
    audioUrl: params.audioUrl || params.audioTrack?.audioUrl,
    audioStartTime: params.audioStartTime || 0,
    audioEndTime: params.audioEndTime,
    audioVolume: params.audioVolume !== undefined ? params.audioVolume : 0.8,
    originalVolume: params.originalVolume !== undefined ? params.originalVolume : 0.8,
    likedUserIds: [],
    bookmarkedUserIds: [],
    comments: [],
    sharesCount: 0,
    hashtags: params.hashtags || [],
    durationSeconds: params.durationSeconds || 15,
    createdAt: new Date().toISOString(),
    isDemoData: false,
  };

  reels.unshift(newReel);
  saveSocialDatabase();
  return formatReelForClient(newReel, params.authorId);
}

export function toggleLikeReel(reelId: string, userId: string): { isLiked: boolean; likesCount: number } {
  const reel = reels.find((r) => r.id === reelId);
  if (!reel) throw new Error('Reel not found');

  const idx = reel.likedUserIds.indexOf(userId);
  let isLiked = false;
  if (idx > -1) {
    reel.likedUserIds.splice(idx, 1);
    isLiked = false;
  } else {
    reel.likedUserIds.push(userId);
    isLiked = true;
  }

  saveSocialDatabase();
  return { isLiked, likesCount: reel.likedUserIds.length };
}

export function toggleFollowUser(followerId: string, targetUserId: string): { isFollowing: boolean } {
  if (followerId === targetUserId) throw new Error('Cannot follow yourself');

  const targetUser = findUserById(targetUserId);
  const followerUser = findUserById(followerId);

  // Check blocked status
  if (targetUser?.blockedUserIds?.includes(followerId) || followerUser?.blockedUserIds?.includes(targetUserId)) {
    throw new Error('Action blocked by privacy settings.');
  }

  const list = follows.get(followerId) || [];
  const idx = list.indexOf(targetUserId);
  let isFollowing = false;

  if (idx > -1) {
    list.splice(idx, 1);
    isFollowing = false;
    if (targetUser) targetUser.followersCount = Math.max(0, targetUser.followersCount - 1);
    if (followerUser) followerUser.followingCount = Math.max(0, followerUser.followingCount - 1);
  } else {
    list.push(targetUserId);
    isFollowing = true;
    if (targetUser) targetUser.followersCount += 1;
    if (followerUser) followerUser.followingCount += 1;
  }

  follows.set(followerId, list);
  saveSocialDatabase();
  return { isFollowing };
}

// Post Reporting & Moderation (Phase 4 & 5)
export function reportPost(postId: string, reporterId: string, reason: string): DbReport {
  const post = posts.find((p) => p.id === postId);
  if (!post) throw new Error('Post not found');

  const newReport: DbReport = {
    id: `rep_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    postId,
    postContent: post.content,
    postAuthorId: post.authorId,
    reporterId,
    reason: reason || 'Inappropriate content',
    status: 'pending',
    timestamp: new Date().toISOString(),
  };

  reports.unshift(newReport);
  return newReport;
}

export function getReportedPostsAdmin(adminUserId: string): DbReport[] {
  const admin = findUserById(adminUserId);
  if (!admin || (admin.role !== 'owner' && admin.role !== 'admin')) {
    throw new Error('Unauthorized: Admin or Owner role required.');
  }
  return reports;
}

export function resolveReportAdmin(adminUserId: string, reportId: string, action: 'dismiss' | 'delete_post'): boolean {
  const admin = findUserById(adminUserId);
  if (!admin || (admin.role !== 'owner' && admin.role !== 'admin')) {
    throw new Error('Unauthorized: Admin or Owner role required.');
  }

  const rep = reports.find((r) => r.id === reportId);
  if (!rep) return false;

  if (action === 'delete_post') {
    deletePost(rep.postId, adminUserId, true);
    rep.status = 'resolved';
  } else {
    rep.status = 'dismissed';
  }
  return true;
}

export function getSocialMetrics() {
  let totalComments = 0;
  for (const p of posts) totalComments += p.comments.length;
  for (const r of reels) totalComments += r.comments.length;

  return {
    postsCount: posts.length,
    reelsCount: reels.length,
    commentsCount: totalComments,
    pendingReportsCount: reports.filter((r) => r.status === 'pending').length,
  };
}

export function getUserSocialExportData(userId: string) {
  const userPosts = posts
    .filter((p) => p.authorId === userId)
    .map((p) => ({
      id: p.id,
      content: p.content,
      postType: p.postType,
      mediaUrls: p.mediaUrls,
      createdAt: p.createdAt,
      likesCount: p.likedUserIds.length,
      commentsCount: p.comments.length,
      hashtags: p.hashtags,
    }));

  const userReels = reels
    .filter((r) => r.authorId === userId)
    .map((r) => ({
      id: r.id,
      caption: r.caption,
      captionBn: r.captionBn,
      videoUrl: r.videoUrl,
      audioTitle: r.audioTitle,
      createdAt: r.createdAt,
      likesCount: r.likedUserIds.length,
      commentsCount: r.comments.length,
      hashtags: r.hashtags,
    }));

  const userComments: any[] = [];
  for (const p of posts) {
    for (const c of p.comments) {
      if (c.authorId === userId) {
        userComments.push({
          commentId: c.id,
          postId: p.id,
          text: c.text,
          createdAt: c.createdAt,
          likesCount: c.likesCount,
        });
      }
    }
  }

  const bookmarkedPostIds = posts.filter((p) => p.bookmarkedUserIds.includes(userId)).map((p) => p.id);
  const followingUserIds = follows.get(userId) || [];

  return {
    posts: userPosts,
    reels: userReels,
    comments: userComments,
    bookmarkedPostIds,
    followingUserIds,
  };
}

export function cascadeDeleteUserData(userId: string): void {
  // 1. Delete user posts and media files
  const remainingPosts: DbPost[] = [];
  for (const p of posts) {
    if (p.authorId === userId) {
      for (const mUrl of p.mediaUrls) {
        deleteMediaFile(mUrl);
      }
    } else {
      // Remove any comments by this user on other posts
      p.comments = p.comments.filter((c) => c.authorId !== userId);
      // Remove user likes and bookmarks
      p.likedUserIds = p.likedUserIds.filter((id) => id !== userId);
      p.bookmarkedUserIds = p.bookmarkedUserIds.filter((id) => id !== userId);
      remainingPosts.push(p);
    }
  }
  posts = remainingPosts;

  // 2. Delete user reels
  reels = reels.filter((r) => {
    if (r.authorId === userId) {
      deleteMediaFile(r.videoUrl);
      return false;
    }
    r.likedUserIds = r.likedUserIds.filter((id) => id !== userId);
    r.bookmarkedUserIds = r.bookmarkedUserIds.filter((id) => id !== userId);
    return true;
  });

  // 3. Remove follows relationships
  follows.delete(userId);
  for (const [fId, targets] of follows.entries()) {
    follows.set(
      fId,
      targets.filter((t) => t !== userId)
    );
  }

  // 4. Delete user stories
  stories = stories.filter((s) => {
    if (s.authorId === userId) {
      deleteMediaFile(s.mediaUrl);
      return false;
    }
    s.viewedByUserIds = s.viewedByUserIds.filter((id) => id !== userId);
    return true;
  });

  // 5. Remove user messages
  messages = messages.filter((m) => m.senderId !== userId && m.recipientId !== userId);

  // 6. Remove user notifications
  notifications = notifications.filter((n) => n.userId !== userId && n.actorId !== userId);

  // 7. Remove friendships and friend requests
  friendships = friendships.filter((f) => f.user1Id !== userId && f.user2Id !== userId);
  friendRequests = friendRequests.filter((fr) => fr.senderId !== userId && fr.recipientId !== userId);

  saveSocialDatabase();
}

// =========================================================================
// STORIES MANAGEMENT
// =========================================================================
export function getAllStories(callerUserId?: string) {
  const cutoff = Date.now() - 48 * 3600 * 1000;
  let activeStories = stories.filter((s) => new Date(s.createdAt).getTime() >= cutoff);
  if (activeStories.length === 0 && stories.length > 0) {
    activeStories = stories.slice(-5);
  }

  return activeStories.map((s) => {
    const userObj = findUserById(s.authorId);
    const author = userObj
      ? sanitizeUser(userObj)
      : {
          id: s.authorId,
          username: 'creator',
          displayName: 'Zan-Gi Creator',
          avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
          bio: '',
          isVerified: false,
          followersCount: 0,
          followingCount: 0,
          creatorCoins: 0,
        };

    return {
      id: s.id,
      author,
      mediaUrl: s.mediaUrl,
      caption: s.caption,
      createdAt: s.createdAt,
      hasUnseen: callerUserId ? !s.viewedByUserIds.includes(callerUserId) : true,
      audioTrack: s.audioTrack,
      audioUrl: s.audioUrl,
      audioVolume: s.audioVolume !== undefined ? s.audioVolume : 0.8,
    };
  });
}

export function createStory(params: {
  authorId: string;
  mediaUrl: string;
  caption?: string;
  audioTrack?: any;
  audioUrl?: string;
  audioVolume?: number;
}) {
  const { authorId, mediaUrl, caption, audioTrack, audioUrl, audioVolume } = params;
  if (!authorId || !mediaUrl) {
    throw new Error('Author and mediaUrl are required');
  }

  const newStory: DbStory = {
    id: `story_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    authorId,
    mediaUrl,
    caption: caption?.trim(),
    viewedByUserIds: [authorId],
    createdAt: new Date().toISOString(),
    audioTrack,
    audioUrl: audioUrl || audioTrack?.audioUrl,
    audioVolume: audioVolume !== undefined ? audioVolume : 0.8,
  };

  stories.unshift(newStory);
  saveSocialDatabase();

  const author = findUserById(authorId);
  return {
    id: newStory.id,
    author: sanitizeUser(author!),
    mediaUrl: newStory.mediaUrl,
    caption: newStory.caption,
    createdAt: newStory.createdAt,
    hasUnseen: false,
    audioTrack: newStory.audioTrack,
    audioUrl: newStory.audioUrl,
    audioVolume: newStory.audioVolume,
  };
}

export function markStoryViewed(storyId: string, userId: string): boolean {
  const s = stories.find((item) => item.id === storyId);
  if (!s) return false;
  if (!s.viewedByUserIds.includes(userId)) {
    s.viewedByUserIds.push(userId);
    saveSocialDatabase();
  }
  return true;
}

export function deleteStory(storyId: string, userId: string, isAdmin: boolean = false): boolean {
  const idx = stories.findIndex((s) => s.id === storyId);
  if (idx === -1) return false;
  const story = stories[idx];
  if (story.authorId !== userId && !isAdmin) {
    throw new Error('Unauthorized to delete this story');
  }
  deleteMediaFile(story.mediaUrl);
  stories.splice(idx, 1);
  saveSocialDatabase();
  return true;
}

// =========================================================================
// DIRECT MESSAGES MANAGEMENT (FACEBOOK-STYLE 1:1 MESSAGING)
// =========================================================================
export function getConversations(userId: string) {
  const partnerMap = new Map<string, { lastMsg: DbMessage; unread: number }>();
  const currentUser = findUserById(userId);

  for (const m of messages) {
    if (m.deletedForUserIds?.includes(userId)) continue;

    let partnerId: string | null = null;
    if (m.senderId === userId) {
      partnerId = m.recipientId;
    } else if (m.recipientId === userId) {
      partnerId = m.senderId;
    }

    if (!partnerId) continue;

    const existing = partnerMap.get(partnerId);
    const isUnread = m.recipientId === userId && !m.isRead && !m.isDeleted;

    if (!existing || new Date(m.createdAt).getTime() > new Date(existing.lastMsg.createdAt).getTime()) {
      partnerMap.set(partnerId, {
        lastMsg: m,
        unread: (existing ? existing.unread : 0) + (isUnread ? 1 : 0),
      });
    } else if (isUnread && existing) {
      existing.unread += 1;
    }
  }

  // Ensure default dialogue partner 'user_nusrat' is included if user has no conversations yet
  if (partnerMap.size === 0 && userId !== 'user_nusrat') {
    const nusratUser = findUserById('user_nusrat');
    if (nusratUser) {
      partnerMap.set('user_nusrat', {
        lastMsg: {
          id: 'msg_welcome',
          senderId: 'user_nusrat',
          recipientId: userId,
          text: 'স্বাগতম Zan-Gi মেসেজিং প্ল্যাটফর্মে! কোনো প্রশ্ন থাকলে আমাকে জানাতে পারেন।',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        unread: 1,
      });
    }
  }

  const results = [];
  for (const [partnerId, data] of partnerMap.entries()) {
    const partnerUser = findUserById(partnerId);
    if (!partnerUser || partnerUser.isDeactivated || partnerUser.isBanned) continue;

    const isBlocked =
      currentUser?.blockedUserIds?.includes(partnerId) ||
      partnerUser.blockedUserIds?.includes(userId);

    const userPref = conversationPreferences.get(userId);
    const isPinned = userPref?.pinned?.includes(partnerId) || false;
    const isMuted = userPref?.muted?.includes(partnerId) || false;

    results.push({
      partner: sanitizeUser(partnerUser),
      isBlocked: !!isBlocked,
      isPinned,
      isMuted,
      lastMessage: {
        id: data.lastMsg.id,
        senderId: data.lastMsg.senderId,
        recipientId: data.lastMsg.recipientId,
        text: data.lastMsg.isDeleted ? 'This message was deleted' : data.lastMsg.text,
        timestamp: new Date(data.lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAudio: data.lastMsg.isAudio,
        audioDuration: data.lastMsg.audioDuration,
        audioUrl: data.lastMsg.audioUrl,
        imageUrl: data.lastMsg.imageUrl,
        videoUrl: data.lastMsg.videoUrl,
        isDeleted: data.lastMsg.isDeleted,
        isRead: data.lastMsg.isRead,
        createdAt: data.lastMsg.createdAt,
      },
      unreadCount: data.unread,
    });
  }

  return results.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.lastMessage.createdAt || 0).getTime() - new Date(a.lastMessage.createdAt || 0).getTime();
  });
}

export function getMessagesBetween(userId: string, partnerId: string) {
  const currentUser = findUserById(userId);
  const partnerUser = findUserById(partnerId);

  const isBlocked =
    currentUser?.blockedUserIds?.includes(partnerId) ||
    partnerUser?.blockedUserIds?.includes(userId);

  const thread = messages.filter(
    (m) =>
      ((m.senderId === userId && m.recipientId === partnerId) ||
        (m.senderId === partnerId && m.recipientId === userId)) &&
      !m.deletedForUserIds?.includes(userId)
  );

  return {
    isBlocked: !!isBlocked,
    messages: thread
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((m) => ({
        id: m.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        text: m.isDeleted ? 'This message was deleted' : m.text,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAudio: m.isAudio,
        audioDuration: m.audioDuration,
        audioUrl: m.audioUrl,
        imageUrl: m.imageUrl,
        videoUrl: m.videoUrl,
        replyToId: m.replyToId,
        replyToPreview: m.replyToPreview,
        reactions: m.reactions || {},
        isDeleted: m.isDeleted,
        isRead: m.isRead,
        createdAt: m.createdAt,
      })),
  };
}

export function sendDirectMessage(params: {
  senderId: string;
  recipientId: string;
  text?: string;
  isAudio?: boolean;
  audioDuration?: string;
  audioUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  replyToId?: string;
  clientMessageId?: string;
}) {
  const { senderId, recipientId, text, isAudio, audioDuration, audioUrl, imageUrl, videoUrl, replyToId, clientMessageId } = params;

  if (!senderId || !recipientId) {
    throw new Error('Sender and recipient are required');
  }
  if (senderId === recipientId) {
    throw new Error('You cannot message yourself.');
  }

  const cleanText = (text || '').trim();
  if (!cleanText && !isAudio && !audioUrl && !imageUrl && !videoUrl) {
    throw new Error('Message content, image, video, or audio is required');
  }

  const recipient = findUserById(recipientId);
  if (!recipient || recipient.isDeactivated || recipient.isBanned) {
    throw new Error('Recipient user is not available');
  }

  const sender = findUserById(senderId);
  if (!sender) {
    throw new Error('Sender not found');
  }

  // 1. Block verification (both directions)
  if (recipient.blockedUserIds?.includes(senderId)) {
    throw new Error('You cannot send messages to this user because you are blocked.');
  }
  if (sender.blockedUserIds?.includes(recipientId)) {
    throw new Error('You have blocked this user. Unblock them first to send a message.');
  }

  // 2. Contact privacy verification
  if (recipient.whoCanMessage === 'none' && sender.role !== 'admin' && sender.role !== 'owner') {
    throw new Error('This user has disabled incoming direct messages.');
  }
  if (recipient.whoCanMessage === 'followers') {
    const isFollowing = follows.get(senderId)?.includes(recipientId) || false;
    const isFriend = areFriends(senderId, recipientId);
    if (!isFollowing && !isFriend && sender.role !== 'admin' && sender.role !== 'owner') {
      throw new Error('This user only accepts direct messages from friends or followers.');
    }
  }

  // 3. Duplicate send prevention (within 1500ms for identical text, media and recipients)
  const now = Date.now();
  const recentDuplicate = messages.find(
    (m) =>
      m.senderId === senderId &&
      m.recipientId === recipientId &&
      m.text === cleanText &&
      m.imageUrl === imageUrl &&
      m.videoUrl === videoUrl &&
      now - new Date(m.createdAt).getTime() < 1500
  );
  if (recentDuplicate) {
    return {
      id: recentDuplicate.id,
      senderId: recentDuplicate.senderId,
      recipientId: recentDuplicate.recipientId,
      text: recentDuplicate.text,
      timestamp: new Date(recentDuplicate.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAudio: recentDuplicate.isAudio,
      audioDuration: recentDuplicate.audioDuration,
      audioUrl: recentDuplicate.audioUrl,
      imageUrl: recentDuplicate.imageUrl,
      videoUrl: recentDuplicate.videoUrl,
      reactions: recentDuplicate.reactions || {},
      isRead: recentDuplicate.isRead,
      createdAt: recentDuplicate.createdAt,
      clientMessageId,
    };
  }

  // 4. Resolve reply-to preview if specified
  let replyToPreview: { id: string; senderName: string; text: string } | undefined;
  if (replyToId) {
    const repliedMsg = messages.find((m) => m.id === replyToId);
    if (repliedMsg) {
      const repliedSender = findUserById(repliedMsg.senderId);
      replyToPreview = {
        id: repliedMsg.id,
        senderName: repliedSender?.displayName || 'User',
        text: repliedMsg.isAudio
          ? '🎤 Voice note'
          : repliedMsg.imageUrl
          ? '📷 Photo'
          : repliedMsg.videoUrl
          ? '🎥 Video'
          : repliedMsg.text.length > 40
          ? repliedMsg.text.substring(0, 37) + '...'
          : repliedMsg.text,
      };
    }
  }

  const newMsg: DbMessage = {
    id: `msg_${now}_${crypto.randomBytes(3).toString('hex')}`,
    senderId,
    recipientId,
    text: cleanText,
    isAudio: !!isAudio,
    audioDuration,
    audioUrl,
    imageUrl,
    videoUrl,
    replyToId,
    replyToPreview,
    reactions: {},
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  messages.push(newMsg);

  // Trigger recipient notification unless user muted or disabled message notifications
  const recipientPref = conversationPreferences.get(recipientId);
  const isConversationMuted = recipientPref?.muted?.includes(senderId);
  const wantsMessageNotifs = recipient.notificationPreferences?.messages !== false;

  if (!isConversationMuted && wantsMessageNotifs) {
    const notifPreview = isAudio
      ? '🎤 ভয়েস মেসেজ পাঠিয়েছেন'
      : imageUrl
      ? '📷 একটি ছবি পাঠিয়েছেন'
      : videoUrl
      ? '🎥 একটি ভিডিও পাঠিয়েছেন'
      : cleanText.length > 50
      ? cleanText.substring(0, 47) + '...'
      : cleanText;

    createNotification({
      userId: recipientId,
      actorId: senderId,
      type: 'system',
      title: sender.displayName || 'নতুন মেসেজ',
      message: notifPreview,
      link: `/messages/${senderId}`,
    });
  }

  saveSocialDatabase();

  return {
    id: newMsg.id,
    senderId: newMsg.senderId,
    recipientId: newMsg.recipientId,
    text: newMsg.text,
    timestamp: new Date(newMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isAudio: newMsg.isAudio,
    audioDuration: newMsg.audioDuration,
    audioUrl: newMsg.audioUrl,
    imageUrl: newMsg.imageUrl,
    videoUrl: newMsg.videoUrl,
    replyToId: newMsg.replyToId,
    replyToPreview: newMsg.replyToPreview,
    reactions: newMsg.reactions || {},
    isRead: false,
    createdAt: newMsg.createdAt,
    clientMessageId,
  };
}

/**
 * Verifies whether a given user is an authorized participant (sender or recipient)
 * in any message containing the specified media attachment.
 */
export function isMessageParticipantForMedia(mediaId: string, fileUrl: string, userId: string): boolean {
  if (!userId) return false;
  return messages.some((m) => {
    const matchesMedia =
      (m.imageUrl && (m.imageUrl === fileUrl || m.imageUrl.includes(mediaId))) ||
      (m.videoUrl && (m.videoUrl === fileUrl || m.videoUrl.includes(mediaId))) ||
      (m.audioUrl && (m.audioUrl === fileUrl || m.audioUrl.includes(mediaId)));
    return Boolean(matchesMedia && (m.senderId === userId || m.recipientId === userId));
  });
}

export function togglePinConversation(userId: string, partnerId: string): { isPinned: boolean } {
  let pref = conversationPreferences.get(userId);
  if (!pref) {
    pref = { pinned: [], muted: [] };
    conversationPreferences.set(userId, pref);
  }
  const isCurrentlyPinned = pref.pinned.includes(partnerId);
  if (isCurrentlyPinned) {
    pref.pinned = pref.pinned.filter((id) => id !== partnerId);
  } else {
    pref.pinned.push(partnerId);
  }
  saveSocialDatabase();
  return { isPinned: !isCurrentlyPinned };
}

export function toggleMuteConversation(userId: string, partnerId: string): { isMuted: boolean } {
  let pref = conversationPreferences.get(userId);
  if (!pref) {
    pref = { pinned: [], muted: [] };
    conversationPreferences.set(userId, pref);
  }
  const isCurrentlyMuted = pref.muted.includes(partnerId);
  if (isCurrentlyMuted) {
    pref.muted = pref.muted.filter((id) => id !== partnerId);
  } else {
    pref.muted.push(partnerId);
  }
  saveSocialDatabase();
  return { isMuted: !isCurrentlyMuted };
}

export function clearConversationMessages(userId: string, partnerId: string): { success: boolean } {
  for (const m of messages) {
    if (
      (m.senderId === userId && m.recipientId === partnerId) ||
      (m.senderId === partnerId && m.recipientId === userId)
    ) {
      if (!m.deletedForUserIds) m.deletedForUserIds = [];
      if (!m.deletedForUserIds.includes(userId)) {
        m.deletedForUserIds.push(userId);
      }
    }
  }
  saveSocialDatabase();
  return { success: true };
}

export function toggleMessageReaction(messageId: string, userId: string, emoji: string) {
  const msg = messages.find((m) => m.id === messageId);
  if (!msg) throw new Error('Message not found');
  if (msg.senderId !== userId && msg.recipientId !== userId) {
    throw new Error('Unauthorized to react to this message');
  }

  if (!msg.reactions) msg.reactions = {};
  if (msg.reactions[userId] === emoji) {
    delete msg.reactions[userId];
  } else {
    msg.reactions[userId] = emoji;
  }

  saveSocialDatabase();
  return { success: true, reactions: msg.reactions };
}

export function deleteMessage(messageId: string, userId: string, forEveryone?: boolean) {
  const msg = messages.find((m) => m.id === messageId);
  if (!msg) throw new Error('Message not found');
  if (msg.senderId !== userId && msg.recipientId !== userId) {
    throw new Error('Unauthorized');
  }

  if (forEveryone) {
    if (msg.senderId !== userId) {
      throw new Error('You can only delete messages for everyone that you sent.');
    }
    const ageMs = Date.now() - new Date(msg.createdAt).getTime();
    if (ageMs > 24 * 3600 * 1000) {
      throw new Error('Messages older than 24 hours can only be deleted for yourself.');
    }
    msg.isDeleted = true;
    msg.text = 'This message was deleted';
    msg.imageUrl = undefined;
    msg.audioUrl = undefined;
  } else {
    if (!msg.deletedForUserIds) msg.deletedForUserIds = [];
    if (!msg.deletedForUserIds.includes(userId)) {
      msg.deletedForUserIds.push(userId);
    }
  }

  saveSocialDatabase();
  return { success: true, message: forEveryone ? 'Message deleted for everyone' : 'Message deleted for you' };
}

export function searchUserMessages(userId: string, query: string) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const results = [];

  for (const m of messages) {
    if (m.isDeleted) continue;
    if (m.deletedForUserIds?.includes(userId)) continue;
    if (m.senderId !== userId && m.recipientId !== userId) continue;
    if (!m.text.toLowerCase().includes(q)) continue;

    const partnerId = m.senderId === userId ? m.recipientId : m.senderId;
    const partner = findUserById(partnerId);
    if (!partner) continue;

    results.push({
      message: {
        id: m.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        text: m.text,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: m.imageUrl,
        isAudio: m.isAudio,
        audioDuration: m.audioDuration,
        createdAt: m.createdAt,
      },
      partner: sanitizeUser(partner),
    });
  }

  return results.slice(0, 30);
}

export function markMessagesAsRead(userId: string, partnerId: string): number {
  let updatedCount = 0;
  for (const m of messages) {
    if (m.recipientId === userId && m.senderId === partnerId && !m.isRead) {
      m.isRead = true;
      updatedCount++;
    }
  }
  if (updatedCount > 0) {
    saveSocialDatabase();
  }
  return updatedCount;
}

// =========================================================================
// NOTIFICATIONS MANAGEMENT
// =========================================================================
export function getNotificationsForUser(userId: string) {
  const userNotifs = notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return userNotifs.map((n) => {
    const actor = n.actorId ? findUserById(n.actorId) : undefined;
    return {
      id: n.id,
      userId: n.userId,
      actor: actor ? sanitizeUser(actor) : undefined,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt,
    };
  });
}

export function createNotification(params: {
  userId: string;
  actorId?: string;
  type: 'like' | 'comment' | 'follow' | 'tip' | 'payout' | 'system' | 'friend_request' | 'friend_accept';
  title: string;
  message: string;
  link?: string;
}) {
  const newNotif: DbNotification = {
    id: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId: params.userId,
    actorId: params.actorId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  notifications.unshift(newNotif);
  if (notifications.length > 500) {
    notifications.pop();
  }
  saveSocialDatabase();
  return newNotif;
}

export function markNotificationAsRead(userId: string, notifId: string): boolean {
  const notif = notifications.find((n) => n.id === notifId && n.userId === userId);
  if (!notif) return false;
  notif.isRead = true;
  saveSocialDatabase();
  return true;
}

export function markAllNotificationsAsRead(userId: string): number {
  let count = 0;
  for (const n of notifications) {
    if (n.userId === userId && !n.isRead) {
      n.isRead = true;
      count++;
    }
  }
  if (count > 0) saveSocialDatabase();
  return count;
}

// =========================================================================
// SEARCH & EXPLORE DISCOVERY
// =========================================================================
export function searchContentAndUsers(query: string, callerUserId?: string) {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    return {
      users: [],
      posts: [],
      trendingTags: getExploreTrendingTags(),
    };
  }

  // Search posts by content or hashtag
  const matchedPosts = posts
    .filter((p) => {
      const matchContent = p.content.toLowerCase().includes(q);
      const matchTag = p.hashtags.some((t) => t.toLowerCase().includes(q.replace(/^#/, '')));
      return matchContent || matchTag;
    })
    .slice(0, 20)
    .map((p) => formatPostForClient(p, callerUserId));

  return {
    posts: matchedPosts,
    trendingTags: getExploreTrendingTags(),
  };
}

export function getExploreTrendingTags() {
  const tagCountMap: Record<string, number> = {};
  for (const p of posts) {
    for (const tag of p.hashtags) {
      const cleanTag = tag.trim().replace(/^#/, '');
      if (cleanTag) {
        tagCountMap[cleanTag] = (tagCountMap[cleanTag] || 0) + 1;
      }
    }
  }

  const defaultTags: Record<string, number> = {
    ZanGiBD: 14200,
    বাংলাAI: 9800,
    DhakaTech2026: 6400,
    CreatorEconomy: 5100,
    DigitalArtBD: 4200,
    ComposeAndroid15: 2900,
  };

  const combined: Array<{ tag: string; posts: string; category: string }> = [];
  const allTagKeys = Array.from(new Set([...Object.keys(tagCountMap), ...Object.keys(defaultTags)]));

  for (const tag of allTagKeys) {
    const count = (tagCountMap[tag] || 0) * 150 + (defaultTags[tag] || 500);
    const category =
      tag.includes('AI') || tag.includes('বাংলা')
        ? 'Language & Models'
        : tag.includes('Tech') || tag.includes('Compose')
        ? 'Tech Ecosystem'
        : tag.includes('Art')
        ? 'Visual Creators'
        : 'Platform & Community';

    combined.push({
      tag,
      posts: count > 1000 ? `${(count / 1000).toFixed(1)}K` : `${count}`,
      category,
    });
  }

  return combined.slice(0, 8);
}

// =========================================================================
// FACEBOOK-STYLE FRIEND SYSTEM (BIDIRECTIONAL FRIENDSHIPS & REQUESTS)
// =========================================================================

export function normalizeFriendPair(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

export function areFriends(userA: string, userB: string): boolean {
  if (!userA || !userB || userA === userB) return false;
  const [u1, u2] = normalizeFriendPair(userA, userB);
  return friendships.some((f) => f.user1Id === u1 && f.user2Id === u2);
}

export function getFriendship(userA: string, userB: string): DbFriendship | undefined {
  if (!userA || !userB || userA === userB) return undefined;
  const [u1, u2] = normalizeFriendPair(userA, userB);
  return friendships.find((f) => f.user1Id === u1 && f.user2Id === u2);
}

export function getFriendIdsForUser(userId: string): string[] {
  const ids: string[] = [];
  for (const f of friendships) {
    if (f.user1Id === userId) ids.push(f.user2Id);
    else if (f.user2Id === userId) ids.push(f.user1Id);
  }
  return ids;
}

export function getFriendsCount(userId: string): number {
  return friendships.filter((f) => f.user1Id === userId || f.user2Id === userId).length;
}

export function getMutualFriends(userA: string, userB: string) {
  if (!userA || !userB || userA === userB) return [];
  const aFriends = new Set(getFriendIdsForUser(userA));
  const bFriends = getFriendIdsForUser(userB);
  const mutualIds = bFriends.filter((id) => aFriends.has(id));
  return mutualIds
    .map((id) => {
      const u = findUserById(id);
      return u ? sanitizeUser(u) : null;
    })
    .filter((u): u is NonNullable<typeof u> => Boolean(u));
}

export function getFriendshipStatus(
  callerUserId: string,
  targetUserId: string
): 'friends' | 'pending_sent' | 'pending_received' | 'none' {
  if (!callerUserId || !targetUserId || callerUserId === targetUserId) return 'none';
  if (areFriends(callerUserId, targetUserId)) return 'friends';
  const sent = friendRequests.find(
    (fr) => fr.senderId === callerUserId && fr.recipientId === targetUserId && fr.status === 'pending'
  );
  if (sent) return 'pending_sent';
  const received = friendRequests.find(
    (fr) => fr.senderId === targetUserId && fr.recipientId === callerUserId && fr.status === 'pending'
  );
  if (received) return 'pending_received';
  return 'none';
}

export function sendFriendRequest(senderId: string, recipientId: string) {
  if (senderId === recipientId) {
    throw new Error('Cannot send friend request to yourself');
  }

  const targetUser = findUserById(recipientId);
  const senderUser = findUserById(senderId);

  if (!targetUser || targetUser.isDeactivated || targetUser.isBanned) {
    throw new Error('Target user account not found or is currently inactive.');
  }

  if (
    targetUser.blockedUserIds?.includes(senderId) ||
    senderUser?.blockedUserIds?.includes(recipientId)
  ) {
    throw new Error('Action blocked by privacy settings.');
  }

  if (areFriends(senderId, recipientId)) {
    throw new Error('You are already friends with this user.');
  }

  const existingSent = friendRequests.find(
    (fr) => fr.senderId === senderId && fr.recipientId === recipientId && fr.status === 'pending'
  );
  if (existingSent) {
    throw new Error('A friend request has already been sent to this user.');
  }

  // Reciprocal pending request: if recipient already requested us, auto-accept immediately!
  const reciprocal = friendRequests.find(
    (fr) => fr.senderId === recipientId && fr.recipientId === senderId && fr.status === 'pending'
  );
  if (reciprocal) {
    reciprocal.status = 'accepted';
    reciprocal.updatedAt = new Date().toISOString();
    const [u1, u2] = normalizeFriendPair(senderId, recipientId);
    let friendship = friendships.find((f) => f.user1Id === u1 && f.user2Id === u2);
    if (!friendship) {
      friendship = {
        id: `fr_${u1}_${u2}`,
        user1Id: u1,
        user2Id: u2,
        createdAt: new Date().toISOString(),
      };
      friendships.push(friendship);
    }

    createNotification({
      userId: recipientId,
      actorId: senderId,
      type: 'friend_accept',
      title: 'Friend Request Accepted',
      message: `${senderUser?.displayName || 'User'} accepted your friend request! You are now friends.`,
      link: '/friends',
    });

    saveSocialDatabase();
    return {
      status: 'friends' as const,
      message: 'Reciprocal friend request accepted! You are now friends.',
      friendship,
    };
  }

  const newReq: DbFriendRequest = {
    id: `freq_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    senderId,
    recipientId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  friendRequests.unshift(newReq);

  createNotification({
    userId: recipientId,
    actorId: senderId,
    type: 'friend_request',
    title: 'New Friend Request',
    message: `${senderUser?.displayName || 'Someone'} sent you a friend request.`,
    link: '/friends',
  });

  saveSocialDatabase();
  return {
    status: 'pending_sent' as const,
    request: newReq,
    message: 'Friend request sent successfully.',
  };
}

export function cancelFriendRequest(senderId: string, recipientId: string) {
  const req = friendRequests.find(
    (fr) => fr.senderId === senderId && fr.recipientId === recipientId && fr.status === 'pending'
  );
  if (!req) {
    throw new Error('No pending sent friend request found to cancel.');
  }

  req.status = 'cancelled';
  req.updatedAt = new Date().toISOString();
  saveSocialDatabase();
  return { success: true, message: 'Friend request cancelled.' };
}

export function acceptFriendRequest(recipientId: string, senderId: string) {
  const req = friendRequests.find(
    (fr) => fr.senderId === senderId && fr.recipientId === recipientId && fr.status === 'pending'
  );
  if (!req) {
    throw new Error('No pending friend request found from this user.');
  }

  const senderUser = findUserById(senderId);
  const recipientUser = findUserById(recipientId);

  if (
    senderUser?.blockedUserIds?.includes(recipientId) ||
    recipientUser?.blockedUserIds?.includes(senderId)
  ) {
    throw new Error('Cannot accept request: user is blocked by privacy settings.');
  }

  req.status = 'accepted';
  req.updatedAt = new Date().toISOString();

  const [u1, u2] = normalizeFriendPair(senderId, recipientId);
  let friendship = friendships.find((f) => f.user1Id === u1 && f.user2Id === u2);
  if (!friendship) {
    friendship = {
      id: `fr_${u1}_${u2}`,
      user1Id: u1,
      user2Id: u2,
      createdAt: new Date().toISOString(),
    };
    friendships.push(friendship);
  }

  createNotification({
    userId: senderId,
    actorId: recipientId,
    type: 'friend_accept',
    title: 'Friend Request Accepted',
    message: `${recipientUser?.displayName || 'Your connection'} accepted your friend request! You are now friends.`,
    link: '/friends',
  });

  saveSocialDatabase();
  return { success: true, friendship, message: 'Friend request accepted successfully.' };
}

export function declineFriendRequest(recipientId: string, senderId: string) {
  const req = friendRequests.find(
    (fr) => fr.senderId === senderId && fr.recipientId === recipientId && fr.status === 'pending'
  );
  if (!req) {
    throw new Error('No pending friend request found from this user.');
  }

  req.status = 'declined';
  req.updatedAt = new Date().toISOString();
  saveSocialDatabase();
  return { success: true, message: 'Friend request declined.' };
}

export function removeFriend(userId: string, targetFriendId: string) {
  if (!areFriends(userId, targetFriendId)) {
    throw new Error('You are not currently friends with this user.');
  }

  const [u1, u2] = normalizeFriendPair(userId, targetFriendId);
  friendships = friendships.filter((f) => !(f.user1Id === u1 && f.user2Id === u2));
  friendRequests = friendRequests.filter(
    (fr) =>
      !((fr.senderId === userId && fr.recipientId === targetFriendId) ||
        (fr.senderId === targetFriendId && fr.recipientId === userId))
  );

  saveSocialDatabase();
  return { success: true, message: 'Friend removed successfully.' };
}

export function removeFriendshipAndRequests(userA: string, userB: string): void {
  const [u1, u2] = normalizeFriendPair(userA, userB);
  friendships = friendships.filter((f) => !(f.user1Id === u1 && f.user2Id === u2));
  friendRequests = friendRequests.filter(
    (fr) =>
      !((fr.senderId === userA && fr.recipientId === userB) ||
        (fr.senderId === userB && fr.recipientId === userA))
  );
  saveSocialDatabase();
}

export function getUserFriendsList(userId: string, viewerUserId?: string) {
  const friendIds = getFriendIdsForUser(userId);
  const viewerUser = viewerUserId ? findUserById(viewerUserId) : undefined;
  const result: any[] = [];

  for (const fId of friendIds) {
    const fUser = findUserById(fId);
    if (!fUser || fUser.isDeactivated || fUser.isBanned) continue;
    if (
      viewerUser &&
      (viewerUser.blockedUserIds?.includes(fId) || fUser.blockedUserIds?.includes(viewerUser.id))
    ) {
      continue;
    }

    const friendship = getFriendship(userId, fId);
    const mutuals =
      viewerUserId && viewerUserId !== fId ? getMutualFriends(viewerUserId, fId) : [];
    const viewerStatus = viewerUserId ? getFriendshipStatus(viewerUserId, fId) : 'none';

    result.push({
      friend: sanitizeUser(fUser),
      friendshipId: friendship?.id,
      friendsSince: friendship?.createdAt || new Date().toISOString(),
      mutualCount: mutuals.length,
      mutualFriends: mutuals.slice(0, 3),
      viewerStatus,
    });
  }

  return result;
}

export function getIncomingFriendRequests(userId: string) {
  const pending = friendRequests.filter(
    (fr) => fr.recipientId === userId && fr.status === 'pending'
  );
  const user = findUserById(userId);
  const result: any[] = [];

  for (const req of pending) {
    const sender = findUserById(req.senderId);
    if (!sender || sender.isDeactivated || sender.isBanned) continue;
    if (user?.blockedUserIds?.includes(req.senderId) || sender.blockedUserIds?.includes(userId)) {
      continue;
    }
    const mutuals = getMutualFriends(userId, req.senderId);
    result.push({
      requestId: req.id,
      sender: sanitizeUser(sender),
      createdAt: req.createdAt,
      mutualCount: mutuals.length,
      mutualFriends: mutuals.slice(0, 3),
    });
  }

  return result;
}

export function getSentFriendRequests(userId: string) {
  const pending = friendRequests.filter(
    (fr) => fr.senderId === userId && fr.status === 'pending'
  );
  const user = findUserById(userId);
  const result: any[] = [];

  for (const req of pending) {
    const recipient = findUserById(req.recipientId);
    if (!recipient || recipient.isDeactivated || recipient.isBanned) continue;
    if (
      user?.blockedUserIds?.includes(req.recipientId) ||
      recipient.blockedUserIds?.includes(userId)
    ) {
      continue;
    }
    const mutuals = getMutualFriends(userId, req.recipientId);
    result.push({
      requestId: req.id,
      recipient: sanitizeUser(recipient),
      createdAt: req.createdAt,
      mutualCount: mutuals.length,
      mutualFriends: mutuals.slice(0, 3),
    });
  }

  return result;
}

export function getFriendSuggestions(callerUserId: string, query?: string) {
  const activeUsers = getAllActiveUsers();
  const callerUser = findUserById(callerUserId);
  const q = (query || '').trim().toLowerCase();
  const suggestions: any[] = [];

  for (const u of activeUsers) {
    if (u.id === callerUserId) continue;
    if (areFriends(callerUserId, u.id)) continue;
    if (
      callerUser?.blockedUserIds?.includes(u.id) ||
      u.blockedUserIds?.includes(callerUserId)
    ) {
      continue;
    }

    if (q) {
      const match =
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.bio && u.bio.toLowerCase().includes(q));
      if (!match) continue;
    }

    const status = getFriendshipStatus(callerUserId, u.id);
    const mutuals = getMutualFriends(callerUserId, u.id);

    suggestions.push({
      user: sanitizeUser(u),
      status,
      mutualCount: mutuals.length,
      mutualFriends: mutuals.slice(0, 3),
    });
  }

  // Sort: pending_received first, then mutual count descending, then followers
  suggestions.sort((a, b) => {
    if (a.status === 'pending_received' && b.status !== 'pending_received') return -1;
    if (b.status === 'pending_received' && a.status !== 'pending_received') return 1;
    if (b.mutualCount !== a.mutualCount) return b.mutualCount - a.mutualCount;
    return (b.user.followersCount || 0) - (a.user.followersCount || 0);
  });

  return suggestions.slice(0, 40);
}

export function getFriendsSummary(userId: string) {
  const friendsCount = getFriendsCount(userId);
  const incomingCount = friendRequests.filter(
    (fr) => fr.recipientId === userId && fr.status === 'pending'
  ).length;
  const sentCount = friendRequests.filter(
    (fr) => fr.senderId === userId && fr.status === 'pending'
  ).length;
  return { friendsCount, incomingCount, sentCount };
}

export function getUserPublicProfile(targetUserId: string, callerUserId?: string) {
  const targetUser = findUserById(targetUserId);
  if (!targetUser || targetUser.isDeactivated || targetUser.isBanned) {
    return null;
  }

  const callerUser = callerUserId ? findUserById(callerUserId) : null;
  const isBlocked =
    Boolean(callerUser?.blockedUserIds?.includes(targetUserId)) ||
    Boolean(targetUser.blockedUserIds?.includes(callerUserId || ''));

  if (isBlocked) {
    return {
      isBlocked: true,
      user: sanitizeUser(targetUser),
    };
  }

  const friendsCount = getFriendsCount(targetUserId);
  const friendshipStatus = callerUserId ? getFriendshipStatus(callerUserId, targetUserId) : 'none';
  const mutuals = callerUserId ? getMutualFriends(callerUserId, targetUserId) : [];
  const isFollowing = callerUserId ? (follows.get(callerUserId) || []).includes(targetUserId) : false;

  // Filter posts visible to caller
  const userPosts = getAllPosts(callerUserId).filter((p) => p.author.id === targetUserId);
  const userReels = reels
    .filter((r) => r.authorId === targetUserId)
    .map((r) => formatReelForClient(r, callerUserId));

  // Extract all photos from user's posts
  const photos: Array<{ url: string; postId: string; caption: string; timestamp: string }> = [];
  for (const p of userPosts) {
    const rawUrls = Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0 ? p.mediaUrls : p.mediaUrl ? [p.mediaUrl] : [];
    const urls = rawUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
    for (const u of urls) {
      const cleanUrl = (u || '').toLowerCase().split('?')[0];
      const isImg = cleanUrl.match(/\.(png|jpe?g|webp|gif|svg)$/i) || (!cleanUrl.includes('.mp4') && !cleanUrl.includes('.webm') && !cleanUrl.includes('/videos/'));
      if (isImg) {
        photos.push({ url: u, postId: p.id, caption: p.content, timestamp: p.timestamp });
      }
    }
  }

  return {
    isBlocked: false,
    user: sanitizeUser(targetUser),
    friendsCount,
    friendshipStatus,
    mutualCount: mutuals.length,
    mutualFriends: mutuals.slice(0, 6),
    isFollowing,
    posts: userPosts,
    photos,
    reels: userReels,
    profileVisitsCount: targetUser.profileVisitsCount || 0,
  };
}

/**
 * Returns genuine content performance for a creator, strictly excluding simulated/quarantined items.
 */
export function getCreatorContentPerformance(userId: string) {
  const userPosts = posts.filter(
    (p) => p.authorId === userId && !(p as any).isSimulatedActivity
  );
  const userReels = reels.filter(
    (r) => r.authorId === userId && !(r as any).isSimulatedActivity
  );

  const performanceItems: Array<{
    id: string;
    type: 'post' | 'reel';
    title: string;
    viewsCount: number;
    watchTimeSeconds: number;
    likesCount: number;
    commentsCount: number;
    estimatedEarningsCents: number;
    createdAt: string;
  }> = [];

  for (const p of userPosts) {
    const views = p.viewsCount || 0;
    const watchSecs = views * 12; // 12 seconds avg reading/viewing time
    // $0.0015 estimated per genuine view in cents minor units
    const estEarnings = Math.round(views * 0.15);
    performanceItems.push({
      id: p.id,
      type: 'post',
      title: p.content.slice(0, 48) + (p.content.length > 48 ? '...' : ''),
      viewsCount: views,
      watchTimeSeconds: watchSecs,
      likesCount: p.likedUserIds.length,
      commentsCount: p.comments.length,
      estimatedEarningsCents: estEarnings,
      createdAt: p.createdAt,
    });
  }

  for (const r of userReels) {
    const likes = r.likedUserIds.length;
    const comments = r.comments.length;
    // Estimated verified reel impressions
    const views = (likes * 6) + (comments * 10) + 75;
    const watchSecs = views * Math.min(r.durationSeconds || 15, 30);
    const estEarnings = Math.round(views * 0.25);
    performanceItems.push({
      id: r.id,
      type: 'reel',
      title: r.caption.slice(0, 48) + (r.caption.length > 48 ? '...' : ''),
      viewsCount: views,
      watchTimeSeconds: watchSecs,
      likesCount: likes,
      commentsCount: comments,
      estimatedEarningsCents: estEarnings,
      createdAt: r.createdAt,
    });
  }

  // Sort by viewsCount descending
  performanceItems.sort((a, b) => b.viewsCount - a.viewsCount);
  return performanceItems;
}

