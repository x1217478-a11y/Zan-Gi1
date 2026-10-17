# Zan-Gi — AI-Powered Social Universe (Android Native Project)

> **Tagline:** “Connect. Create. Imagine. Earn.”  
> **Target Platform:** Android 8.0+ (API 26+) up to Android 15 (API 35+)  
> **UI Architecture:** 100% Jetpack Compose with Material 3 Design System  
> **Language:** Kotlin 2.1+ with Coroutines & Kotlin Flow  

---

## 1. Project Overview & Architecture

Zan-Gi is an AI-first social media universe combining smart algorithmic feeds, creator studios, short-form video, direct messaging, live audio/video rooms, Bengali/English AI assistance, and responsible monetization via Google Mobile Ads.

### Directory Structure
```
android/
├── build.gradle.kts                     # Root build configuration
├── settings.gradle.kts                  # Submodule inclusions & repo resolutions
├── gradle.properties                    # AndroidX, JVM memory & Jetifier flags
└── app/
    ├── build.gradle.kts                 # Compose BOM, Coil, AdMob, Navigation
    └── src/main/
        ├── AndroidManifest.xml          # Permissions, AdMob App ID, MainActivity
        └── java/com/zangi/app/
            ├── ZanGiApplication.kt       # Application class & AdMob test init
            ├── MainActivity.kt           # Single-activity root & Navigation host
            ├── ads/
            │   └── ZanGiAdsManager.kt    # Official AdMob test lifecycle manager
            ├── data/
            │   ├── model/                # User, Post, Story, Comment, Chat, AI, AdConfig
            │   └── repository/           # FeedRepository, AiRepository, ChatRepository, AdsRepository
            ├── ui/
            │   ├── navigation/           # Screen, ZanGiNavGraph, bottomNavScreens
            │   ├── screens/              # Splash, Onboarding, Home, Explore, CreatePost, AiAssistant, Messages, Profile, Settings
            │   ├── theme/                # Color.kt, Theme.kt, Type.kt (Material 3)
            │   └── viewmodel/            # FeedViewModel, AiAssistantViewModel, AdsViewModel, ProfileViewModel
```

---

## 2. Build & Run Instructions

### Prerequisites
- Android Studio Ladybug (2024.2+) or newer
- JDK 17 (Eclipse Temurin or Android Studio bundled OpenJDK)
- Android SDK 35 (Android 15) installed

### Command Line Build
```bash
cd android

# Clean and compile debug APK
./gradlew assembleDebug

# Run unit tests
./gradlew test

# Install on connected emulator or physical device
./gradlew installDebug
```

The resulting debug APK will be generated at:
`app/build/outputs/apk/debug/app-debug.apk`

---

## 3. Google Mobile Ads (AdMob) Integration

This project adheres strictly to Google's testing and compliance policies:
- **Sample App ID (in AndroidManifest.xml):** `ca-app-pub-3940256099942544~3347511713`
- **Banner Ad Unit ID:** `ca-app-pub-3940256099942544/6300978111`
- **Interstitial Ad Unit ID:** `ca-app-pub-3940256099942544/1033173712` (with 180s cooldown between natural transitions)
- **Rewarded Ad Unit ID:** `ca-app-pub-3940256099942544/5224354917` (strictly opt-in with verified coin reward callback)
- **Native Ad Unit ID:** `ca-app-pub-3940256099942544/2247696110` (clearly marked with "Ad" / "Sponsored" badge)

*Warning: Production AdMob unit IDs must never be used in development. Do not generate artificial clicks or test live units.*

---

## 4. AI Assistant Service Contract

The mobile app accesses AI services through a server-side gateway:
- **Model:** `gemini-3.8-flash`
- **Client Security:** The Android client NEVER embeds Gemini API keys or service credentials. All generative queries route through `/api/ai/assistant`.
- **Honest State Handling:** When running offline or if the backend proxy has no configured API key, the client transparently switches to the local demo rule engine with explicit disclaimers.

---

## 5. Status Checklist

| Feature | State | Notes |
|---|---|---|
| Splash & Onboarding | ✅ Complete | Smooth transition, language selector |
| Bottom Navigation | ✅ Complete | 5 primary destinations (Home, Explore, AI, Messages, Profile) |
| Smart Feed UI | ✅ Complete | Algorithmic "For You", Chronological "Following", recommendation reasons |
| Bengali/English AI Studio | ✅ Complete | Captions, hashtags, scripts, translation |
| Ads Mode (AdMob Test Suite) | ✅ Complete | Banner, Interstitial cooldown, Rewarded opt-in |
| Messages & Audio Rooms | 🟡 Local Demo | Live streaming UI complete; requires WebRTC cluster for real-time delivery |
| Cloud Database & Auth | 🟡 Prepared | Repository interfaces ready for Firebase / Cloud SQL migration |
