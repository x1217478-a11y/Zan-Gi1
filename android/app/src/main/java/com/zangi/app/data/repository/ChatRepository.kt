package com.zangi.app.data.repository

import com.zangi.app.data.model.ChatConversation
import com.zangi.app.data.model.ChatMessage
import com.zangi.app.data.model.CreatorLiveRoom
import com.zangi.app.data.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

interface ChatRepository {
    fun getConversationsFlow(): Flow<List<ChatConversation>>
    fun getMessagesForConversation(convId: String): Flow<List<ChatMessage>>
    fun getLiveRoomsFlow(): Flow<List<CreatorLiveRoom>>
    suspend fun sendMessage(convId: String, text: String): Result<ChatMessage>
}

class LocalDemoChatRepository : ChatRepository {

    private val userNusrat = User(
        id = "user_nusrat",
        username = "nusrat_visuals",
        displayName = "Nusrat Jahan",
        avatarUrl = "/src/assets/images/zangi_creator_art_1791614801925.jpg",
        bio = "Digital artist & 3D animator",
        isVerified = true
    )

    private val userTanvir = User(
        id = "user_tanvir",
        username = "tanvir_dev",
        displayName = "Tanvir Hasan",
        avatarUrl = "/src/assets/images/zangi_creator_tech_1791614790487.jpg",
        bio = "Mobile Android dev @ Dhaka",
        isVerified = false
    )

    private val initialConversations = listOf(
        ChatConversation(
            id = "conv_1",
            participant = userNusrat,
            lastMessage = "নতুন এনিমেশনটি Zan-Gi স্টুডিওতে আপলোড করেছি, কেমন লাগলো জানাবেন!",
            lastMessageTimestamp = "১২:৩০ PM",
            unreadCount = 1,
            isOnline = true
        ),
        ChatConversation(
            id = "conv_2",
            participant = userTanvir,
            lastMessage = "Let's test the Jetpack Compose 2026 Material 3 theme in today's build.",
            lastMessageTimestamp = "গতকাল",
            unreadCount = 0,
            isOnline = false
        )
    )

    private val messagesMap = mutableMapOf(
        "conv_1" to MutableStateFlow(
            listOf(
                ChatMessage("m1", "user_nusrat", "হ্যালো ফাহিম ভাই! কেমন আছেন?", "১২:২০ PM"),
                ChatMessage("m2", "user_me", "আলহামদুলিল্লাহ ভালো! আপনি কেমন আছেন?", "১২:২২ PM"),
                ChatMessage("m3", "user_nusrat", "নতুন এনিমেশনটি Zan-Gi স্টুডিওতে আপলোড করেছি, কেমন লাগলো জানাবেন!", "১২:৩০ PM")
            )
        )
    )

    private val liveRooms = listOf(
        CreatorLiveRoom(
            id = "room_1",
            title = "বাংলা AI ও ক্রিয়েটর ইকোনমি: ২০২৬ এর সম্ভাবনা",
            host = userNusrat,
            activeListeners = 142,
            topicTags = listOf("AIবাংলা", "CreatorEconomy", "Dhaka"),
            isLiveNow = true
        ),
        CreatorLiveRoom(
            id = "room_2",
            title = "Android Jetpack Compose & M3 Architecture Q&A",
            host = userTanvir,
            activeListeners = 89,
            topicTags = listOf("Kotlin", "Compose", "Android"),
            isLiveNow = true
        )
    )

    private val _conversations = MutableStateFlow(initialConversations)
    private val _liveRooms = MutableStateFlow(liveRooms)

    override fun getConversationsFlow(): Flow<List<ChatConversation>> = _conversations.asStateFlow()

    override fun getMessagesForConversation(convId: String): Flow<List<ChatMessage>> {
        return messagesMap.getOrPut(convId) {
            MutableStateFlow(emptyList())
        }.asStateFlow()
    }

    override fun getLiveRoomsFlow(): Flow<List<CreatorLiveRoom>> = _liveRooms.asStateFlow()

    override suspend fun sendMessage(convId: String, text: String): Result<ChatMessage> {
        val newMsg = ChatMessage(
            id = "m_${System.currentTimeMillis()}",
            senderId = "user_me",
            text = text,
            timestamp = "এইমাত্র"
        )
        val flow = messagesMap.getOrPut(convId) { MutableStateFlow(emptyList()) }
        flow.update { it + newMsg }

        _conversations.update { list ->
            list.map { conv ->
                if (conv.id == convId) conv.copy(lastMessage = text, lastMessageTimestamp = "এইমাত্র")
                else conv
            }
        }
        return Result.success(newMsg)
    }
}
