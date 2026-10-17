import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Play,
  Pause,
  Radio,
  Volume2,
  Users,
  ShieldCheck,
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  MessageSquare,
  ArrowLeft,
  Search,
  Plus,
  Paperclip,
  Image as ImageIcon,
  Smile,
  X,
  MoreVertical,
  Pin,
  BellOff,
  Trash2,
  Reply,
  Copy,
  Phone,
  Video,
  Info,
  ShieldAlert,
  UserCheck,
  Download,
  CheckCircle2,
  HardDrive,
  Wifi,
  Cloud,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ChatMessage, ConversationSummary, User, StoragePreferences } from '../../types';
import {
  getStoredStoragePreferences,
  isMediaCached,
  getCachedMediaUrl,
  downloadAndCacheMedia,
  saveMediaToDevice,
  deleteDownloadedFile,
  shouldAutoDownloadMedia,
  getDeviceStorageEstimate,
} from '../../utils/localMediaCache';
import { compressImageLocally } from '../../utils/imageCompressor';

interface MessagesViewProps {
  isBengali: boolean;
  preselectedPartnerId?: string | null;
  onBack?: () => void;
  onOpenFriends?: () => void;
}

const COMMON_EMOJIS = ['❤️', '👍', '😂', '🔥', '👏', '🎉', '😮', '😢', '🙏', '✨', '🚀', '💯'];

