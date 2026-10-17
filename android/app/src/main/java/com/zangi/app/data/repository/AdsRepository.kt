package com.zangi.app.data.repository

import com.zangi.app.data.model.AdConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

interface AdsRepository {
    fun getAdConfigFlow(): Flow<AdConfig>
    suspend fun setAdsEnabled(enabled: Boolean)
    suspend fun updateConsent(consentObtained: Boolean)
    suspend fun updateConfig(config: AdConfig)
    suspend fun recordRewardedCoinEarned(coins: Int): Long
}

class DefaultAdsRepository : AdsRepository {

    private val _adConfig = MutableStateFlow(
        AdConfig(
            adsEnabled = true,
            appId = "ca-app-pub-3940256099942544~3347511713", // Google Official Test App ID
            bannerAdUnitId = "ca-app-pub-3940256099942544/6300978111", // Google Mobile Ads Official Test Banner ID
            interstitialAdUnitId = "ca-app-pub-3940256099942544/1033173712", // Google Official Test Interstitial ID
            rewardedAdUnitId = "ca-app-pub-3940256099942544/5224354917", // Google Official Test Rewarded ID
            nativeAdUnitId = "ca-app-pub-3940256099942544/2247696110", // Google Official Test Native ID
            isTestMode = true,
            consentObtained = true,
            creatorRevenueSharePercentage = 70
        )
    )

    private var earnedCoinsAccumulator = 1420L

    override fun getAdConfigFlow(): Flow<AdConfig> = _adConfig.asStateFlow()

    override suspend fun setAdsEnabled(enabled: Boolean) {
        _adConfig.update { it.copy(adsEnabled = enabled) }
    }

    override suspend fun updateConsent(consentObtained: Boolean) {
        _adConfig.update { it.copy(consentObtained = consentObtained) }
    }

    override suspend fun updateConfig(config: AdConfig) {
        _adConfig.value = config
    }

    override suspend fun recordRewardedCoinEarned(coins: Int): Long {
        earnedCoinsAccumulator += coins
        return earnedCoinsAccumulator
    }
}
