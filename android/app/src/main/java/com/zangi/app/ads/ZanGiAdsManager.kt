package com.zangi.app.ads

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdLoader
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.RequestConfiguration
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.nativead.NativeAd
import com.google.android.gms.ads.nativead.NativeAdOptions
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.gms.ads.rewarded.ServerSideVerificationOptions
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import com.zangi.app.data.model.AdConfig
import java.util.UUID

class ZanGiAdsManager(private val context: Context) {

    private var interstitialAd: InterstitialAd? = null
    private var rewardedAd: RewardedAd? = null
    private var lastInterstitialShownTimestamp: Long = 0L

    var currentConfig: AdConfig = AdConfig()
        private set

    init {
        configureTestDevices()
        preloadInterstitial()
        preloadRewarded()
    }

    fun updateConfig(config: AdConfig) {
        currentConfig = config
        preloadInterstitial()
        preloadRewarded()
    }

    private fun configureTestDevices() {
        try {
            val testDeviceIds: List<String> = listOf(AdRequest.DEVICE_ID_EMULATOR)
            val configuration = RequestConfiguration.Builder()
                .setTestDeviceIds(testDeviceIds)
                .build()
            MobileAds.setRequestConfiguration(configuration)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to configure test devices: ${e.message}")
        }
    }

    fun initializeConsent(activity: Activity, onConsentCompleted: (Boolean) -> Unit) {
        val params = ConsentRequestParameters.Builder()
            .setTagForUnderAgeOfConsent(false)
            .build()

        val consentInformation =
            UserMessagingPlatform.getConsentInformation(activity)

        consentInformation.requestConsentInfoUpdate(
            activity,
            params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { error ->
                    if (error != null) {
                        Log.w(TAG, "Consent form error: ${error.message}")
                    }
                    onConsentCompleted(consentInformation.canRequestAds())
                }
            },
            { error ->
                Log.w(TAG, "Consent request failed: ${error.message}")
                onConsentCompleted(consentInformation.canRequestAds())
            }
        )
    }

    fun preloadInterstitial() {
        if (!currentConfig.adsEnabled) return

        InterstitialAd.load(
            context,
            currentConfig.interstitialAdUnitId,
            AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                    Log.d(TAG, "Interstitial ad loaded")
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitialAd = null
                    Log.w(TAG, "Interstitial load failed: ${error.message}")
                }
            }
        )
    }

    fun showInterstitialIfAllowed(activity: Activity, onDismiss: () -> Unit) {
        val now = System.currentTimeMillis()
        val cooldown = currentConfig.interstitialCooldownSeconds * 1000L

        if (now - lastInterstitialShownTimestamp < cooldown) {
            onDismiss()
            return
        }

        val ad = interstitialAd
        if (ad == null || !currentConfig.adsEnabled) {
            onDismiss()
            preloadInterstitial()
            return
        }

        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                interstitialAd = null
                lastInterstitialShownTimestamp = System.currentTimeMillis()
                preloadInterstitial()
                onDismiss()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                interstitialAd = null
                preloadInterstitial()
                onDismiss()
            }
        }
        ad.show(activity)
    }

    fun preloadRewarded() {
        if (!currentConfig.adsEnabled) return

        RewardedAd.load(
            context,
            currentConfig.rewardedAdUnitId,
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    rewardedAd = ad
                    Log.d(TAG, "Rewarded ad loaded")
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    rewardedAd = null
                    Log.w(TAG, "Rewarded ad load failed: ${error.message}")
                }
            }
        )
    }

    fun showRewardedAd(
        activity: Activity,
        userId: String? = null,
        onRewardEarned: (amount: Int, customData: String) -> Unit,
        onAdClosed: () -> Unit
    ) {
        val ad = rewardedAd
        if (ad == null || !currentConfig.adsEnabled) {
            preloadRewarded()
            onAdClosed()
            return
        }

        val transactionId =
            "zangi_ssv_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(8)}"

        if (!userId.isNullOrBlank()) {
            val options = ServerSideVerificationOptions.Builder()
                .setUserId(userId)
                .setCustomData(transactionId)
                .build()
            ad.setServerSideVerificationOptions(options)
        }

        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                rewardedAd = null
                preloadRewarded()
                onAdClosed()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                rewardedAd = null
                preloadRewarded()
                onAdClosed()
            }
        }

        ad.show(activity) { reward ->
            onRewardEarned(reward.amount, transactionId)
        }
    }

    fun loadNativeAd(
        onAdLoaded: (NativeAd) -> Unit,
        onAdFailed: (String) -> Unit
    ) {
        if (!currentConfig.adsEnabled) {
            onAdFailed("Ads are disabled in configuration")
            return
        }

        val loader = AdLoader.Builder(context, currentConfig.nativeAdUnitId)
            .forNativeAd { ad ->
                onAdLoaded(ad)
            }
            .withAdListener(object : AdListener() {
                override fun onAdFailedToLoad(error: LoadAdError) {
                    onAdFailed(error.message)
                }
            })
            .withNativeAdOptions(
                NativeAdOptions.Builder()
                    .setAdChoicesPlacement(NativeAdOptions.ADCHOICES_TOP_RIGHT)
                    .build()
            )
            .build()

        loader.loadAd(AdRequest.Builder().build())
    }

    companion object {
        private const val TAG = "ZanGiAdsManager"
    }
}
