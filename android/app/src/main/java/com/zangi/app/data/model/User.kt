package com.zangi.app.data.model

data class User(
    val id: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String,
    val bio: String,
    val isVerified: Boolean = false,
    val isFollowing: Boolean = false,
    val followersCount: Int = 0,
    val followingCount: Int = 0,
    val creatorCoins: Long = 0L,
    val languagePreference: String = "bn", // "bn" or "en"
    val badges: List<String> = emptyList()
)
