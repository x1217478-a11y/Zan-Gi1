package com.zangi.app.data.model

enum class PostType {
    TEXT,
    IMAGE,
    SHORT_VIDEO,
    SPONSORED_NATIVE_AD
}

data class Post(
    val id: String,
    val author: User,
    val content: String,
    val postType: PostType = PostType.TEXT,
    val mediaUrl: String? = null,
    val thumbnailUrl: String? = null,
    val timestamp: String,
    val likesCount: Int = 0,
    val isLiked: Boolean = false,
    val commentsCount: Int = 0,
    val sharesCount: Int = 0,
    val isSaved: Boolean = false,
    val hashtags: List<String> = emptyList(),
    val isAiAssisted: Boolean = false,
    val recommendationReason: String? = null, // e.g. "Because you follow AI & Dhaka Tech"
    val isDemoData: Boolean = true
)

data class Comment(
    val id: String,
    val author: User,
    val text: String,
    val timestamp: String,
    val likesCount: Int = 0,
    val isLiked: Boolean = false,
    val replies: List<Comment> = emptyList()
)

data class Story(
    val id: String,
    val author: User,
    val mediaUrl: String,
    val caption: String? = null,
    val hasUnseen: Boolean = true,
    val isLiveRoom: Boolean = false
)
