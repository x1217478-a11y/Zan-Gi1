import React, { useState } from 'react';
import {
  FileCode,
  FolderTree,
  Copy,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Cpu,
  Layers,
  ExternalLink
} from 'lucide-react';

export const SourceInspector: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('MainActivity.kt');
  const [copied, setCopied] = useState(false);

  const fileTree = [
    {
      group: 'Gradle Build & Manifest',
      files: [
        { name: 'build.gradle.kts (Root)', path: 'android/build.gradle.kts', lang: 'kotlin' },
        { name: 'settings.gradle.kts', path: 'android/settings.gradle.kts', lang: 'kotlin' },
        { name: 'app/build.gradle.kts', path: 'android/app/build.gradle.kts', lang: 'kotlin' },
        { name: 'AndroidManifest.xml', path: 'android/app/src/main/AndroidManifest.xml', lang: 'xml' },
        { name: 'README.md', path: 'android/README.md', lang: 'markdown' }
      ]
    },
    {
      group: 'Core App & Navigation',
      files: [
        { name: 'ZanGiApplication.kt', path: 'android/app/src/main/java/com/zangi/app/ZanGiApplication.kt', lang: 'kotlin' },
        { name: 'MainActivity.kt', path: 'android/app/src/main/java/com/zangi/app/MainActivity.kt', lang: 'kotlin' },
        { name: 'Screen.kt (Navigation)', path: 'android/app/src/main/java/com/zangi/app/ui/navigation/Screen.kt', lang: 'kotlin' }
      ]
    },
    {
      group: 'Material 3 Design System',
      files: [
        { name: 'Theme.kt', path: 'android/app/src/main/java/com/zangi/app/ui/theme/Theme.kt', lang: 'kotlin' },
        { name: 'Color.kt', path: 'android/app/src/main/java/com/zangi/app/ui/theme/Color.kt', lang: 'kotlin' },
        { name: 'Type.kt', path: 'android/app/src/main/java/com/zangi/app/ui/theme/Type.kt', lang: 'kotlin' }
      ]
    },
    {
      group: 'Jetpack Compose Screens',
      files: [
        { name: 'HomeScreen.kt', path: 'android/app/src/main/java/com/zangi/app/ui/screens/HomeScreen.kt', lang: 'kotlin' },
        { name: 'AiAssistantScreen.kt', path: 'android/app/src/main/java/com/zangi/app/ui/screens/AiAssistantScreen.kt', lang: 'kotlin' },
        { name: 'ExploreScreen.kt', path: 'android/app/src/main/java/com/zangi/app/ui/screens/ExploreScreen.kt', lang: 'kotlin' },
        { name: 'CreatePostScreen.kt', path: 'android/app/src/main/java/com/zangi/app/ui/screens/CreatePostScreen.kt', lang: 'kotlin' },
        { name: 'MessagesScreen.kt', path: 'android/app/src/main/java/com/zangi/app/ui/screens/MessagesScreen.kt', lang: 'kotlin' },
        { name: 'ProfileScreen.kt', path: 'android/app/src/main/java/com/zangi/app/ui/screens/ProfileScreen.kt', lang: 'kotlin' },
        { name: 'SettingsScreen.kt', path: 'android/app/src/main/java/com/zangi/app/ui/screens/SettingsScreen.kt', lang: 'kotlin' },
        { name: 'SplashScreen.kt', path: 'android/app/src/main/java/com/zangi/app/ui/screens/SplashScreen.kt', lang: 'kotlin' }
      ]
    },
    {
      group: 'Google Mobile Ads & Monetization',
      files: [
        { name: 'ZanGiAdsManager.kt', path: 'android/app/src/main/java/com/zangi/app/ads/ZanGiAdsManager.kt', lang: 'kotlin' },
        { name: 'AdsRepository.kt', path: 'android/app/src/main/java/com/zangi/app/data/repository/AdsRepository.kt', lang: 'kotlin' },
        { name: 'AdsViewModel.kt', path: 'android/app/src/main/java/com/zangi/app/ui/viewmodel/AdsViewModel.kt', lang: 'kotlin' }
      ]
    },
    {
      group: 'Data Layer & Repositories',
      files: [
        { name: 'FeedRepository.kt', path: 'android/app/src/main/java/com/zangi/app/data/repository/FeedRepository.kt', lang: 'kotlin' },
        { name: 'AiRepository.kt', path: 'android/app/src/main/java/com/zangi/app/data/repository/AiRepository.kt', lang: 'kotlin' },
        { name: 'ChatRepository.kt', path: 'android/app/src/main/java/com/zangi/app/data/repository/ChatRepository.kt', lang: 'kotlin' },
        { name: 'Post.kt (Models)', path: 'android/app/src/main/java/com/zangi/app/data/model/Post.kt', lang: 'kotlin' },
        { name: 'AiAssistantModels.kt', path: 'android/app/src/main/java/com/zangi/app/data/model/AiAssistantModels.kt', lang: 'kotlin' }
      ]
    }
  ];

  // Code snippets for inspect preview
  const fileSnippets: Record<string, string> = {
    'MainActivity.kt': `package com.zangi.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.*
import com.zangi.app.ui.theme.ZanGiTheme

/**
 * Zan-Gi Native Android Single-Activity Architecture.
 * Targets Android 8.0+ up to Android 15 (API 35).
 * Built 100% with Jetpack Compose & Material 3.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ZanGiTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ZanGiAppRoot()
                }
            }
        }
    }
}`,
    'build.gradle.kts (Root)': `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}`,
    'app/build.gradle.kts': `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
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
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // Jetpack Compose BOM 2025/2026
    val composeBom = platform("androidx.compose:compose-bom:2025.02.00")
    implementation(composeBom)
    implementation("androidx.compose.material3:material3:1.3.1")
    implementation("androidx.navigation:navigation-compose:2.8.8")
    
    // Google Mobile Ads SDK (AdMob)
    implementation("com.google.android.gms:play-services-ads:24.0.0")
}`,
    'ZanGiAdsManager.kt': `package com.zangi.app.ads

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.gms.ads.*
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.rewarded.RewardedAd
import com.zangi.app.data.model.AdConfig

/**
 * Production-ready Ads Manager wrapping Google Mobile Ads SDK for Zan-Gi.
 * Features:
 * - Uses ONLY official Google test ad unit IDs in development
 * - Strict natural-transition interstitial timing (never on every click)
 * - Safe error handling (no app crashes on ad load failure or no-fill)
 * - Opt-in rewarded ads with verified callback
 */
class ZanGiAdsManager(private val context: Context) {
    val currentConfig = AdConfig(
        bannerAdUnitId = "ca-app-pub-3940256099942544/6300978111",
        interstitialAdUnitId = "ca-app-pub-3940256099942544/1033173712",
        rewardedAdUnitId = "ca-app-pub-3940256099942544/5224354917"
    )
}`,
    'AiAssistantScreen.kt': `package com.zangi.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.zangi.app.ui.viewmodel.AiAssistantViewModel

/**
 * Dedicated Bengali & English AI Assistant screen.
 * Connects securely to Zan-Gi server-side AI proxy.
 * Features:
 * - Content drafting, Bengali grammar check, captions, scripts
 * - Honest service status indication
 * - Zero private key exposure on client
 */
@Composable
fun AiAssistantScreen(viewModel: AiAssistantViewModel, isBengali: Boolean) {
    // Jetpack Compose reactive state collection
    val uiState by viewModel.uiState.collectAsState()
    val messages by viewModel.messages.collectAsState()
    val status by viewModel.serviceStatus.collectAsState()
    // ... UI implementation ...
}`
  };

  const currentCode =
    fileSnippets[selectedFile] ||
    `// File: ${selectedFile}\n// Please see /android directory for the complete pristine source file.\n// Created with full Kotlin & Jetpack Compose 2026 Material 3 conventions.`;

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl w-full mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <h2 className="text-lg font-bold text-slate-900">
              Zan-Gi Android Native Project Source Code
            </h2>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            The full production-grade native Android project is structured under the <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px]">/android/</code> directory with Kotlin Jetpack Compose, Material 3, ViewModels, Coroutines, and Google Mobile Ads SDK.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-slate-200 font-mono text-xs px-3 py-2 rounded-xl flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>./gradlew assembleDebug</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Code Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: File Tree Directory */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-4 max-h-[640px] overflow-y-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
            <FolderTree className="w-4 h-4 text-blue-600" />
            <span>Project Explorer (android/)</span>
          </div>

          <div className="space-y-4">
            {fileTree.map((section) => (
              <div key={section.group} className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {section.group}
                </span>
                <div className="space-y-1">
                  {section.files.map((file) => {
                    const isSelected = selectedFile === file.name;
                    return (
                      <button
                        key={file.name}
                        onClick={() => setSelectedFile(file.name)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 font-mono transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Code Editor & Viewer */}
        <div className="lg:col-span-8 bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 flex flex-col">
          {/* Header */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="font-mono text-slate-200 ml-2 font-bold">{selectedFile}</span>
            </div>

            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-[11px] transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer */}
          <div className="p-4 flex-1 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed max-h-[580px] overflow-y-auto">
            <pre>
              <code>{currentCode}</code>
            </pre>
          </div>

          {/* Footer Metadata */}
          <div className="bg-slate-950/80 px-4 py-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Kotlin 2.1 • Android 15 (SDK 35) • Jetpack Compose BOM 2025</span>
            <span className="text-emerald-400 font-semibold">100% Native Architecture</span>
          </div>
        </div>
      </div>
    </div>
  );
};
