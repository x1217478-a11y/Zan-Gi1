package com.zangi.app.data.model

data class ChatConversation(
    val id: String,
    val participant: User,
    val lastMessage: String,
    val lastMessageTimestamp: String,
    val unreadCount: Int = 0,
    val isOnline: Boolean = false,
    val isGroup: Boolean = false,
    val groupTitle: String? = null
)

data class ChatMessage(
    val id: String,
    val senderId: String,
    val text: String,
    val timestamp: String,
    val isAudioVoiceNote: Boolean = false,
    val audioDurationSeconds: Int = 0,
    val isRead: Boolean = true
)

data class CreatorLiveRoom(
    val id: String,
    val title: String,
    val host: User,
    val activeListeners: Int = 0,
    val topicTags: List<String> = emptyList(),
    val isLiveNow: Boolean = true,
    val requiresBackendNotice: String = "Requires active WebRTC SFU signaling cluster"
)
