package com.zangi.app.data.model

data class AdConfig(
    val adsEnabled: Boolean = true,
    val appId: String = "ca-app-pub-3940256099942544~3347511713", // Official Google Test App ID
    val bannerAdUnitId: String = "ca-app-pub-3940256099942544/6300978111", // Official Google Test Banner ID
    val interstitialAdUnitId: String = "ca-app-pub-3940256099942544/1033173712", // Official Google Test Interstitial ID
    val rewardedAdUnitId: String = "ca-app-pub-3940256099942544/5224354917", // Official Google Test Rewarded ID
    val nativeAdUnitId: String = "ca-app-pub-3940256099942544/2247696110", // Official Google Test Native ID
    val isTestMode: Boolean = true,
    val consentObtained: Boolean = true,
    val creatorRevenueSharePercentage: Int = 70,
    val interstitialCooldownSeconds: Int = 180,
    val ssvCallbackUrl: String = "https://api.zan-gi.app/api/ads/admob-ssv-callback"
)

enum class AdPlacement {
    FEED_BANNER,
    FEED_NATIVE_CARD,
    POST_CREATION_INTERSTITIAL,
    CREATOR_STUDIO_REWARDED_COINS
}
