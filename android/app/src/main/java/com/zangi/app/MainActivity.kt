package com.zangi.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.zangi.app.data.repository.DefaultAdsRepository
import com.zangi.app.data.repository.DefaultAiRepository
import com.zangi.app.data.repository.LocalDemoChatRepository
import com.zangi.app.data.repository.LocalDemoFeedRepository
import com.zangi.app.ui.navigation.Screen
import com.zangi.app.ui.navigation.bottomNavScreens
import com.zangi.app.ui.screens.AiAssistantScreen
import com.zangi.app.ui.screens.CreatePostScreen
import com.zangi.app.ui.screens.ExploreScreen
import com.zangi.app.ui.screens.HomeScreen
import com.zangi.app.ui.screens.MessagesScreen
import com.zangi.app.ui.screens.OnboardingScreen
import com.zangi.app.ui.screens.ProfileScreen
import com.zangi.app.ui.screens.SettingsScreen
import com.zangi.app.ui.screens.SplashScreen
import com.zangi.app.ui.theme.ZanGiPrimary
import com.zangi.app.ui.theme.ZanGiTheme
import com.zangi.app.ui.viewmodel.AdsViewModel
import com.zangi.app.ui.viewmodel.AiAssistantViewModel
import com.zangi.app.ui.viewmodel.FeedViewModel

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
}

@Composable
fun ZanGiAppRoot() {
    val navController = rememberNavController()
    var isBengali by remember { mutableStateOf(true) }

    // Repositories & Shared ViewModels
    val feedRepository = remember { LocalDemoFeedRepository() }
    val aiRepository = remember { DefaultAiRepository() }
    val adsRepository = remember { DefaultAdsRepository() }
    val chatRepository = remember { LocalDemoChatRepository() }

    val feedViewModel = remember { FeedViewModel(feedRepository) }
    val aiViewModel = remember { AiAssistantViewModel(aiRepository) }
    val adsViewModel = remember { AdsViewModel(adsRepository) }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val shouldShowBottomBar = currentRoute in bottomNavScreens.map { it.route }

    Scaffold(
        bottomBar = {
            if (shouldShowBottomBar) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 2.dp
                ) {
                    bottomNavScreens.forEach { screen ->
                        val selected = currentRoute == screen.route
                        NavigationBarItem(
                            icon = {
                                val icon = if (selected) screen.selectedIcon else screen.unselectedIcon
                                if (icon != null) {
                                    Icon(icon, contentDescription = screen.titleEn)
                                }
                            },
                            label = {
                                Text(if (isBengali) screen.titleBn else screen.titleEn)
                            },
                            selected = selected,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                                selectedIconColor = ZanGiPrimary
                            )
                        )
                    }
                }
            }
        },
        floatingActionButton = {
            if (currentRoute == Screen.Home.route) {
                FloatingActionButton(
                    onClick = { navController.navigate(Screen.Create.route) },
                    containerColor = ZanGiPrimary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                ) {
                    Icon(Icons.Filled.Add, contentDescription = "Create Post")
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Splash.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Splash.route) {
                SplashScreen(onFinished = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                })
            }
            composable(Screen.Onboarding.route) {
                OnboardingScreen(
                    onComplete = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Onboarding.route) { inclusive = true }
                        }
                    },
                    onLanguageToggled = { isBengali = !isBengali }
                )
            }
            composable(Screen.Home.route) {
                HomeScreen(
                    viewModel = feedViewModel,
                    adsViewModel = adsViewModel,
                    isBengali = isBengali,
                    onOpenSettings = { navController.navigate(Screen.Settings.route) },
                    onOpenSearch = { navController.navigate(Screen.Explore.route) },
                    onOpenAiStudio = { navController.navigate(Screen.AiAssistant.route) }
                )
            }
            composable(Screen.Explore.route) {
                ExploreScreen(isBengali = isBengali)
            }
            composable(Screen.Reels.route) {
                ExploreScreen(isBengali = isBengali)
            }
            composable(Screen.Create.route) {
                CreatePostScreen(
                    viewModel = feedViewModel,
                    isBengali = isBengali,
                    onDone = { navController.popBackStack() }
                )
            }
            composable(Screen.AiAssistant.route) {
                AiAssistantScreen(
                    viewModel = aiViewModel,
                    isBengali = isBengali
                )
            }
            composable(Screen.Messages.route) {
                MessagesScreen(
                    chatRepository = chatRepository,
                    isBengali = isBengali
                )
            }
            composable(Screen.Profile.route) {
                ProfileScreen(
                    isBengali = isBengali,
                    onOpenSettings = { navController.navigate(Screen.Settings.route) }
                )
            }
            composable(Screen.Settings.route) {
                SettingsScreen(
                    adsViewModel = adsViewModel,
                    isBengali = isBengali,
                    onToggleLanguage = { isBengali = !isBengali },
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
