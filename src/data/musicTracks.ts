import { MusicTrack } from '../types';

export const MUSIC_TRACKS: MusicTrack[] = [
  // 1. Trending
  {
    id: 'track_trend_1',
    title: 'Cyber Horizon 2026',
    titleBn: 'সাইবার হরাইজন ২০২৬',
    artist: 'Zan-Gi Sound Lab',
    artistBn: 'জান-জি সাউন্ড ল্যাব',
    category: 'trending',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/cyber_horizon.wav',
    coverUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
  },
  {
    id: 'track_trend_2',
    title: 'Dhaka Sunset Beats',
    titleBn: 'ঢাকা সানসেট বিটস',
    artist: 'Lofi Pulse BD',
    artistBn: 'লো-ফাই পালস বিডি',
    category: 'trending',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/dhaka_sunset_beats.wav',
    coverUrl: '/src/assets/images/zangi_feed_cybercity_1791614814919.jpg',
  },

  // 2. Bangla Folk & Acoustic
  {
    id: 'track_bangla_1',
    title: 'Bhatiyali Acoustic River',
    titleBn: 'ভাটিয়ালি নদী তরঙ্গ',
    artist: 'Padma Acoustic Waves',
    artistBn: 'পদ্মা অ্যাকোস্টিক ওয়েভস',
    category: 'bangla',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/bhatiyali_acoustic_river.wav',
    coverUrl: '/src/assets/images/zangi_feed_nature_1791614825382.jpg',
  },
  {
    id: 'track_bangla_2',
    title: 'Moner Manush Baul Fusion',
    titleBn: 'মনের মানুষ বাউল ফিউশন',
    artist: 'Baul Shadhok Collective',
    artistBn: 'বাউল সাধক কালেক্টিভ',
    category: 'bangla',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/moner_manush_baul.wav',
    coverUrl: '/src/assets/images/zangi_creator_art_1791614801925.jpg',
  },
  {
    id: 'track_bangla_3',
    title: 'Shonar Bangla Ambient Dream',
    titleBn: 'সোনার বাংলা অ্যাম্বিয়েন্ট ড্রিম',
    artist: 'Bengal Soundscapes',
    artistBn: 'বেঙ্গল সাউন্ডস্কেপস',
    category: 'bangla',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/shonar_bangla_ambient.wav',
    coverUrl: '/src/assets/images/zangi_feed_nature_1791614825382.jpg',
  },

  // 3. Hindi
  {
    id: 'track_hindi_1',
    title: 'Sitar Monsoon Horizon',
    titleBn: 'সিতার মনসুন হরাইজন',
    artist: 'Raga Lounge Echoes',
    artistBn: 'রাগ লাউঞ্জ একোজ',
    category: 'hindi',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/sitar_monsoon_horizon.wav',
    coverUrl: '/src/assets/images/zangi_creator_art_1791614801925.jpg',
  },
  {
    id: 'track_hindi_2',
    title: 'Mumbai Twilight Groove',
    titleBn: 'মুম্বাই টোয়াইলাইট গ্রুভ',
    artist: 'Deccan Electro Folk',
    artistBn: 'ডেকান ইলেক্ট্রো ফোক',
    category: 'hindi',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/mumbai_twilight_groove.wav',
    coverUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
  },

  // 4. English
  {
    id: 'track_english_1',
    title: 'Neon Skyline Drive',
    titleBn: 'নিওন স্কাইলাইন ড্রাইভ',
    artist: 'Cyberwave Pioneers',
    artistBn: 'সাইবারওয়েভ পাইওনিয়ার্স',
    category: 'english',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/neon_skyline.wav',
    coverUrl: '/src/assets/images/zangi_feed_cybercity_1791614814919.jpg',
  },
  {
    id: 'track_english_2',
    title: 'Acoustic Golden Hour',
    titleBn: 'অ্যাকোস্টিক গোল্ডেন আওয়ার',
    artist: 'Sunburst Indie Project',
    artistBn: 'সানবার্স্ট ইন্ডি প্রজেক্ট',
    category: 'english',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/acoustic_golden_hour.wav',
    coverUrl: '/src/assets/images/zangi_feed_nature_1791614825382.jpg',
  },

  // 5. Instrumental
  {
    id: 'track_inst_1',
    title: 'Serene Bamboo Flute',
    titleBn: 'বাঁশির শান্ত সুর ও জেন মেডিটেশন',
    artist: 'Zen Garden Sessions',
    artistBn: 'জেন গার্ডেন সেশনস',
    category: 'instrumental',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/serene_bamboo_flute.wav',
    coverUrl: '/src/assets/images/zangi_feed_nature_1791614825382.jpg',
  },
  {
    id: 'track_inst_2',
    title: 'Piano Meditation Echoes',
    titleBn: 'পিয়ানো মেডিটেশন প্রতিধ্বনি',
    artist: 'Aura Piano Works',
    artistBn: 'অরা পিয়ানো ওয়ার্কস',
    category: 'instrumental',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/piano_meditation.wav',
    coverUrl: '/src/assets/images/zangi_creator_art_1791614801925.jpg',
  },
  {
    id: 'track_inst_3',
    title: 'Lo-Fi Coffee Study Beat',
    titleBn: 'লো-ফাই কফি স্টাডি বিট',
    artist: 'Rainy Cafe Records',
    artistBn: 'রেইনি ক্যাফে রেকর্ডস',
    category: 'instrumental',
    durationSeconds: 16,
    audioUrl: '/uploads/audio/lofi_coffee_study.wav',
    coverUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
  },
];

const FAVORITES_STORAGE_KEY = 'zangi_favorite_music_ids';

export function getFavoriteMusicIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : ['track_trend_1', 'track_bangla_1'];
  } catch {
    return ['track_trend_1', 'track_bangla_1'];
  }
}

export function toggleFavoriteMusicId(trackId: string): string[] {
  const current = getFavoriteMusicIds();
  const next = current.includes(trackId)
    ? current.filter((id) => id !== trackId)
    : [...current, trackId];
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