export const MessagesView: React.FC<MessagesViewProps> = ({
  isBengali,
  preselectedPartnerId,
  onBack,
  onOpenFriends,
}) => {
  const { user, token, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  // Navigation State: 'inbox' (conversation list) vs 'chat' (active 1:1 conversation)
  const [viewMode, setViewMode] = useState<'inbox' | 'chat'>('inbox');
  const [activeTab, setActiveTab] = useState<'direct' | 'live_rooms'>('direct');

  // Conversations & Messages State
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);

  // Loading States
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Message Input & Attachments
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [stagedMedia, setStagedMedia] = useState<{ url: string; type: 'image' | 'video' | 'audio'; name: string } | null>(null);
  const [failedAttachment, setFailedAttachment] = useState<{
    file: File;
    isVideo: boolean;
    error: string;
  } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Voice Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Overlays & Sheets
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [activeAudioRoom, setActiveAudioRoom] = useState<any | null>(null);

  // Local-First Media & Storage State
  const [storagePrefs, setStoragePrefs] = useState<StoragePreferences>(getStoredStoragePreferences());
  const [cachedUrls, setCachedUrls] = useState<Record<string, string>>({});
  const [downloadingUrls, setDownloadingUrls] = useState<Record<string, boolean>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});
  const [fileToDelete, setFileToDelete] = useState<{ url: string; name: string } | null>(null);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  const [deviceStorageNotice, setDeviceStorageNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // ----------------------------------------------------
  // Load Conversations List
  // ----------------------------------------------------
  const loadConversations = useCallback(async (selectPartnerId?: string) => {
    if (!token) {
      setIsLoadingConversations(false);
      return;
    }
    try {
      const res = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversations && Array.isArray(data.conversations)) {
          setConversations(data.conversations);

          // If a partner was requested to be selected
          const targetId = selectPartnerId || preselectedPartnerId;
          if (targetId) {
            const found = data.conversations.find((c: any) => c.partner.id === targetId);
            if (found) {
              setSelectedPartner(found.partner);
              setViewMode('chat');
            } else {
              // Fetch user profile to initialize conversation
              fetchUserAndOpenChat(targetId);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [token, preselectedPartnerId]);

  // Fetch target user if not in existing conversations
  const fetchUserAndOpenChat = async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/friends/status/${targetUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        // Find user from suggestions or load thread
        const threadRes = await fetch(`/api/messages/${targetUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (threadRes.ok) {
          const threadData = await threadRes.json();
          setIsBlocked(!!threadData.isBlocked);
          setMessages(threadData.messages || []);
          // Get partner from friend list or suggestions
          const suggRes = await fetch('/api/friends/suggestions', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (suggRes.ok) {
            const sData = await suggRes.json();
            const found = sData.suggestions?.find((s: any) => s.user.id === targetUserId)?.user;
            if (found) {
              setSelectedPartner(found);
              setViewMode('chat');
              return;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not initialize new partner chat:', e);
    }
  };

  // ----------------------------------------------------
  // Load Messages for Active Thread
  // ----------------------------------------------------
  const loadMessages = useCallback(async (partnerId: string, markRead = true) => {
    if (!token || !partnerId) return;
    try {
      const res = await fetch(`/api/messages/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsBlocked(!!data.isBlocked);
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
          scrollToBottom(false);

          if (markRead) {
            fetch(`/api/messages/read/${partnerId}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    loadConversations(preselectedPartnerId || undefined);
  }, [token, loadConversations, preselectedPartnerId]);

  // React to partner selection
  useEffect(() => {
    if (selectedPartner) {
      setIsLoadingMessages(true);
      loadMessages(selectedPartner.id);
    }
  }, [selectedPartner?.id, loadMessages]);

  // Realtime Polling for Active Thread
  useEffect(() => {
    if (!token || !selectedPartner || viewMode !== 'chat') return;

    const interval = setInterval(() => {
      fetch(`/api/messages/${selectedPartner.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.messages) {
            setIsBlocked(!!data.isBlocked);
            setMessages((prev) => {
              // Only update if message count or last message ID differs to prevent re-renders
              if (
                data.messages.length !== prev.length ||
                (data.messages.length > 0 && prev.length > 0 && data.messages[data.messages.length - 1].id !== prev[prev.length - 1].id)
              ) {
                setTimeout(() => scrollToBottom(true), 50);
                return data.messages;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 3500);

    return () => clearInterval(interval);
  }, [token, selectedPartner?.id, viewMode]);

  // Search Debounce across messages and conversations
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(() => {
      fetch(`/api/messages/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.results) {
            setSearchResults(data.results);
          }
        })
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, token]);

  // Local-First Storage & Cache Synchronization
  useEffect(() => {
    const syncPrefs = () => {
      setStoragePrefs(getStoredStoragePreferences());
    };
    window.addEventListener('storage', syncPrefs);
    window.addEventListener('focus', syncPrefs);
    return () => {
      window.removeEventListener('storage', syncPrefs);
      window.removeEventListener('focus', syncPrefs);
    };
  }, []);

  // Check device storage health
  useEffect(() => {
    getDeviceStorageEstimate().then((est) => {
      if (est.isLowStorage) {
        setDeviceStorageNotice(
          isBengali
            ? 'ডিভাইস মেমোরি প্রায় পূর্ণ (<১০০ MB অবশিষ্ট)। ডাউনলোড করার পূর্বে কিছু জায়গা খালি করুন।'
            : 'Device storage is nearly full (<100 MB remaining). Free up space to ensure downloads complete.'
        );
      }
    });
  }, [isBengali]);

  // Local-first auto-download and cached URL resolution
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    messages.forEach(async (m) => {
      const mediaUrl = m.imageUrl || m.videoUrl || m.audioUrl;
      if (!mediaUrl) return;

      // 1. If already in local state, skip
      if (cachedUrls[mediaUrl]) return;

      // 2. Check if already cached in browser Cache API
      const isCached = await isMediaCached(mediaUrl);
      if (isCached) {
        const localObjUrl = await getCachedMediaUrl(mediaUrl);
        if (localObjUrl) {
          setCachedUrls((prev) => ({ ...prev, [mediaUrl]: localObjUrl }));
          return;
        }
      }

      // 3. Auto-download check (checks Wi-Fi only, saveMediaToDevice, and media rules)
      const mediaType: 'image' | 'video' | 'audio' = m.isAudio
        ? 'audio'
        : m.videoUrl
        ? 'video'
        : 'image';

      if (shouldAutoDownloadMedia(mediaType, storagePrefs) || storagePrefs.saveMediaToDevice) {
        if (!downloadingUrls[mediaUrl]) {
          setDownloadingUrls((prev) => ({ ...prev, [mediaUrl]: true }));
          const res = await downloadAndCacheMedia(mediaUrl, mediaType, m.id, token || undefined, {
            saveToDevice: storagePrefs.saveMediaToDevice,
          });
          setDownloadingUrls((prev) => {
            const next = { ...prev };
            delete next[mediaUrl];
            return next;
          });
          if (res.success && res.objectUrl) {
            setCachedUrls((prev) => ({ ...prev, [mediaUrl]: res.objectUrl! }));
          }
        }
      }
    });
  }, [messages, storagePrefs, token]);

  // Explicit download action requested by user
  const handleExplicitDownload = async (
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'audio',
    messageId: string
  ) => {
    setDownloadingUrls((prev) => ({ ...prev, [mediaUrl]: true }));
    setDownloadErrors((prev) => {
      const next = { ...prev };
      delete next[mediaUrl];
      return next;
    });

    const res = await downloadAndCacheMedia(mediaUrl, mediaType, messageId, token || undefined, {
      isExplicitDownload: true,
      saveToDevice: storagePrefs.saveMediaToDevice || storagePrefs.saveToGallery,
    });

    setDownloadingUrls((prev) => {
      const next = { ...prev };
      delete next[mediaUrl];
      return next;
    });

    if (res.success && res.objectUrl) {
      setCachedUrls((prev) => ({ ...prev, [mediaUrl]: res.objectUrl! }));
      showToast(isBengali ? 'মিডিয়া ডিভাইসে সংরক্ষিত হয়েছে' : 'Media saved to device');
    } else if (res.isFull) {
      setDeviceStorageNotice(
        isBengali
          ? 'ডিভাইস মেমোরি পূর্ণ! ফাইলটি ডাউনলোড করার জন্য কিছুটা জায়গা খালি করুন।'
          : 'Device storage is critically full. Please free up space before downloading.'
      );
      setDownloadErrors((prev) => ({ ...prev, [mediaUrl]: res.error || 'Device storage full' }));
      showToast(res.error || (isBengali ? 'ডিভাইস মেমোরি পূর্ণ' : 'Device storage is full'));
    } else {
      setDownloadErrors((prev) => ({ ...prev, [mediaUrl]: res.error || 'Download failed' }));
      showToast(res.error || (isBengali ? 'ডাউনলোড ব্যর্থ হয়েছে' : 'Download failed'));
    }
  };

  // Save to Gallery / Downloads with permission handling
  const handleSaveToGallery = async (mediaUrl: string, name?: string) => {
    const target = cachedUrls[mediaUrl] || mediaUrl;
    const res = await saveMediaToDevice(target, name || `zangi_${Date.now()}`);
    if (res.success) {
      showToast(isBengali ? 'গ্যালারিতে সফলভাবে সংরক্ষিত হয়েছে' : 'Saved to device gallery');
    } else if (res.permissionDenied) {
      showToast(isBengali ? 'গ্যালারিতে সেভের অনুমতি মেলেনি' : 'Permission to save to gallery was denied');
    } else if (res.error) {
      showToast(res.error);
    }
  };

  // Safe delete of downloaded media with confirmation
  const handleConfirmDeleteLocalMedia = async () => {
    if (!fileToDelete) return;
    const url = fileToDelete.url;
    await deleteDownloadedFile(url);
    setCachedUrls((prev) => {
      const next = { ...prev };
      delete next[url];
      return next;
    });
    setFileToDelete(null);
    showToast(isBengali ? 'ডিভাইস থেকে ফাইলটি মুছে ফেলা হয়েছে' : 'Media file removed from device');
  };

  // ----------------------------------------------------
  // Send Direct Message (Text, Image, Video, or Audio)
  // ----------------------------------------------------
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPartner || !token || isSending) return;

    const textToSend = inputText.trim();
    if (!textToSend && !stagedMedia) return;

    const clientMsgId = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const currentReplying = replyingTo;

    // Optimistic message bubble for immediate user feedback
    const optimisticMsg: ChatMessage = {
      id: clientMsgId,
      senderId: user?.id || 'me',
      recipientId: selectedPartner.id,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageUrl: stagedMedia?.type === 'image' ? stagedMedia.url : undefined,
      videoUrl: stagedMedia?.type === 'video' ? stagedMedia.url : undefined,
      replyToId: currentReplying?.id,
      replyToPreview: currentReplying
        ? {
            id: currentReplying.id,
            senderName: currentReplying.senderId === user?.id ? (isBengali ? 'আপনি' : 'You') : selectedPartner.displayName,
            text: currentReplying.isAudio ? '🎤 Voice note' : currentReplying.imageUrl ? '📷 Photo' : currentReplying.text,
          }
        : undefined,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setStagedMedia(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);
    setIsSending(true);
    scrollToBottom(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: selectedPartner.id,
          text: textToSend,
          imageUrl: optimisticMsg.imageUrl,
          videoUrl: optimisticMsg.videoUrl,
          replyToId: currentReplying?.id,
          clientMessageId: clientMsgId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          // Reconcile optimistic message with server assigned message
          setMessages((prev) =>
            prev.map((m) => (m.id === clientMsgId ? { ...data.message, status: 'sent' } : m))
          );
          loadConversations();
        }
      } else {
        const errData = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === clientMsgId ? { ...m, status: 'failed' } : m))
        );
        showToast(errData.error || (isBengali ? 'মেসেজ পাঠানো ব্যর্থ হয়েছে' : 'Failed to send message'));
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === clientMsgId ? { ...m, status: 'failed' } : m))
      );
      showToast(isBengali ? 'নেটওয়ার্ক সংযোগ ব্যর্থ হয়েছে' : 'Network connection error');
    } finally {
      setIsSending(false);
    }
  };

  // ----------------------------------------------------
  // Voice Recording (Real MediaRecorder with synthesis fallback)
  // ----------------------------------------------------
  const startRecording = async () => {
    setIsRecordingAudio(true);
    setRecordDuration(0);
    audioChunksRef.current = [];

    recordTimerRef.current = setInterval(() => {
      setRecordDuration((prev) => prev + 1);
    }, 1000);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.start();
      } catch (err) {
        console.warn('Microphone permission not granted, using simulated audio note:', err);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    clearInterval(recordTimerRef.current);
    setIsRecordingAudio(false);
    setRecordDuration(0);
    audioChunksRef.current = [];
  };

  const stopAndSendRecording = async () => {
    clearInterval(recordTimerRef.current);
    const duration = recordDuration;
    setIsRecordingAudio(false);
    setRecordDuration(0);

    if (!selectedPartner || !token) return;

    const durationStr = `0:${duration < 10 ? '0' : ''}${duration || 10}`;
    setIsSending(true);

    try {
      let audioUrl: string | undefined;

      // If real audio was recorded, upload blob
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('files', audioBlob, `voice_${Date.now()}.webm`);

        const uploadRes = await fetch('/api/media/upload?type=audio', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (uploadRes.ok) {
          const uData = await uploadRes.json();
          audioUrl = uData.url || (uData.files && uData.files[0]?.fileUrl);
        }
      }

      // Send message record
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: selectedPartner.id,
          text: isBengali ? 'ভয়েস অডিও বার্তা' : 'Voice audio message',
          isAudio: true,
          audioDuration: durationStr,
          audioUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
          scrollToBottom(true);
          loadConversations();
        }
      }
    } catch (err) {
      showToast(isBengali ? 'ভয়েস মেসেজ পাঠানো যায়নি' : 'Failed to send voice note');
    } finally {
      setIsSending(false);
      audioChunksRef.current = [];
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    }
  };

  // Play audio note
  const handleTogglePlayAudio = (msgId: string, audioUrl?: string) => {
    if (playingAudioId === msgId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (audioUrl) {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio();
      }
      audioPlayerRef.current.src = audioUrl;
      audioPlayerRef.current.onended = () => setPlayingAudioId(null);
      audioPlayerRef.current.play().catch(() => {});
    } else {
      // Synthesize tone for demo voice notes
      playSynthesizedBeep();
      setTimeout(() => setPlayingAudioId(null), 3000);
    }
    setPlayingAudioId(msgId);
  };

  const playSynthesizedBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch {}
  };

  // ----------------------------------------------------
  // File Upload (Images & Videos) with Draft Preservation & Retry
  // ----------------------------------------------------
  const uploadFileBlob = async (file: File) => {
    if (!token) return;
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 60 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(
        isBengali
          ? `ফাইল সাইজ খুব বেশি (সর্বোচ্চ ${isVideo ? '60 MB' : '20 MB'})`
          : `File exceeds maximum allowed size of ${isVideo ? '60 MB' : '20 MB'}`
      );
      return;
    }

    // 1. Client-side local compression before upload to protect free tier
    let fileToUpload = file;
    if (!isVideo && file.type.startsWith('image/')) {
      try {
        setCompressionStatus(isBengali ? 'ছবি অপ্টিমাইজ ও কম্প্রেশন করা হচ্ছে...' : 'Compressing photo locally...');
        const compressed = await compressImageLocally(file, {
          maxTargetSizeBytes: 1.8 * 1024 * 1024, // Keep <= 1.8 MB
          onProgress: (p) => setUploadProgress(Math.round(p.percent * 0.3)),
        });
        fileToUpload = compressed.file;
      } catch (cErr) {
        console.warn('Local photo compression notice, proceeding with file:', cErr);
      } finally {
        setCompressionStatus(null);
      }
    }

    // 2. Local-only media mode check: user chooses to store media solely on this device
    if (storagePrefs.localOnlyMedia) {
      const localBlobUrl = URL.createObjectURL(fileToUpload);
      setStagedMedia({
        url: localBlobUrl,
        type: isVideo ? 'video' : 'image',
        name: fileToUpload.name,
      });
      showToast(
        isBengali
          ? 'লোকাল-অনলি মোড সক্রিয়: ফাইলটি ক্লাউডে আপলোড হবে না, শুধু এই ডিভাইসে থাকবে।'
          : 'Local-only mode active: file stays on this device without cloud upload.'
      );
      return;
    }

    setIsUploadingMedia(true);
    setUploadProgress(35);
    setFailedAttachment(null);

    const formData = new FormData();
    formData.append('files', fileToUpload);

    try {
      const res = await fetch(`/api/media/upload?type=${isVideo ? 'video' : 'image'}&isPrivate=true&purpose=message`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setUploadProgress(90);

      if (res.ok) {
        const data = await res.json();
        const uploadedUrl = data.url || (data.files && data.files[0]?.fileUrl);
        if (uploadedUrl) {
          setStagedMedia({
            url: uploadedUrl,
            type: isVideo ? 'video' : 'image',
            name: file.name,
          });
          setFailedAttachment(null);
        }
      } else {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        const errMsg =
          res.status === 429
            ? isBengali
              ? 'ক্লাউড স্টোরেজ সীমা পূর্ণ (9.5 GB)। নতুন মিডিয়া আপলোড স্থগিত, তবে টেক্সট মেসেজ সক্রিয় রয়েছে।'
              : 'Storage safety limit reached (9.5 GB). Media uploads are paused to protect the zero-budget free tier. Text messaging remains active.'
            : err.error || (isBengali ? 'মিডিয়া আপলোড ব্যর্থ হয়েছে' : 'Upload failed');
        setFailedAttachment({
          file,
          isVideo,
          error: errMsg,
        });
        showToast(errMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || (isBengali ? 'মিডিয়া আপলোড নেটওয়ার্ক ত্রুটি' : 'Network error during upload');
      setFailedAttachment({
        file,
        isVideo,
        error: errMsg,
      });
      showToast(errMsg);
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileBlob(file);
  };

  const retryFailedAttachment = () => {
    if (failedAttachment) {
      uploadFileBlob(failedAttachment.file);
    }
  };

  // ----------------------------------------------------
  // Emoji Reaction on Message
  // ----------------------------------------------------
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!token) return;
    setActiveMenuMessageId(null);

    // Optimistic local update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          const currentReactions = { ...(m.reactions || {}) };
          if (currentReactions[user?.id || 'me'] === emoji) {
            delete currentReactions[user?.id || 'me'];
          } else {
            currentReactions[user?.id || 'me'] = emoji;
          }
          return { ...m, reactions: currentReactions };
        }
        return m;
      })
    );

    try {
      await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
    } catch (err) {
      console.warn('Failed to react:', err);
    }
  };

  // ----------------------------------------------------
  // Delete Message (for everyone or for me)
  // ----------------------------------------------------
  const handleDeleteMessage = async (messageId: string, forEveryone = false) => {
    if (!token) return;
    setActiveMenuMessageId(null);

    try {
      const res = await fetch(`/api/messages/${messageId}?forEveryone=${forEveryone}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        if (forEveryone) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, isDeleted: true, text: 'This message was deleted', imageUrl: undefined, audioUrl: undefined }
                : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
        showToast(isBengali ? 'মেসেজ মুছে ফেলা হয়েছে' : 'Message deleted');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete message');
      }
    } catch (err) {
      showToast('Error deleting message');
    }
  };

  // ----------------------------------------------------
  // Conversation Options (Pin, Mute, Clear)
  // ----------------------------------------------------
  const handleTogglePin = async (partnerId: string) => {
    if (!token) return;
    setShowConversationMenu(false);
    try {
      const res = await fetch(`/api/messages/conversations/${partnerId}/pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations((prev) =>
          prev.map((c) => (c.partner.id === partnerId ? { ...c, isPinned: data.isPinned } : c))
        );
        showToast(
          data.isPinned
            ? (isBengali ? 'কনভার্সেশন পিন করা হয়েছে' : 'Conversation pinned')
            : (isBengali ? 'আনপিন করা হয়েছে' : 'Conversation unpinned')
        );
      }
    } catch {}
  };

  const handleToggleMute = async (partnerId: string) => {
    if (!token) return;
    setShowConversationMenu(false);
    try {
      const res = await fetch(`/api/messages/conversations/${partnerId}/mute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations((prev) =>
          prev.map((c) => (c.partner.id === partnerId ? { ...c, isMuted: data.isMuted } : c))
        );
        showToast(
          data.isMuted
            ? (isBengali ? 'বিজ্ঞপ্তি মিউট করা হয়েছে' : 'Notifications muted')
            : (isBengali ? 'আনমিউট করা হয়েছে' : 'Notifications unmuted')
        );
      }
    } catch {}
  };

  const handleClearConversation = async (partnerId: string) => {
    if (!token) return;
    setShowConversationMenu(false);
    if (!window.confirm(isBengali ? 'আপনি কি পুরো চ্যাট ইতিহাস মুছে ফেলতে চান?' : 'Clear all messages in this conversation?')) {
      return;
    }
    try {
      const res = await fetch(`/api/messages/conversations/${partnerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages([]);
        loadConversations();
        showToast(isBengali ? 'চ্যাট পরিষ্কার করা হয়েছে' : 'Chat history cleared');
      }
    } catch {}
  };

  // ----------------------------------------------------
  // New Chat Dialog: Pick from Friends
  // ----------------------------------------------------
  const handleOpenNewChatModal = async () => {
    setShowNewChatModal(true);
    setIsLoadingFriends(true);
    try {
      const res = await fetch('/api/friends/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.friends && Array.isArray(data.friends)) {
          setFriendsList(data.friends.map((f: any) => f.friend));
        }
      }
    } catch (e) {
      console.warn('Failed to load friends for new chat:', e);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleStartChatWithUser = (friendUser: User) => {
    setSelectedPartner(friendUser);
    setShowNewChatModal(false);
    setViewMode('chat');
  };

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

  if (!isAuthenticated) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center select-none ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold mb-1">
          {isBengali ? 'মেসেজিংয়ে সাইন ইন করুন' : 'Sign in to Send Messages'}
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mb-5">
          {isBengali
            ? 'বন্ধু ও ক্রিয়েটরদের সাথে নিরাপদ সরাসরি বার্তালাপ, অডিও নোট ও মিডিয়া আদান-প্রদানের জন্য সাইন ইন করুন।'
            : 'Authenticate your account to exchange direct messages, voice notes and media with your connections.'}
        </p>
      </div>
    );
  }

  // =========================================================================
  // RENDER: CHAT VIEW (Active 1:1 Conversation)
  // =========================================================================
  if (viewMode === 'chat' && selectedPartner) {
    return (
      <div className={`flex-1 flex flex-col select-none overflow-hidden w-full relative ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        {/* Hidden Attachment Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Global Toast Message */}
        {toastMessage && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white border border-cyan-500/40 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xl animate-in fade-in duration-150">
            {toastMessage}
          </div>
        )}

        {/* Active Chat Top App Bar */}
        <div className={`px-3 py-2.5 border-b shrink-0 backdrop-blur-xl flex items-center justify-between z-20 transition-colors ${
          isDark ? 'bg-slate-950/90 border-slate-800/80' : 'bg-white/95 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Back Button to Inbox */}
            <button
              onClick={() => {
                setViewMode('inbox');
                loadConversations();
              }}
              className={`p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
              title={isBengali ? 'ইনবক্সে ফিরুন' : 'Back to conversations'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Partner Avatar & Info */}
            <div className="relative shrink-0">
              <img
                src={(selectedPartner?.avatarUrl && selectedPartner.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                alt={selectedPartner.displayName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-cyan-500/40"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 absolute bottom-0 right-0" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h4 className="text-xs font-bold truncate leading-tight">
                  {selectedPartner.displayName}
                </h4>
                {selectedPartner.isVerified && (
                  <span className="text-[10px] text-cyan-400 font-bold shrink-0">✓</span>
                )}
              </div>
              <p className="text-[10px] text-emerald-400 truncate">
                @{selectedPartner.username} • {isBlocked ? (isBengali ? 'ব্লকড' : 'Blocked') : (isBengali ? 'সক্রিয় রিলে' : 'Active relay')}
              </p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Audio Call Simulator */}
            <button
              onClick={() => showToast(isBengali ? 'ভয়েস ও ভিডিও কল শীঘ্রই আসছে (ভার্সন ১.১)' : 'Calling features arriving in v1.1')}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'}`}
              title="Voice Call"
            >
              <Phone className="w-4 h-4" />
            </button>

            <button
              onClick={() => showToast(isBengali ? 'ভয়েস ও ভিডিও কল শীঘ্রই আসছে (ভার্সন ১.১)' : 'Calling features arriving in v1.1')}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'}`}
              title="Video Call"
            >
              <Video className="w-4 h-4" />
            </button>

            {/* Conversation Options Menu Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowConversationMenu(!showConversationMenu)}
                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showConversationMenu && (
                <div className={`absolute right-0 top-10 w-48 rounded-2xl border shadow-xl p-2 z-50 text-xs space-y-1 animate-in fade-in duration-100 ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <button
                    onClick={() => handleTogglePin(selectedPartner.id)}
                    className="w-full p-2 rounded-xl text-left flex items-center gap-2 hover:bg-cyan-500/10 hover:text-cyan-400 font-semibold"
                  >
                    <Pin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isBengali ? 'পিন / আনপিন' : 'Pin conversation'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleMute(selectedPartner.id)}
                    className="w-full p-2 rounded-xl text-left flex items-center gap-2 hover:bg-amber-500/10 hover:text-amber-400 font-semibold"
                  >
                    <BellOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isBengali ? 'মিউট বিজ্ঞপ্তি' : 'Mute notifications'}</span>
                  </button>

                  <button
                    onClick={() => handleClearConversation(selectedPartner.id)}
                    className="w-full p-2 rounded-xl text-left flex items-center gap-2 hover:bg-rose-500/10 text-rose-400 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isBengali ? 'চ্যাট মুছে ফেলুন' : 'Clear conversation'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Blocked Notification Banner if Blocked */}
        {isBlocked && (
          <div className="p-2.5 bg-rose-950/60 border-b border-rose-900/60 flex items-center justify-between text-xs text-rose-300 px-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{isBengali ? 'এই ব্যবহারকারীকে ব্লক করা হয়েছে।' : 'Messaging disabled: You or this user is blocked.'}</span>
            </div>
          </div>
        )}

        {/* Device Storage Warning Banner */}
        {deviceStorageNotice && (
          <div className="p-2.5 bg-amber-950/70 border-b border-amber-900/60 flex items-center justify-between text-xs text-amber-200 px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{deviceStorageNotice}</span>
            </div>
            <button onClick={() => setDeviceStorageNotice(null)} className="text-amber-400 hover:text-white text-xs cursor-pointer">✕</button>
          </div>
        )}

        {/* Local-Only Media Mode Banner */}
        {storagePrefs.localOnlyMedia && (
          <div className="p-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-300 px-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {isBengali
                  ? 'লোকাল-অনলি মিডিয়া মোড সক্রিয়। ছবি/ভিডিও কেবল এই ডিভাইসেই থাকবে। টেক্সট মেসেজ ডাটাবেজে সংরক্ষিত।'
                  : 'Local-only media mode active: photos and videos stay solely on this device. Text messages are always saved.'}
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 shrink-0">Local-only</span>
          </div>
        )}

        {/* Messages Timeline */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span>{isBengali ? 'বার্তা লোড হচ্ছে...' : 'Loading messages...'}</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mx-auto">
                <MessageSquare className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="font-bold text-xs text-slate-300">
                {isBengali ? 'কথোপকথন শুরু করুন' : 'No messages yet'}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                {isBengali
                  ? `${selectedPartner.displayName}-কে মেসেজ, ছবি বা ভয়েস নোট পাঠিয়ে চ্যাট শুরু করুন।`
                  : `Say hello to ${selectedPartner.displayName} to start chatting!`}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user?.id || msg.senderId === 'me' || msg.senderId.startsWith('cli_');
              const isDeleted = msg.isDeleted;

              // Aggregate reaction emojis
              const reactionsMap: Record<string, number> = {};
              if (msg.reactions) {
                Object.values(msg.reactions).forEach((emoji) => {
                  reactionsMap[emoji] = (reactionsMap[emoji] || 0) + 1;
                });
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${
                    isMe ? 'ml-auto' : 'mr-auto'
                  } group relative`}
                >
                  {/* Replied Message Quote Preview */}
                  {msg.replyToPreview && !isDeleted && (
                    <div className={`text-[10px] mb-1 px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                      isMe ? 'bg-blue-900/40 border-blue-700/50 text-blue-200' : 'bg-slate-800/60 border-slate-700/50 text-slate-300'
                    }`}>
                      <Reply className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                      <span className="font-bold">{msg.replyToPreview.senderName}:</span>
                      <span className="truncate max-w-[140px]">{msg.replyToPreview.text}</span>
                    </div>
                  )}

                  {/* Main Bubble */}
                  <div
                    className={`rounded-2xl p-3 text-xs leading-relaxed transition-all relative ${
                      isDeleted
                        ? 'bg-slate-900/60 text-slate-500 italic border border-slate-800'
                        : isMe
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-br-xs shadow-md shadow-blue-950/30'
                        : isDark
                        ? 'bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-xs shadow-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    {isDeleted ? (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Trash2 className="w-3 h-3" />
                        <span>{isBengali ? 'এই মেসেজটি মুছে ফেলা হয়েছে' : 'This message was deleted'}</span>
                      </span>
                    ) : (
                      <>
                        {/* Image Attachment (Local-First: Downloaded or Download Control) */}
                        {msg.imageUrl && (
                          cachedUrls[msg.imageUrl] ? (
                            <div className="mb-2 space-y-1">
                              <div
                                className="rounded-xl overflow-hidden cursor-pointer"
                                onClick={() => setActiveLightboxImage(cachedUrls[msg.imageUrl!] || msg.imageUrl!)}
                              >
                                <img
                                  src={(cachedUrls[msg.imageUrl] && cachedUrls[msg.imageUrl].trim()) || (msg.imageUrl && msg.imageUrl.trim()) || undefined}
                                  alt="Attachment"
                                  className="max-h-56 w-auto rounded-xl object-cover hover:opacity-95 transition-opacity"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1 text-[10px] px-1 text-slate-300">
                                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{isBengali ? 'ডিভাইসে সংরক্ষিত' : 'Saved to device'}</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveToGallery(msg.imageUrl!, `photo_${msg.id}`)}
                                    className="p-1 rounded-lg hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
                                    title={isBengali ? 'গ্যালারিতে সংরক্ষণ' : 'Save to Gallery'}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFileToDelete({ url: msg.imageUrl!, name: isBengali ? 'ছবি ফাইল' : `photo_${msg.id}` })}
                                    className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                                    title={isBengali ? 'ডিভাইস থেকে মুছুন (নিশ্চিতকরণ প্রয়োজন)' : 'Delete from device'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-2 p-2.5 rounded-2xl bg-slate-950/40 border border-slate-700/60 flex items-center justify-between gap-2.5 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-200 block truncate text-xs">
                                    {isBengali ? 'ছবি সংযুক্তি' : 'Photo Attachment'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {downloadErrors[msg.imageUrl] || (isBengali ? 'ডিভাইসে সেভ করতে ট্যাপ করুন' : 'Tap to download to device')}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={downloadingUrls[msg.imageUrl]}
                                onClick={() => handleExplicitDownload(msg.imageUrl!, 'image', msg.id)}
                                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors shrink-0 cursor-pointer disabled:opacity-60"
                              >
                                {downloadingUrls[msg.imageUrl] ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>{isBengali ? 'ডাউনলোড...' : 'Saving...'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{isBengali ? 'ডাউনলোড' : 'Download'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )
                        )}

                        {/* Video Attachment (Local-First: Downloaded or Download Control) */}
                        {msg.videoUrl && (
                          cachedUrls[msg.videoUrl] ? (
                            <div className="mb-2 space-y-1">
                              <div className="rounded-xl overflow-hidden">
                                <video
                                  src={(cachedUrls[msg.videoUrl] && cachedUrls[msg.videoUrl].trim()) || (msg.videoUrl && msg.videoUrl.trim()) || undefined}
                                  controls
                                  className="max-h-56 w-full rounded-xl object-cover"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1 text-[10px] px-1 text-slate-300">
                                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{isBengali ? 'ভিডিও সেভ করা' : 'Saved to device'}</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveToGallery(msg.videoUrl!, `video_${msg.id}`)}
                                    className="p-1 rounded-lg hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
                                    title={isBengali ? 'গ্যালারিতে সংরক্ষণ' : 'Save to Gallery'}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFileToDelete({ url: msg.videoUrl!, name: isBengali ? 'ভিডিও ফাইল' : `video_${msg.id}` })}
                                    className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                                    title={isBengali ? 'ডিভাইস থেকে মুছুন (নিশ্চিতকরণ প্রয়োজন)' : 'Delete from device'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-2 p-2.5 rounded-2xl bg-slate-950/40 border border-slate-700/60 flex items-center justify-between gap-2.5 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                                  <Video className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-200 block truncate text-xs">
                                    {isBengali ? 'ভিডিও সংযুক্তি' : 'Video Attachment'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {downloadErrors[msg.videoUrl] || (isBengali ? 'ডিভাইসে সেভ করতে ট্যাপ করুন' : 'Tap to download to device')}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={downloadingUrls[msg.videoUrl]}
                                onClick={() => handleExplicitDownload(msg.videoUrl!, 'video', msg.id)}
                                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors shrink-0 cursor-pointer disabled:opacity-60"
                              >
                                {downloadingUrls[msg.videoUrl] ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>{isBengali ? 'ডাউনলোড...' : 'Saving...'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{isBengali ? 'ডাউনলোড' : 'Download'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )
                        )}

                        {/* Audio Voice Note */}
                        {msg.isAudio ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5 min-w-[180px]">
                              <button
                                type="button"
                                onClick={() => handleTogglePlayAudio(msg.id, cachedUrls[msg.audioUrl || ''] || msg.audioUrl)}
                                className="w-8 h-8 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 hover:bg-cyan-300 transition-colors shadow-sm cursor-pointer"
                              >
                                {playingAudioId === msg.id ? (
                                  <Pause className="w-4 h-4 fill-slate-950" />
                                ) : (
                                  <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                                )}
                              </button>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-0.5 h-4">
                                  {[12, 22, 16, 26, 18, 14, 28, 20, 24, 12, 18, 22].map((h, i) => (
                                    <span
                                      key={i}
                                      className={`w-1 rounded-full transition-all ${
                                        playingAudioId === msg.id
                                          ? 'bg-cyan-300 animate-pulse'
                                          : isMe ? 'bg-white/60' : 'bg-slate-500'
                                      }`}
                                      style={{ height: `${h}px` }}
                                    />
                                  ))}
                                </div>
                                <div className="text-[10px] opacity-80 font-mono flex justify-between">
                                  <span>{isBengali ? 'ভয়েস নোট' : 'Voice Note'}</span>
                                  <span>{msg.audioDuration || '0:18'}</span>
                                </div>
                              </div>
                            </div>
                            {msg.audioUrl && (
                              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5 px-0.5">
                                {cachedUrls[msg.audioUrl] ? (
                                  <span className="flex items-center gap-1 text-emerald-400">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    <span>{isBengali ? 'ডিভাইসে রয়েছে' : 'On device'}</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleExplicitDownload(msg.audioUrl!, 'audio', msg.id)}
                                    className="flex items-center gap-1 text-cyan-400 hover:underline cursor-pointer"
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                    <span>{isBengali ? 'ডিভাইসে সেভ করুন' : 'Save audio'}</span>
                                  </button>
                                )}
                                {cachedUrls[msg.audioUrl] && (
                                  <button
                                    type="button"
                                    onClick={() => setFileToDelete({ url: msg.audioUrl!, name: isBengali ? 'ভয়েস নোট' : 'voice_note' })}
                                    className="text-rose-400 hover:underline cursor-pointer ml-auto"
                                  >
                                    {isBengali ? 'মুছুন' : 'Delete'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Reaction Pills */}
                  {Object.keys(reactionsMap).length > 0 && !isDeleted && (
                    <div className="flex items-center gap-1 -mt-1.5 px-1.5 z-10">
                      {Object.entries(reactionsMap).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border shadow-xs flex items-center gap-1 transition-all ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <span>{emoji}</span>
                          {count > 1 && <span className="font-bold text-[9px]">{count}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Meta: Timestamp & Delivery Status */}
                  <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5 px-1">
                    <span>{msg.timestamp || 'Just now'}</span>
                    {isMe && (
                      <span>
                        {msg.status === 'sending' ? (
                          <Clock className="w-3 h-3 text-slate-400 animate-pulse" />
                        ) : msg.status === 'failed' ? (
                          <button onClick={() => handleSendMessage()} className="flex items-center gap-0.5 text-rose-400 font-bold hover:underline">
                            <AlertCircle className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        ) : msg.isRead ? (
                          <CheckCheck className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <CheckCheck className="w-3 h-3 text-slate-400" />
                        )}
                      </span>
                    )}
                  </div>

                  {/* Hover Quick Actions Bar */}
                  {!isDeleted && (
                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 ${isMe ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} flex items-center gap-1 bg-slate-900/95 border border-slate-800 p-1 rounded-xl shadow-lg z-20`}>
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800"
                        title="Reply"
                      >
                        <Reply className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.text);
                          showToast(isBengali ? 'কপি করা হয়েছে' : 'Copied to clipboard');
                        }}
                        className="p-1 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800"
                        title="Copy text"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <div className="flex items-center gap-0.5 border-l border-slate-700 pl-1">
                        {['❤️', '👍', '😂'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="text-xs hover:scale-125 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleDeleteMessage(msg.id, isMe)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Replying To Quote Banner */}
        {replyingTo && (
          <div className="p-2 px-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2 truncate">
              <Reply className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="font-bold text-cyan-400 block text-[10px]">
                  {isBengali ? 'উত্তরে লিখছেন' : 'Replying to'}:
                </span>
                <span className="truncate text-[11px] opacity-80">{replyingTo.text}</span>
              </div>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Staged Media Attachment Banner */}
        {stagedMedia && (
          <div className="p-2 px-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2.5">
              {stagedMedia.type === 'image' ? (
                Boolean(stagedMedia.url && stagedMedia.url.trim()) && (
                  <img src={stagedMedia.url} alt="" className="w-9 h-9 rounded-lg object-cover border border-cyan-500/40" />
                )
              ) : (
                <div className="w-9 h-9 rounded-lg bg-blue-600/30 flex items-center justify-center text-cyan-400">
                  <Video className="w-4 h-4" />
                </div>
              )}
              <div>
                <span className="text-[11px] font-bold block">{stagedMedia.name}</span>
                <span className="text-[9px] text-emerald-400">{isBengali ? 'সংযুক্ত করা হয়েছে' : 'Ready to send'}</span>
              </div>
            </div>
            <button onClick={() => setStagedMedia(null)} className="p-1 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Failed Attachment Draft Banner with Retry / Remove */}
        {failedAttachment && (
          <div className="p-2.5 px-3.5 bg-rose-950/90 border-t border-rose-800/80 flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-rose-100 truncate">{failedAttachment.file.name}</p>
                <p className="text-[10px] text-rose-300 truncate">{failedAttachment.error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isUploadingMedia}
                onClick={retryFailedAttachment}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isUploadingMedia ? 'animate-spin' : ''}`} />
                <span>{isBengali ? 'পুনরায় চেষ্টা' : 'Retry'}</span>
              </button>
              <button
                type="button"
                onClick={() => setFailedAttachment(null)}
                className="p-1 rounded-lg hover:bg-rose-900/60 text-rose-300 hover:text-white"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Audio Recording Live Ribbon */}
        {isRecordingAudio && (
          <div className="p-2.5 px-4 bg-rose-950/80 border-t border-rose-800/60 flex items-center justify-between text-xs text-rose-200 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold">
                {isBengali ? 'ভয়েস রেকর্ড হচ্ছে...' : 'Recording voice note...'} (0:{recordDuration < 10 ? '0' : ''}{recordDuration})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
              >
                {isBengali ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={stopAndSendRecording}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md"
              >
                <Send className="w-3 h-3" />
                <span>{isBengali ? 'পাঠান' : 'Send Audio'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Emoji Drawer */}
        {showEmojiPicker && (
          <div className={`p-2 border-t flex items-center justify-between gap-1 overflow-x-auto no-scrollbar ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setInputText((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Bottom Message Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className={`p-2.5 border-t flex items-center gap-2 shrink-0 transition-colors ${
            isDark ? 'bg-slate-950/95 border-slate-800/80' : 'bg-white border-slate-200'
          }`}
        >
          {/* Media Attachment Button */}
          <button
            type="button"
            disabled={isBlocked || isUploadingMedia}
            onClick={() => fileInputRef.current?.click()}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            title="Attach image or video"
          >
            {isUploadingMedia ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Paperclip className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          {/* Emoji Toggle */}
          <button
            type="button"
            disabled={isBlocked}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              showEmojiPicker
                ? 'bg-cyan-500/20 text-cyan-400'
                : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            title="Emojis"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Voice Mic Toggle */}
          <button
            type="button"
            disabled={isBlocked || isRecordingAudio}
            onClick={startRecording}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              isRecordingAudio
                ? 'bg-rose-500 text-white animate-pulse'
                : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            title="Record Voice Note"
          >
            <Mic className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Text Input Field */}
          <input
            type="text"
            disabled={isBlocked}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isBlocked
                ? (isBengali ? 'ব্লক থাকার কারণে মেসেজ পাঠানো বন্ধ' : 'Messaging disabled due to block')
                : (isBengali ? 'বার্তা লিখুন...' : 'Type a message...')
            }
            className={`flex-1 border rounded-full px-4 py-2 text-xs focus:outline-none transition-colors ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
            }`}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !stagedMedia) || isSending || isBlocked}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 disabled:opacity-40 text-white flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity shadow-sm"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </form>

        {/* Lightbox Modal for Full Image Inspection */}
        {activeLightboxImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setActiveLightboxImage(null)}
          >
            <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl">
              {Boolean(activeLightboxImage && activeLightboxImage.trim()) && (
                <img src={activeLightboxImage} alt="" className="w-full h-full object-contain" />
              )}
              <button
                onClick={() => setActiveLightboxImage(null)}
                className="absolute top-3 right-3 p-2 bg-black/70 text-white rounded-full hover:bg-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER: INBOX VIEW (Conversations List, Search & Live Audio Rooms)
  // =========================================================================
  return (
    <div className={`flex-1 flex flex-col select-none overflow-hidden w-full ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Header & Tab Switcher */}
      <div className={`p-3 border-b shrink-0 backdrop-blur-xl ${isDark ? 'bg-slate-950/90 border-slate-800/80' : 'bg-white/95 border-slate-200'}`}>
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>{isBengali ? 'বার্তা ও ইনবক্স' : 'Messages & Inbox'}</span>
            </h3>
            <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>SERVER RELAY</span>
            </span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleOpenNewChatModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-xs hover:opacity-95 transition-opacity flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isBengali ? 'নতুন চ্যাট' : 'New Chat'}</span>
          </button>
        </div>

        {/* Sub-Tabs: Direct vs Live Creator Rooms */}
        <div className="flex items-center justify-between pt-1">
          <div className={`flex items-center gap-1 p-0.5 rounded-xl text-xs font-semibold border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveTab('direct')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'direct'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{isBengali ? 'সরাসরি চ্যাট' : 'Direct Messages'}</span>
              {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('live_rooms')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'live_rooms'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{isBengali ? 'লাইভ অডিও রুম' : 'Live Rooms'}</span>
            </button>
          </div>

          <button
            onClick={() => loadConversations()}
            className={`p-1.5 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Bar for Messages and Contacts */}
        <div className="mt-2.5 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBengali ? 'মেসেজ বা কথোপকথন খুঁজুন...' : 'Search messages & conversations...'}
            className={`w-full border rounded-2xl pl-9 pr-8 py-1.5 text-xs focus:outline-none transition-colors ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
            }`}
          />
          {isSearching && (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
          {searchQuery && !isSearching && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Inbox Body */}
      {activeTab === 'live_rooms' ? (
        /* Live Audio / Creator Rooms Tab */
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-2xl flex items-center gap-2.5 text-xs text-cyan-300">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
            <span>
              {isBengali
                ? 'সরাসরি অডিও রুমে যোগ দিন অথবা আপনার নিজস্ব স্টুডিও স্পেস চালু করুন।'
                : 'Join live audio creator rooms with high-fidelity speech synthesis.'}
            </span>
          </div>

          {liveRooms.map((room) => (
            <div
              key={room.id}
              className={`border rounded-2xl p-4 space-y-3 transition-colors ${
                isDark ? 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                  <span>{room.activeListeners} Listening</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Audio Stage</span>
              </div>

              <h4 className="text-xs font-bold leading-snug">{room.title}</h4>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <img
                    src={(room.host?.avatarUrl && room.host.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border border-cyan-500/40"
                  />
                  <div>
                    <span className="text-xs font-medium block">{room.host.displayName}</span>
                    <span className="text-[10px] text-slate-400">Host & Speaker</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveAudioRoom(room)}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-xs flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isBengali ? 'শুনুন' : 'Tune In'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Direct Conversations List */
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {isLoadingConversations ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span>{isBengali ? 'ইনবক্স লোড হচ্ছে...' : 'Loading inbox...'}</span>
            </div>
          ) : searchResults ? (
            /* Search Results View */
            <div className="p-3 space-y-2">
              <p className="text-[11px] text-slate-400 font-bold px-1">
                {isBengali ? `খোঁজের ফলাফল (${searchResults.length})` : `Search Results (${searchResults.length})`}
              </p>
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  {isBengali ? 'কোনো মেসেজ পাওয়া যায়নি' : 'No matching messages found'}
                </div>
              ) : (
                searchResults.map((item: any) => (
                  <div
                    key={item.message.id}
                    onClick={() => {
                      setSelectedPartner(item.partner);
                      setViewMode('chat');
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      isDark ? 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/50' : 'bg-white border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{item.partner.displayName}</span>
                      <span className="text-[10px] text-slate-500">{item.message.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">{item.message.text}</p>
                  </div>
                ))
              )}
            </div>
          ) : conversations.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-cyan-400">
                <MessageSquare className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div>
                <h4 className="font-bold text-sm">
                  {isBengali ? 'কোনো বার্তা নেই' : 'No conversations yet'}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  {isBengali
                    ? 'আপনার বন্ধুদের সাথে কানেক্ট করুন অথবা নতুন ক্রিয়েটরদের সাথে চ্যাট শুরু করুন।'
                    : 'Connect with friends or start a conversation with fellow creators.'}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleOpenNewChatModal}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  {isBengali ? 'নতুন চ্যাট শুরু করুন' : 'Start a Chat'}
                </button>
                {onOpenFriends && (
                  <button
                    onClick={onOpenFriends}
                    className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-xs font-bold rounded-xl"
                  >
                    {isBengali ? 'বন্ধু খুঁজুন' : 'Find Friends'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Active Conversations */
            conversations.map((conv) => {
              const lastMsg = conv.lastMessage;
              const hasUnread = conv.unreadCount > 0;

              return (
                <div
                  key={conv.partner.id}
                  onClick={() => {
                    setSelectedPartner(conv.partner);
                    setViewMode('chat');
                  }}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                    hasUnread
                      ? isDark ? 'bg-cyan-950/20 hover:bg-cyan-950/40' : 'bg-blue-50/70 hover:bg-blue-50'
                      : isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <img
                        src={(conv.partner?.avatarUrl && conv.partner.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-cyan-500/30"
                      />
                      <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-950 absolute bottom-0 right-0" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className={`text-xs truncate ${hasUnread ? 'font-black text-cyan-300' : 'font-bold'}`}>
                            {conv.partner.displayName}
                          </h4>
                          {conv.partner.isVerified && (
                            <span className="text-[10px] text-cyan-400 font-bold shrink-0">✓</span>
                          )}
                          {conv.isPinned && (
                            <Pin className="w-3 h-3 text-cyan-400 shrink-0 fill-cyan-400/30" />
                          )}
                          {conv.isMuted && (
                            <BellOff className="w-3 h-3 text-slate-500 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 ml-1">
                          {lastMsg.timestamp}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-0.5">
                        <p className={`text-xs truncate pr-2 ${hasUnread ? 'font-bold text-slate-200' : 'text-slate-400'}`}>
                          {lastMsg.isAudio
                            ? '🎤 Voice note'
                            : lastMsg.imageUrl
                            ? '📷 Photo'
                            : lastMsg.videoUrl
                            ? '🎥 Video'
                            : lastMsg.text}
                        </p>
                        {hasUnread && (
                          <span className="min-w-4 h-4 px-1.5 rounded-full bg-cyan-400 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* New Chat Modal: Select Friend to Start Messaging */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{isBengali ? 'বন্ধু নির্বাচন করুন' : 'Select a Friend to Message'}</span>
              </h4>
              <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {isLoadingFriends ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 mx-auto mb-1" />
                  <span>{isBengali ? 'বন্ধু তালিকা লোড হচ্ছে...' : 'Loading friends...'}</span>
                </div>
              ) : friendsList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 space-y-2">
                  <p>{isBengali ? 'কোনো নিশ্চিত বন্ধু পাওয়া যায়নি।' : 'No confirmed friends found.'}</p>
                  {onOpenFriends && (
                    <button
                      onClick={() => {
                        setShowNewChatModal(false);
                        onOpenFriends();
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
                    >
                      {isBengali ? 'নতুন বন্ধু খুঁজুন' : 'Find Friends'}
                    </button>
                  )}
                </div>
              ) : (
                friendsList.map((fUser) => (
                  <div
                    key={fUser.id}
                    onClick={() => handleStartChatWithUser(fUser)}
                    className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer border transition-colors ${
                      isDark ? 'bg-slate-800/40 border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={(fUser?.avatarUrl && fUser.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <span className="font-bold text-xs block">{fUser.displayName}</span>
                        <span className="text-[10px] text-slate-400">@{fUser.username}</span>
                      </div>
                    </div>
                    <button className="px-3 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-xs">
                      {isBengali ? 'চ্যাট' : 'Chat'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Audio Room Listening Modal */}
      {activeAudioRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] bg-rose-950 text-rose-300 font-bold px-2 py-0.5 rounded-full uppercase border border-rose-800/40">
                Live Creator Audio Stage
              </span>
              <button onClick={() => setActiveAudioRoom(null)} className="text-xs text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="text-center space-y-2 pt-2">
              <img
                src={(activeAudioRoom.host?.avatarUrl && activeAudioRoom.host.avatarUrl.trim()) || '/src/assets/images/zangi_creator_tech_1791614790487.jpg'}
                alt=""
                className="w-16 h-16 rounded-full mx-auto object-cover ring-4 ring-cyan-500/30"
              />
              <h4 className="text-sm font-bold">{activeAudioRoom.title}</h4>
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
                Connected to audio stream. Spatial audio active.
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

      {/* Confirm Delete Local Media Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-rose-400">
                {isBengali ? 'ফাইলটি মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Media Deletion'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isBengali
                  ? `আপনি কি নিশ্চিতভাবে "${fileToDelete.name}" আপনার ডিভাইস স্টোরেজ থেকে মুছে ফেলতে চান? এটি শুধুমাত্র এই ডিভাইসের লোকাল মেমোরি থেকে মুছে যাবে।`
                  : `Are you sure you want to delete "${fileToDelete.name}" from your device storage? This cannot be undone.`}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                {isBengali ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLocalMedia}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-md cursor-pointer"
              >
                {isBengali ? 'মুছে ফেলুন' : 'Delete from Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
