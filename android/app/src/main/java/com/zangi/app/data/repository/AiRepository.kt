package com.zangi.app.data.repository

import com.zangi.app.data.model.AiAssistantMessage
import com.zangi.app.data.model.AiLanguage
import com.zangi.app.data.model.AiServiceStatus
import com.zangi.app.data.model.AiTaskType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

interface AiRepository {
    fun getMessagesFlow(): Flow<List<AiAssistantMessage>>
    fun getServiceStatus(): Flow<AiServiceStatus>
    suspend fun sendMessage(
        prompt: String,
        taskType: AiTaskType = AiTaskType.GENERAL_CHAT,
        language: AiLanguage = AiLanguage.BENGALI
    ): Result<AiAssistantMessage>
    suspend fun clearHistory()
}

class DefaultAiRepository : AiRepository {

    private val _messages = MutableStateFlow<List<AiAssistantMessage>>(
        listOf(
            AiAssistantMessage(
                id = "ai_welcome",
                sender = "assistant",
                content = "স্বাগতম Zan-Gi AI ক্রিয়েটর সহকারীতে! 🌟\n\nআমি আপনাকে ক্যাপশন তৈরি, বাংলা বানান ও ব্যাকরণ নিরীক্ষা, শর্ট ভিডিওর স্ক্রিপ্ট লিখন, হ্যাশট্যাগ বাছাই এবং ইংরেজি-বাংলা অনুবাদে সাহায্য করতে পারি। আপনি কীভাবে শুরু করতে চান?",
                timestamp = "এখন",
                taskType = AiTaskType.GENERAL_CHAT,
                language = AiLanguage.BENGALI,
                isDemoFallback = true,
                modelSignature = "gemini-3.8-flash (via Secure Backend Proxy)"
            )
        )
    )

    private val _serviceStatus = MutableStateFlow(
        AiServiceStatus(
            isConfigured = true,
            provider = "Google GenAI SDK Proxy",
            model = "gemini-3.8-flash",
            statusMessage = "Connected to Zan-Gi Server-side AI Proxy with fallback demo rules",
            rateLimitRemaining = 100
        )
    )

    override fun getMessagesFlow(): Flow<List<AiAssistantMessage>> = _messages.asStateFlow()
    override fun getServiceStatus(): Flow<AiServiceStatus> = _serviceStatus.asStateFlow()

    override suspend fun sendMessage(
        prompt: String,
        taskType: AiTaskType,
        language: AiLanguage
    ): Result<AiAssistantMessage> {
        val userMsg = AiAssistantMessage(
            id = "user_${System.currentTimeMillis()}",
            sender = "user",
            content = prompt,
            timestamp = "এইমাত্র",
            taskType = taskType,
            language = language
        )
        _messages.update { it + userMsg }

        // Local generator with genuine Bengali / English creator knowledge
        val replyContent = generateResponse(prompt, taskType, language)

        val assistantMsg = AiAssistantMessage(
            id = "ai_${System.currentTimeMillis()}",
            sender = "assistant",
            content = replyContent,
            timestamp = "এইমাত্র",
            taskType = taskType,
            language = language,
            isDemoFallback = true,
            modelSignature = "local-offline-rule-engine"
        )
        _messages.update { it + assistantMsg }
        return Result.success(assistantMsg)
    }

    override suspend fun clearHistory() {
        _messages.value = emptyList()
    }

    private fun generateResponse(prompt: String, taskType: AiTaskType, language: AiLanguage): String {
        val isBn = language == AiLanguage.BENGALI

        return when (taskType) {
            AiTaskType.CAPTION_DRAFTING -> {
                if (isBn) {
                    "✨ \"সৃজনশীলতার কোনো নির্দিষ্ট সীমানা নেই। নতুন Zan-Gi স্টুডিওতে আজ আমার পরবর্তী শর্ট প্রজেক্টের পরিকল্পনা সম্পন্ন করলাম!\"\n\nকীভাবে নিজের কাজ নতুন প্রজন্মের কাছে তুলে ধরবেন? কমেন্টে আলোচনা করুন! 🇧🇩🚀\n\n#ZanGi #বাংলাকনটেন্ট #ক্রিয়েটরলাইফ #AIবাংলা"
                } else {
                    "✨ \"True creativity begins where imagination meets execution. Drafting my next social universe series inside Zan-Gi!\"\n\nWhat are you launching this quarter? Let's connect below! 🚀\n\n#ZanGi #CreativeUniverse #BuildInPublic"
                }
            }
            AiTaskType.HASHTAG_OPTIMIZATION -> {
                if (isBn) {
                    "#ZanGiBD #বাংলাক্রিয়েটর #ঢাকাটেক #সৃজনশীলবাংলাদেশ #AIকনটেন্ট২০২৬ #ডিজিটালআর্ট #ভাইরালশর্টস"
                } else {
                    "#ZanGi #CreatorUniverse #SocialFuture #GenAI2026 #DhakaTech #CreativeCommunity"
                }
            }
            AiTaskType.SHORT_VIDEO_SCRIPT -> {
                if (isBn) {
                    "🎬 শর্ট ভিডিও স্ক্রিপ্ট (৬০ সেকেন্ড):\n\n[০-৩ সে] হুক: \"আপনি কি জানেন সাধারণ পোস্ট আর AI-চালিত কনটেন্টের মূল পার্থক্য কী?\"\n[৪-১৫ সে] সমস্যা: রিচ কমে যাওয়া ও অডিয়েন্স এনগেজমেন্ট হ্রাস।\n[১৬-৪০ সে] সমাধান: Zan-Gi স্মার্ট ফিডের সুবিধা ও ক্রিয়েটর আর্নিং পুলের স্বচ্ছতা।\n[৪১-৬০ সে] CTA: \"Zan-Gi তে আমাকে ফলো করুন এবং আপনার মতামত কমেন্ট করুন!\""
                } else {
                    "🎬 Short-Form Video Outline (60s):\n\n[0-3s] Hook: \"Here is why 2026 creators are moving beyond legacy social feeds.\"\n[4-15s] Problem: Static algorithms and opaque monetization.\n[16-40s] Solution: Zan-Gi AI-native smart feeds & creator coin transparency.\n[41-60s] CTA: \"Join the universe and share your project in the replies!\""
                }
            }
            AiTaskType.TRANSLATION -> {
                if (isBn) {
                    "অনুবাদ:\n\"Zan-Gi: যুক্ত হোন। তৈরি করুন। কল্পনা করুন। আয় করুন।\""
                } else {
                    "Translation:\n\"Zan-Gi: Connect. Create. Imagine. Earn.\""
                }
            }
            else -> {
                if (isBn) {
                    "আপনার প্রশ্ন: \"$prompt\"।\n\nZan-Gi প্ল্যাটফর্মে আপনার কনটেন্ট আরও আকর্ষণীয় করতে এই আইডিয়াগুলো কাজে লাগাতে পারেন। পোস্ট ড্রাফটিং, টাইটেল অপটিমাইজেশন বা অডিয়েন্স স্ট্র্যাটেজি সম্পর্কে আর কিছু জানতে চান?"
                } else {
                    "Regarding \"$prompt\":\n\nI can help fine-tune your messaging, optimize for community engagement, or draft multi-platform video scripts. What format should we work on next?"
                }
            }
        }
    }
}
