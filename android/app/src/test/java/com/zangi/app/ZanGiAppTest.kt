package com.zangi.app

import com.zangi.app.data.model.AdConfig
import com.zangi.app.data.model.AiLanguage
import com.zangi.app.data.model.AiTaskType
import com.zangi.app.data.model.PostType
import com.zangi.app.data.repository.DefaultAdsRepository
import com.zangi.app.data.repository.DefaultAiRepository
import com.zangi.app.data.repository.LocalDemoFeedRepository
import com.zangi.app.ui.navigation.Screen
import com.zangi.app.ui.navigation.bottomNavScreens
import com.zangi.app.ui.viewmodel.AdsViewModel
import com.zangi.app.ui.viewmodel.AiAssistantViewModel
import com.zangi.app.ui.viewmodel.FeedTab
import com.zangi.app.ui.viewmodel.FeedViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ZanGiAppTest {

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testAdConfigDefaults() {
        val config = AdConfig()
        assertTrue(config.adsEnabled)
        assertTrue(config.isTestMode)
        assertEquals("ca-app-pub-3940256099942544~3347511713", config.appId)
        assertEquals("ca-app-pub-3940256099942544/6300978111", config.bannerAdUnitId)
        assertEquals(70, config.creatorRevenueSharePercentage)
    }

    @Test
    fun testNavigationDestinations() {
        assertEquals(5, bottomNavScreens.size)
        assertTrue(bottomNavScreens.contains(Screen.Home))
        assertTrue(bottomNavScreens.contains(Screen.Explore))
        assertTrue(bottomNavScreens.contains(Screen.AiAssistant))
        assertTrue(bottomNavScreens.contains(Screen.Messages))
        assertTrue(bottomNavScreens.contains(Screen.Profile))
    }

    @Test
    fun testFeedRepositoryAndViewModel() = runTest {
        val repo = LocalDemoFeedRepository()
        val viewModel = FeedViewModel(repo)

        assertNotNull(viewModel.posts.value)
        assertTrue(viewModel.posts.value.isNotEmpty())

        val firstPostId = viewModel.posts.value.first().id
        val initialLike = viewModel.posts.value.first().isLiked
        viewModel.onLikeClick(firstPostId)

        viewModel.selectTab(FeedTab.CREATORS)
        assertEquals(FeedTab.CREATORS, viewModel.uiState.value.selectedTab)
    }

    @Test
    fun testAdsRepositoryAndViewModel() = runTest {
        val repo = DefaultAdsRepository()
        val viewModel = AdsViewModel(repo)

        assertTrue(viewModel.adConfig.value.adsEnabled)
        viewModel.toggleAdsEnabled(false)
        repo.setAdsEnabled(false)
        assertFalse(repo.getAdConfigFlow().first().adsEnabled)
    }

    @Test
    fun testAiAssistantRepository() = runTest {
        val repo = DefaultAiRepository()
        val viewModel = AiAssistantViewModel(repo)

        viewModel.setLanguage(AiLanguage.BENGALI)
        assertEquals(AiLanguage.BENGALI, viewModel.uiState.value.currentLanguage)

        viewModel.setTask(AiTaskType.CAPTION_DRAFTING)
        assertEquals(AiTaskType.CAPTION_DRAFTING, viewModel.uiState.value.activeTask)

        val result = repo.sendMessage(
            prompt = "টেক পোস্টের জন্য সুন্দর ক্যাপশন",
            taskType = AiTaskType.CAPTION_DRAFTING,
            language = AiLanguage.BENGALI
        )

        assertTrue(result.isSuccess)
        val reply = result.getOrNull()
        assertNotNull(reply)
        assertTrue(reply!!.content.isNotEmpty())
    }
}
