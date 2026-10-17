package com.zangi.app.data.model

enum class AiTaskType {
    GENERAL_CHAT,
    CAPTION_DRAFTING,
    HASHTAG_OPTIMIZATION,
    SHORT_VIDEO_SCRIPT,
    TRANSLATION,
    SPELLING_GRAMMAR,
    THUMBNAIL_IDEAS,
    SUBTITLE_GENERATION
}

enum class AiLanguage(val code: String, val label: String) {
    BENGALI("bn", "বাংলা (Bengali)"),
    ENGLISH("en", "English")
}

data class AiAssistantMessage(
    val id: String,
    val sender: String, // "user" or "assistant"
    val content: String,
    val timestamp: String,
    val taskType: AiTaskType = AiTaskType.GENERAL_CHAT,
    val language: AiLanguage = AiLanguage.BENGALI,
    val isDemoFallback: Boolean = false,
    val modelSignature: String = "gemini-3.8-flash"
)

data class AiServiceStatus(
    val isConfigured: Boolean,
    val provider: String,
    val model: String,
    val statusMessage: String,
    val rateLimitRemaining: Int = 100
)
