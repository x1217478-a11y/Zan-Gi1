plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.zangi.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.zangi.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        // Demo & Backend Configuration flags
        buildConfigField("Boolean", "DEMO_MODE_DEFAULT", "true")
        buildConfigField("String", "AI_BACKEND_BASE_URL", "\"https://api.zan-gi.app/v1\"")

        // Google Mobile Ads (AdMob) Configuration: Defaults to Google official test IDs, overridden by env/project properties
        val envAdmobAppId = project.findProperty("ADMOB_APP_ID")?.toString() ?: System.getenv("ADMOB_APP_ID") ?: "ca-app-pub-3940256099942544~3347511713"
        val envAdmobBanner = project.findProperty("ADMOB_BANNER_UNIT_ID")?.toString() ?: System.getenv("ADMOB_BANNER_UNIT_ID") ?: "ca-app-pub-3940256099942544/6300978111"
        val envAdmobInterstitial = project.findProperty("ADMOB_INTERSTITIAL_UNIT_ID")?.toString() ?: System.getenv("ADMOB_INTERSTITIAL_UNIT_ID") ?: "ca-app-pub-3940256099942544/1033173712"
        val envAdmobNative = project.findProperty("ADMOB_NATIVE_UNIT_ID")?.toString() ?: System.getenv("ADMOB_NATIVE_UNIT_ID") ?: "ca-app-pub-3940256099942544/2247696110"
        val envAdmobRewarded = project.findProperty("ADMOB_REWARDED_UNIT_ID")?.toString() ?: System.getenv("ADMOB_REWARDED_UNIT_ID") ?: "ca-app-pub-3940256099942544/5224354917"
        val envAdmobIsTest = (System.getenv("ADMOB_IS_TEST_MODE") ?: "true").toBoolean()

        manifestPlaceholders["admobAppId"] = envAdmobAppId

        buildConfigField("String", "ADMOB_APP_ID", "\"$envAdmobAppId\"")
        buildConfigField("String", "ADMOB_BANNER_UNIT_ID", "\"$envAdmobBanner\"")
        buildConfigField("String", "ADMOB_INTERSTITIAL_UNIT_ID", "\"$envAdmobInterstitial\"")
        buildConfigField("String", "ADMOB_NATIVE_UNIT_ID", "\"$envAdmobNative\"")
        buildConfigField("String", "ADMOB_REWARDED_UNIT_ID", "\"$envAdmobRewarded\"")
        buildConfigField("Boolean", "ADMOB_IS_TEST_MODE", "$envAdmobIsTest")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug") // Replace with production keystore in CI/CD
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // AndroidX & Lifecycle
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.activity:activity-compose:1.10.1")

    // Jetpack Compose & Material 3
    val composeBom = platform("androidx.compose:compose-bom:2025.02.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3:1.3.1")
    implementation("androidx.compose.material:material-icons-extended")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    // Jetpack Navigation Compose
    implementation("androidx.navigation:navigation-compose:2.8.8")

    // Kotlin Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.1")

    // Image Loading (Async images in Jetpack Compose)
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Google Mobile Ads SDK (AdMob) & User Messaging Platform (UMP Consent)
    implementation("com.google.android.gms:play-services-ads:24.0.0")
    implementation("com.google.android.ump:user-messaging-platform:3.1.0")

    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
