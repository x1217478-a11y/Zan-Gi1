package com.zangi.app

import android.app.Application
import android.util.Log
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.RequestConfiguration

class ZanGiApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Zan-Gi Application initializing")
        initializeMobileAds()
    }

    private fun initializeMobileAds() {
        val testDeviceIds: List<String> = listOf(AdRequest.DEVICE_ID_EMULATOR)
        val configuration = RequestConfiguration.Builder()
            .setTestDeviceIds(testDeviceIds)
            .build()

        MobileAds.setRequestConfiguration(configuration)

        MobileAds.initialize(this) { initializationStatus ->
            for ((adapterClass, status) in initializationStatus.adapterStatusMap) {
                Log.d(
                    TAG,
                    "AdMob Adapter: $adapterClass, State: ${status.initializationState}"
                )
            }
        }
    }

    companion object {
        private const val TAG = "ZanGiApp"
    }
}
