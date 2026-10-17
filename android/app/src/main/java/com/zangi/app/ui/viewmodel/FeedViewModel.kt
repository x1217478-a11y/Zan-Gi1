package com.zangi.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zangi.app.data.model.Post
import com.zangi.app.data.model.PostType
import com.zangi.app.data.model.Story
import com.zangi.app.data.repository.FeedRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class FeedUiState(
    val isLoading: Boolean = false,
    val selectedTab: FeedTab = FeedTab.FOR_YOU,
    val errorMessage: String? = null,
    val isOffline: Boolean = false
)

enum class FeedTab(val titleEn: String, val titleBn: String) {
    FOR_YOU("For You", "আপনার জন্য"),
    FOLLOWING("Following", "অনুসরণ"),
    AI_TECH("AI & Tech", "এআই ও প্রযুক্তি"),
    CREATORS("Creator Pulse", "ক্রিয়েটর পালস")
}

class FeedViewModel(
    private val repository: FeedRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(FeedUiState())
    val uiState: StateFlow<FeedUiState> = _uiState.asStateFlow()

    val posts: StateFlow<List<Post>> = repository.getPostsFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val stories: StateFlow<List<Story>> = repository.getStoriesFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun selectTab(tab: FeedTab) {
        _uiState.value = _uiState.value.copy(selectedTab = tab)
    }

    fun onLikeClick(postId: String) {
        viewModelScope.launch {
            repository.toggleLike(postId)
        }
    }

    fun onBookmarkClick(postId: String) {
        viewModelScope.launch {
            repository.toggleBookmark(postId)
        }
    }

    fun onRefresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = repository.refreshFeed()
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                errorMessage = result.exceptionOrNull()?.message
            )
        }
    }

    fun createPost(content: String, postType: PostType, hashtags: List<String>) {
        viewModelScope.launch {
            repository.createPost(content, postType, hashtags)
        }
    }

    fun resetPreferences() {
        viewModelScope.launch {
            repository.resetTopicPreferences()
        }
    }
}
