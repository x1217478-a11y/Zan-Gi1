import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Users, Radio, Volume2, Loader2, Sparkles, User as UserIcon } from 'lucide-react';
import { Post, User } from '../../types';

interface ExploreViewProps {
  isBengali: boolean;
  onSelectTag?: (tag: string) => void;
  onOpenFriends?: () => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  isBengali,
  onSelectTag,
  onOpenFriends,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingTopics, setTrendingTopics] = useState<
    Array<{ tag: string; posts: string; category: string }>
  >([
    { tag: 'ZanGiBD', posts: '14.2K', category: 'Platform & Community' },
    { tag: 'বাংলাAI', posts: '9.8K', category: 'Language & Models' },
    { tag: 'DhakaTech2026', posts: '6.4K', category: 'Tech Ecosystem' },
    { tag: 'CreatorEconomy', posts: '5.1K', category: 'Monetization' },
    { tag: 'DigitalArtBD', posts: '4.2K', category: 'Visual Creators' },
    { tag: 'ComposeAndroid15', posts: '2.9K', category: 'Native Dev' },
  ]);
  const [searchResults, setSearchResults] = useState<{
    posts: Post[];
    trendingTags: Array<{ tag: string; posts: string; category: string }>;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [joinedCommunities, setJoinedCommunities] = useState<Record<string, boolean>>({});
  const [activeAudioRoom, setActiveAudioRoom] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/explore/trending')
      .then((res) => res.json())
      .then((data) => {
        if (data.trendingTags && Array.isArray(data.trendingTags) && data.trendingTags.length > 0) {
          setTrendingTopics(data.trendingTags);
        }
      })
      .catch(() => {});
  }, []);

  // Real-time search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(() => {
      fetch(`/api/explore/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          setSearchResults(data);
        })
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const liveRooms = [
    {
      id: 'room_1',
      title: 'Dhaka AI Creative Meetup: 3D Pipelines & LLM Storyboarding',
      host: {
        id: 'user_nusrat',
        displayName: 'Nusrat Jahan',
        avatarUrl: '/src/assets/images/zangi_creator_art_1791614801925.jpg',
      },
      activeListeners: 242,
    },
    {
      id: 'room_2',
      title: 'Monetization Architecture: 70/30 Creator Share & AdMob SSV Rules',
      host: {
        id: 'user_fahim',
        displayName: 'Fahim Ahmed',
        avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
      },
      activeListeners: 189,
    },
  ];

  const communities = [
    {
      name: 'Dhaka AI Creators Club',
      members: '4,280 members',
      desc: 'Prompts, scripts, and video editing workflows',
    },
    {
      name: 'Bengali 3D & Digital Artists',
      members: '2,940 members',
      desc: 'Shaders, textures, and heritage art',
    },
    {
      name: 'Android Jetpack Compose BD',
      members: '1,890 members',
      desc: 'Modern reactive mobile apps',
    },
  ];

  const toggleJoin = (name: string) => {
    setJoinedCommunities((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-950 text-slate-100 p-4 pb-6 select-none space-y-4 w-full">
      {/* Facebook-style Friend System Discovery Launcher */}
      {onOpenFriends && (
        <div
          onClick={onOpenFriends}
          className="cursor-pointer p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-cyan-950/50 border border-blue-800/40 hover:border-cyan-500/60 transition-all flex items-center justify-between shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                  {isBengali ? 'বন্ধু ও পিপল ডিসকভারি হাব' : 'Find Friends & People Hub'}
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold">
                  MUTUAL
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {isBengali
                  ? 'সাধারণ বন্ধু অনুসন্ধান, ফ্রেন্ড রিকোয়েস্ট ও বন্ধু তালিকা'
                  : 'Search people, mutual connections & friend requests'}
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-600/30 group-hover:opacity-95 transition-opacity">
            {isBengali ? 'খুলুন' : 'Open'}
          </div>
        </div>
      )}

      {/* Search Header */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            isBengali
              ? 'টপিক, হ্যাশট্যাগ বা পোস্ট খুঁজুন...'
              : 'Search creators, hashtags, posts...'
          }
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
        />
        {isSearching && (
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {/* Live Search Results (When querying) */}
      {searchQuery.trim() && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              {isBengali ? 'অনুসন্ধানের ফলাফল' : 'Search Results'} ({searchResults?.posts.length || 0})
            </span>
          </div>

          {searchResults && searchResults.posts.length > 0 ? (
            <div className="space-y-2">
              {searchResults.posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => {
                    if (onSelectTag && post.hashtags[0]) onSelectTag(post.hashtags[0]);
                  }}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 cursor-pointer hover:border-slate-700 transition-colors space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={(post.author?.avatarUrl && post.author.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-bold text-white">{post.author.displayName}</span>
                    <span className="text-[10px] text-slate-500">@{post.author.username}</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {post.hashtags.map((tag) => (
                      <span key={tag} className="text-[10px] text-cyan-400 font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !isSearching ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              {isBengali ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No matching results found'}
            </div>
          ) : null}
        </div>
      )}

      {/* Live Creator Audio Rooms */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>{isBengali ? 'সরাসরি ক্রিয়েটর লাইভ রুম' : 'Live Creator Rooms'}</span>
          </div>
          <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800/40 font-bold px-1.5 py-0.5 rounded">
            LIVE STAGE
          </span>
        </div>

        <div className="space-y-2">
          {liveRooms.map((room) => (
            <div
              key={room.id}
              className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 shadow-xs hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                  <span>{room.activeListeners} Listening</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Spatial Voice</span>
              </div>

              <h4 className="text-xs font-bold text-white leading-snug">{room.title}</h4>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <img
                    src={(room.host?.avatarUrl && room.host.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-[11px] text-slate-300 font-medium">
                    {room.host.displayName}
                  </span>
                </div>
                <button
                  onClick={() => setActiveAudioRoom(room)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-1 rounded-lg hover:bg-cyan-900/60 transition-colors"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>{isBengali ? 'শুনুন' : 'Listen'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Trending Topics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>{isBengali ? '🔥 ট্রেন্ডিং হ্যাশট্যাগ ও বিষয়' : '🔥 Trending Topics'}</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-mono">LIVE FEED</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl divide-y divide-slate-800 overflow-hidden shadow-xs">
          {trendingTopics.map((topic) => (
            <div
              key={topic.tag}
              onClick={() => {
                if (onSelectTag) onSelectTag(topic.tag);
                setSearchQuery(topic.tag);
              }}
              className="p-3 hover:bg-slate-800/60 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-cyan-400 hover:underline">#{topic.tag}</p>
                <p className="text-[10px] text-slate-500">{topic.category}</p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{topic.posts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Verified Creator Communities */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
          <Users className="w-4 h-4 text-blue-400" />
          <span>{isBengali ? '👥 ক্রিয়েটর কমিউনিটি' : '👥 Creator Communities'}</span>
        </div>

        <div className="space-y-2">
          {communities.map((comm) => {
            const isJoined = joinedCommunities[comm.name];
            return (
              <div
                key={comm.name}
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs hover:border-slate-700 transition-colors"
              >
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">{comm.name}</h4>
                  <p className="text-[10px] text-slate-400">{comm.desc}</p>
                  <p className="text-[9px] text-slate-500">{comm.members}</p>
                </div>
                <button
                  onClick={() => toggleJoin(comm.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isJoined
                      ? 'bg-slate-800 text-slate-300 border border-slate-700'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xs'
                  }`}
                >
                  {isJoined ? (isBengali ? 'যুক্ত আছেন' : 'Joined') : isBengali ? 'যোগ দিন' : 'Join'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audio Room Modal */}
      {activeAudioRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] bg-rose-950 text-rose-300 font-bold px-2 py-0.5 rounded-full uppercase border border-rose-800/40">
                Live Creator Audio Stage
              </span>
              <button
                onClick={() => setActiveAudioRoom(null)}
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-2 pt-2">
              <img
                src={(activeAudioRoom.host?.avatarUrl && activeAudioRoom.host.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                alt=""
                className="w-16 h-16 rounded-full mx-auto object-cover ring-4 ring-cyan-500/30"
              />
              <h4 className="text-sm font-bold text-white">{activeAudioRoom.title}</h4>
              <p className="text-xs text-slate-400">Host: {activeAudioRoom.host.displayName}</p>

              <div className="flex items-center justify-center gap-1 h-6 py-1">
                {[14, 22, 18, 26, 16, 20, 12].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-cyan-400 rounded-full animate-pulse"
                    style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-500">
                Connected to audio stream. Spatial voice synthesis active.
              </p>
            </div>

            <button
              onClick={() => setActiveAudioRoom(null)}
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
            >
              {isBengali ? 'রুম ত্যাগ করুন' : 'Leave Room'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
