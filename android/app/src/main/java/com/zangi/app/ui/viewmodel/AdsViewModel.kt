package com.zangi.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zangi.app.data.model.AdConfig
import com.zangi.app.data.repository.AdsRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class AdsViewModel(
    private val repository: AdsRepository
) : ViewModel() {

    val adConfig: StateFlow<AdConfig> = repository.getAdConfigFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AdConfig())

    fun toggleAdsEnabled(enabled: Boolean) {
        viewModelScope.launch {
            repository.setAdsEnabled(enabled)
        }
    }

    fun updateConsent(consentObtained: Boolean) {
        viewModelScope.launch {
            repository.updateConsent(consentObtained)
        }
    }

    fun onRewardedAdWatched(coins: Int) {
        viewModelScope.launch {
            repository.recordRewardedCoinEarned(coins)
        }
    }
}
