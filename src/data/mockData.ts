import { Post, Story, User, CreatorLiveRoom, AdConfiguration } from '../types';

export const CURRENT_USER: User = {
  id: 'user_me',
  username: 'fahim_ai',
  displayName: 'Fahim Ahmed',
  avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
  bio: 'Building the future of AI & Social in Bangladesh. Connect. Create. Imagine. Earn. 🇧🇩',
  isVerified: true,
  followersCount: 14820,
  followingCount: 328,
  creatorCoins: 1420,
  languagePreference: 'bn'
};

export const CREATOR_NUSRAT: User = {
  id: 'user_nusrat',
  username: 'nusrat_visuals',
  displayName: 'Nusrat Jahan',
  avatarUrl: '/src/assets/images/zangi_creator_art_1791614801925.jpg',
  bio: 'Digital artist & 3D animator | Blending heritage aesthetics with generative tools in Zan-Gi Studio',
  isVerified: true,
  followersCount: 28400,
  followingCount: 142,
  creatorCoins: 3850
};

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post_1',
    author: CURRENT_USER,
    content: 'স্বাগতম Zan-Gi প্ল্যাটফর্মে! 🚀 ২০২৬ সালের নতুন AI-ফার্স্ট সোশ্যাল ইউনিভার্স। এখানে বাংলা ও ইংরেজি উভয় ভাষায় তাৎক্ষণিক কনটেন্ট ড্রাফটিং, স্মার্ট ফিড অ্যালগরিদম এবং ক্রিয়েটরদের জন্য সরাসরি রেভিনিউ শেয়ারিং যুক্ত করা হয়েছে। আপনার প্রতিক্রিয়া কী?',
    postType: 'image',
    mediaUrl: '/src/assets/images/zangi_feed_cybercity_1791614814919.jpg',
    timestamp: '১০ মিনিট আগে',
    likesCount: 428,
    isLiked: false,
    commentsCount: 34,
    sharesCount: 22,
    isSaved: false,
    hashtags: ['ZanGiBD', 'বাংলাAI', 'DhakaTech2026', 'CreatorEconomy'],
    isAiAssisted: true,
    recommendationReason: 'Because you follow Tech & AI Creators in Dhaka',
    isDemoData: true
  },
  {
    id: 'post_2',
    author: CREATOR_NUSRAT,
    content: 'Sunday morning aerial exploration over the Meghna river delta. The interplay between morning mist and river channels is unmatched! Generated ambient soundscapes right in Zan-Gi Creator Studio. 🌿✨',
    postType: 'image',
    mediaUrl: '/src/assets/images/zangi_feed_nature_1791614825382.jpg',
    timestamp: '১ ঘণ্টা আগে',
    likesCount: 892,
    isLiked: true,
    commentsCount: 68,
    sharesCount: 49,
    isSaved: true,
    hashtags: ['BeautifulBangladesh', 'NatureVisuals', 'CreatorPulse'],
    isAiAssisted: false,
    recommendationReason: 'Popular in Visual Arts & Landscape Photography',
    isDemoData: true
  },
  {
    id: 'post_3',
    author: {
      id: 'user_admob',
      username: 'admob_partner',
      displayName: 'Google Mobile Ads SDK',
      avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
      bio: 'Official AdMob Test Integration',
      isVerified: false,
      followersCount: 0,
      followingCount: 0,
      creatorCoins: 0
    },
    content: 'Sample Native Ad Placement: Test your mobile monetization flow with Google Mobile Ads SDK (Ad Unit: ca-app-pub-3940256099942544/2247696110). Supports banners, native feed cards, interstitial cooldowns, and rewarded units with creator coin grants.',
    postType: 'sponsored_native_ad',
    timestamp: 'Sponsored',
    likesCount: 14,
    isLiked: false,
    commentsCount: 0,
    sharesCount: 0,
    isSaved: false,
    hashtags: ['AdMobTest', 'Monetization'],
    recommendationReason: 'Verified Test Advertisement',
    isDemoData: true
  }
];

export const INITIAL_STORIES: Story[] = [
  {
    id: 'story_1',
    author: CURRENT_USER,
    mediaUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
    caption: 'Testing the 2026 Material 3 theme in Jetpack Compose!',
    hasUnseen: false
  },
  {
    id: 'story_2',
    author: CREATOR_NUSRAT,
    mediaUrl: '/src/assets/images/zangi_creator_art_1791614801925.jpg',
    caption: 'Live sketching in Dhaka art district',
    hasUnseen: true
  },
  {
    id: 'story_3',
    author: CURRENT_USER,
    mediaUrl: '/src/assets/images/zangi_feed_cybercity_1791614814919.jpg',
    caption: 'Smart city lights',
    hasUnseen: true
  }
];

export const LIVE_ROOMS: CreatorLiveRoom[] = [
  {
    id: 'room_1',
    title: 'বাংলা AI ও ক্রিয়েটর ইকোনমি: ২০২৬ এর অপার সম্ভাবনা',
    host: CREATOR_NUSRAT,
    activeListeners: 142,
    topicTags: ['AIবাংলা', 'CreatorEconomy', 'Dhaka'],
    isLiveNow: true
  },
  {
    id: 'room_2',
    title: 'Android 15 & Jetpack Compose: Performance & M3 Design',
    host: CURRENT_USER,
    activeListeners: 94,
    topicTags: ['AndroidDev', 'Kotlin', 'Compose'],
    isLiveNow: true
  }
];

export const DEFAULT_AD_CONFIG: AdConfiguration = {
  adsEnabled: true,
  appId: 'ca-app-pub-3940256099942544~3347511713',
  bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
  interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
  rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
  nativeAdUnitId: 'ca-app-pub-3940256099942544/2247696110',
  isTestMode: true,
  consentObtained: true,
  creatorRevenueSharePercentage: 70
};
