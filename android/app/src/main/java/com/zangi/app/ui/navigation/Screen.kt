package com.zangi.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(
    val route: String,
    val titleEn: String,
    val titleBn: String,
    val selectedIcon: ImageVector? = null,
    val unselectedIcon: ImageVector? = null
) {
    object Splash : Screen("splash", "Splash", "স্প্ল্যাশ")
    object Onboarding : Screen("onboarding", "Onboarding", "পরিচিতি")
    
    // Primary Navigation Items (Feed, Reels, Create, AI, Profile)
    object Home : Screen("home", "Feed", "ফিড", Icons.Filled.Home, Icons.Outlined.Home)
    object Reels : Screen("reels", "Reels", "রিলস", Icons.Filled.AutoAwesome, Icons.Outlined.AutoAwesome)
    object Create : Screen("create", "Create", "পোস্ট")
    object AiAssistant : Screen("ai_assistant", "AI Studio", "এআই স্টুডিও", Icons.Filled.AutoAwesome, Icons.Outlined.AutoAwesome)
    object Profile : Screen("profile", "Profile", "প্রোফাইল", Icons.Filled.Person, Icons.Outlined.Person)

    // Secondary destinations
    object Explore : Screen("explore", "Explore", "এক্সপ্লোর", Icons.Filled.Explore, Icons.Outlined.Explore)
    object Messages : Screen("messages", "Messages", "বার্তা", Icons.Filled.ChatBubbleOutline, Icons.Outlined.ChatBubbleOutline)
    object Settings : Screen("settings", "Settings", "সেটিংস")
    object Notifications : Screen("notifications", "Notifications", "বিজ্ঞপ্তি")
    object AdsSettings : Screen("ads_settings", "Ads & Monetization", "বিজ্ঞাপন ও আয়")
}

val primaryTopScreens = listOf(
    Screen.Home,
    Screen.Reels,
    Screen.Create,
    Screen.AiAssistant,
    Screen.Profile
)

val bottomNavScreens = listOf(
    Screen.Home,
    Screen.Explore,
    Screen.AiAssistant,
    Screen.Messages,
    Screen.Profile
)
