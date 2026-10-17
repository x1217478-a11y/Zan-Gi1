package com.zangi.app.data.repository

import com.zangi.app.data.model.Comment
import com.zangi.app.data.model.Post
import com.zangi.app.data.model.PostType
import com.zangi.app.data.model.Story
import com.zangi.app.data.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

interface FeedRepository {
    fun getPostsFlow(): Flow<List<Post>>
    fun getStoriesFlow(): Flow<List<Story>>
    suspend fun refreshFeed(): Result<Unit>
    suspend fun toggleLike(postId: String)
    suspend fun toggleBookmark(postId: String)
    suspend fun addComment(postId: String, commentText: String): Result<Comment>
    suspend fun createPost(content: String, postType: PostType, hashtags: List<String>): Result<Post>
    suspend fun resetTopicPreferences()
}

/**
 * Local demo implementation of FeedRepository with realistic sample data
 * clearly marked as [isDemoData = true].
 */
class LocalDemoFeedRepository : FeedRepository {

    private val currentUser = User(
        id = "user_me",
        username = "fahim_ai",
        displayName = "Fahim Ahmed",
        avatarUrl = "/src/assets/images/zangi_creator_tech_1791614790487.jpg",
        bio = "Building the future of AI & Social in Bangladesh. Connect. Create. Imagine. Earn. 🇧🇩",
        isVerified = true,
        followersCount = 14820,
        followingCount = 328,
        creatorCoins = 1420L,
        languagePreference = "bn"
    )

    private val creatorNusrat = User(
        id = "user_nusrat",
        username = "nusrat_visuals",
        displayName = "Nusrat Jahan",
        avatarUrl = "/src/assets/images/zangi_creator_art_1791614801925.jpg",
        bio = "Digital artist & 3D animator | Exploring AI generative tools with Bengali heritage motifs",
        isVerified = true,
        followersCount = 28400,
        followingCount = 142,
        creatorCoins = 3850L
    )

    private val initialPosts = listOf(
        Post(
            id = "post_1",
            author = currentUser,
            content = "স্বাগতম Zan-Gi তে! 🚀 এটি আমাদের প্রথম AI-ফার্স্ট সামাজিক প্ল্যাটফর্ম। এখানে বাংলা ও ইংরেজি উভয় ভাষায় তাৎক্ষণিক AI ক্রিয়েটর টুলস ব্যবহার করতে পারবেন। আপনাদের অভিজ্ঞতা কেমন?",
            postType = PostType.IMAGE,
            mediaUrl = "/src/assets/images/zangi_feed_cybercity_1791614814919.jpg",
            timestamp = "১০ মিনিট আগে",
            likesCount = 428,
            isLiked = false,
            commentsCount = 54,
            sharesCount = 31,
            hashtags = listOf("ZanGiBD", "AIক্রিয়েটর", "ঢাকাটেক"),
            isAiAssisted = true,
            recommendationReason = "Because you follow Tech & AI Creators in Dhaka",
            isDemoData = true
        ),
        Post(
            id = "post_2",
            author = creatorNusrat,
            content = "Captured this peaceful sunrise over the Meghna delta during our weekend drone shoot. Combining native nature textures with generative ambient soundscapes in Zan-Gi Studio! 🌿✨",
            postType = PostType.IMAGE,
            mediaUrl = "/src/assets/images/zangi_feed_nature_1791614825382.jpg",
            timestamp = "১ ঘণ্টা আগে",
            likesCount = 892,
            isLiked = true,
            commentsCount = 76,
            sharesCount = 65,
            hashtags = listOf("BeautifulBangladesh", "NatureVisuals", "CreatorStudio"),
            isAiAssisted = false,
            recommendationReason = "Popular in Visual Arts & Photography",
            isDemoData = true
        ),
        Post(
            id = "post_3",
            author = User(
                id = "user_ad",
                username = "sponsored_partner",
                displayName = "Google Mobile Ads Partner",
                avatarUrl = "/src/assets/images/zangi_creator_tech_1791614790487.jpg",
                bio = "Official AdMob Test Ad Placement",
                isVerified = false
            ),
            content = "Sample Native Ad: Test your mobile monetization pipeline with Google Mobile Ads SDK (Ad Unit: ca-app-pub-3940256099942544/2247696110). Supports banner, native, and rewarded units.",
            postType = PostType.SPONSORED_NATIVE_AD,
            timestamp = "Sponsored",
            likesCount = 0,
            commentsCount = 0,
            sharesCount = 0,
            recommendationReason = "Sponsored Demonstration",
            isDemoData = true
        )
    )

    private val initialStories = listOf(
        Story("story_1", currentUser, "/src/assets/images/zangi_creator_tech_1791614790487.jpg", "Studio Setup 2026", hasUnseen = false),
        Story("story_2", creatorNusrat, "/src/assets/images/zangi_creator_art_1791614801925.jpg", "Painting live tonight!", hasUnseen = true),
        Story("story_3", currentUser, "/src/assets/images/zangi_feed_cybercity_1791614814919.jpg", "Dhaka Night Lights", hasUnseen = true)
    )

    private val _postsState = MutableStateFlow(initialPosts)
    private val _storiesState = MutableStateFlow(initialStories)

    override fun getPostsFlow(): Flow<List<Post>> = _postsState.asStateFlow()
    override fun getStoriesFlow(): Flow<List<Story>> = _storiesState.asStateFlow()

    override suspend fun refreshFeed(): Result<Unit> {
        return Result.success(Unit)
    }

    override suspend fun toggleLike(postId: String) {
        _postsState.update { list ->
            list.map { post ->
                if (post.id == postId) {
                    val newIsLiked = !post.isLiked
                    val newCount = if (newIsLiked) post.likesCount + 1 else (post.likesCount - 1).coerceAtLeast(0)
                    post.copy(isLiked = newIsLiked, likesCount = newCount)
                } else post
            }
        }
    }

    override suspend fun toggleBookmark(postId: String) {
        _postsState.update { list ->
            list.map { post ->
                if (post.id == postId) post.copy(isSaved = !post.isSaved) else post
            }
        }
    }

    override suspend fun addComment(postId: String, commentText: String): Result<Comment> {
        val newComment = Comment(
            id = "c_${System.currentTimeMillis()}",
            author = currentUser,
            text = commentText,
            timestamp = "এইমাত্র"
        )
        _postsState.update { list ->
            list.map { post ->
                if (post.id == postId) post.copy(commentsCount = post.commentsCount + 1) else post
            }
        }
        return Result.success(newComment)
    }

    override suspend fun createPost(
        content: String,
        postType: PostType,
        hashtags: List<String>
    ): Result<Post> {
        val newPost = Post(
            id = "post_${System.currentTimeMillis()}",
            author = currentUser,
            content = content,
            postType = postType,
            mediaUrl = if (postType == PostType.IMAGE) "/src/assets/images/zangi_feed_cybercity_1791614814919.jpg" else null,
            timestamp = "এইমাত্র",
            likesCount = 0,
            commentsCount = 0,
            sharesCount = 0,
            hashtags = hashtags,
            isAiAssisted = true,
            recommendationReason = "Posted by you",
            isDemoData = true
        )
        _postsState.update { listOf(newPost) + it }
        return Result.success(newPost)
    }

    override suspend fun resetTopicPreferences() {
        _postsState.value = initialPosts
    }
}
