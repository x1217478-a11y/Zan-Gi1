package com.zangi.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zangi.app.data.model.Post
import com.zangi.app.data.model.Story
import com.zangi.app.ui.theme.ZanGiPrimary
import com.zangi.app.ui.viewmodel.AdsViewModel
import com.zangi.app.ui.viewmodel.FeedTab
import com.zangi.app.ui.viewmodel.FeedViewModel

private val PageBg = Color(0xFFF7F9FF)
private val Ink = Color(0xFF17233D)
private val Muted = Color(0xFF77839A)
private val Purple = Color(0xFF713BFF)
private val Cyan = Color(0xFF22C7D8)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: FeedViewModel,
    adsViewModel: AdsViewModel,
    isBengali: Boolean,
    onOpenSettings: () -> Unit,
    onOpenSearch: () -> Unit,
    onOpenAiStudio: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val posts by viewModel.posts.collectAsState()
    val stories by viewModel.stories.collectAsState()
    val adConfig by adsViewModel.adConfig.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PageBg)
    ) {
        TopAppBar(
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(13.dp))
                            .background(
                                Brush.linearGradient(
                                    listOf(
                                        Color(0xFF087BFF),
                                        Purple
                                    )
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "Z",
                            color = Color.White,
                            fontSize = 23.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    Spacer(Modifier.width(9.dp))

                    Column {
                        Text(
                            "Zan-Gi",
                            color = ZanGiPrimary,
                            fontSize = 21.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        Text(
                            "AI Universe",
                            color = Muted,
                            fontSize = 10.sp
                        )
                    }
                }
            },
            actions = {
                IconButton(onClick = onOpenSearch) {
                    Icon(
                        Icons.Filled.Search,
                        contentDescription = "Search",
                        tint = Ink
                    )
                }
                IconButton(onClick = onOpenSettings) {
                    Icon(
                        Icons.Filled.Settings,
                        contentDescription = "Settings",
                        tint = Ink
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = PageBg
            )
        )

        ScrollableTabRow(
            selectedTabIndex = uiState.selectedTab.ordinal,
            edgePadding = 12.dp,
            containerColor = PageBg,
            divider = {},
            indicator = { _ -> }
        ) {
            FeedTab.values().forEach { tab ->
                val selected = uiState.selectedTab == tab

                Tab(
                    selected = selected,
                    onClick = { viewModel.selectTab(tab) },
                    modifier = Modifier.padding(horizontal = 3.dp),
                    text = {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(22.dp))
                                .background(
                                    if (selected) {
                                        Brush.horizontalGradient(
                                            listOf(
                                                Color(0xFF087BFF),
                                                Purple
                                            )
                                        )
                                    } else {
                                        Brush.horizontalGradient(
                                            listOf(PageBg, PageBg)
                                        )
                                    }
                                )
                                .padding(
                                    horizontal = 15.dp,
                                    vertical = 9.dp
                                )
                        ) {
                            Text(
                                if (isBengali) tab.titleBn else tab.titleEn,
                                color = if (selected) Color.White else Ink,
                                fontWeight = if (selected) {
                                    FontWeight.Bold
                                } else {
                                    FontWeight.Medium
                                },
                                fontSize = 12.sp
                            )
                        }
                    }
                )
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            item {
                StoriesRow(stories = stories)
            }

            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Color.White)
                        .clickable { onOpenAiStudio() }
                        .padding(15.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFEDE7FF)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("✦", color = Purple, fontSize = 25.sp)
                    }

                    Spacer(Modifier.width(11.dp))

                    Column(Modifier.weight(1f)) {
                        Text(
                            if (isBengali) "Zan-Gi AI Studio"
                            else "Zan-Gi AI Studio",
                            color = Ink,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Text(
                            if (isBengali) "AI-এর সঙ্গে তৈরি করুন"
                            else "Create something with AI",
                            color = Muted,
                            fontSize = 12.sp
                        )
                    }

                    Text(
                        "↗",
                        color = Purple,
                        fontSize = 23.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 7.dp)
                        .clip(RoundedCornerShape(22.dp))
                        .background(
                            Brush.linearGradient(
                                listOf(
                                    Color(0xFF792BFF),
                                    Color(0xFF235DFF),
                                    Color(0xFF167CEB)
                                )
                            )
                        )
                        .padding(19.dp)
                ) {
                    Text(
                        "🔥 ZAN-GI AI COMMUNITY PULSE",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.ExtraBold
                    )

                    Spacer(Modifier.height(9.dp))

                    Text(
                        if (isBengali) {
                            "AI, ক্রিয়েটর ও প্রযুক্তি নিয়ে কমিউনিটির পোস্ট আবিষ্কার করুন।"
                        } else {
                            "Discover community posts about AI, creators and technology."
                        },
                        color = Color.White,
                        fontSize = 13.sp,
                        lineHeight = 20.sp
                    )

                    Spacer(Modifier.height(13.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        listOf("#বাংলাAI", "#Creator", "#ZanGi").forEach { tag ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(Color(0x35FFFFFF))
                                    .padding(
                                        horizontal = 9.dp,
                                        vertical = 6.dp
                                    )
                            ) {
                                Text(
                                    tag,
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }

            if (uiState.isLoading) {
                item {
                    LinearProgressIndicator(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    )
                }
            }

            uiState.errorMessage?.let { error ->
                item {
                    Text(
                        text = error,
                        color = Color(0xFFB42318),
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }

            if (posts.isEmpty() && !uiState.isLoading) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("✦", color = Purple, fontSize = 38.sp)
                        Spacer(Modifier.height(8.dp))
                        Text(
                            if (isBengali) "এখনো কোনো পোস্ট নেই"
                            else "No posts yet",
                            color = Ink,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            if (isBengali) "পরে আবার চেষ্টা করুন"
                            else "Check back later",
                            color = Muted,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            itemsIndexed(posts, key = { _, post -> post.id }) { index, post ->
                PostCard(
                    post = post,
                    onLike = { viewModel.onLikeClick(post.id) },
                    onBookmark = { viewModel.onBookmarkClick(post.id) }
                )

                Spacer(Modifier.height(12.dp))

                if (adConfig.adsEnabled && index == 1) {
                    NativeAdCard(
                        nativeUnitId = adConfig.nativeAdUnitId,
                        isBengali = isBengali
                    )
                    Spacer(Modifier.height(12.dp))
                }
            }
        }
    }
}

@Composable
fun StoriesRow(stories: List<Story>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(vertical = 12.dp)
    ) {
        Text(
            "Stories",
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            fontWeight = FontWeight.Bold,
            color = Ink,
            fontSize = 15.sp
        )

        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            items(stories, key = { it.id }) { story ->
                Column(
                    modifier = Modifier.width(68.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(66.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    listOf(
                                        Color(0xFF087BFF),
                                        Purple,
                                        Cyan
                                    )
                                )
                            )
                            .padding(3.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFE5EAF5)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            story.author.displayName
                                .firstOrNull()
                                ?.uppercase() ?: "Z",
                            color = Purple,
                            fontWeight = FontWeight.Bold,
                            fontSize = 23.sp
                        )
                    }

                    Spacer(Modifier.height(5.dp))

                    Text(
                        story.author.displayName,
                        maxLines = 1,
                        color = Ink,
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}

@Composable
fun PostCard(
    post: Post,
    onLike: () -> Unit,
    onBookmark: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            post.recommendationReason?.let { reason ->
                Text(
                    "💡 $reason",
                    color = Muted,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(bottom = 10.dp)
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFFBFE7FF), Color(0xFFE4D5FF))
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        post.author.displayName
                            .firstOrNull()
                            ?.uppercase() ?: "Z",
                        color = Purple,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(Modifier.width(10.dp))

                Column(Modifier.weight(1f)) {
                    Text(
                        post.author.displayName,
                        color = Ink,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Text(
                        "@${post.author.username} · ${post.timestamp}",
                        color = Muted,
                        fontSize = 11.sp
                    )
                }

                if (post.author.isVerified) {
                    Text("✓", color = Color(0xFF087BFF), fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(13.dp))

            Text(
                post.content,
                color = Ink,
                fontSize = 14.sp,
                lineHeight = 22.sp
            )

            if (post.hashtags.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Text(
                    post.hashtags.joinToString(" ") { "#$it" },
                    color = Color(0xFF286BEE),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = Color(0xFFF0F2F8))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onLike) {
                        Icon(
                            if (post.isLiked) Icons.Filled.Favorite
                            else Icons.Filled.FavoriteBorder,
                            contentDescription = "Like",
                            tint = if (post.isLiked) Color(0xFFEF476F) else Muted
                        )
                    }
                    Text("${post.likesCount}", color = Muted, fontSize = 12.sp)

                    Spacer(Modifier.width(8.dp))

                    Icon(
                        Icons.Filled.ChatBubbleOutline,
                        contentDescription = "Comments",
                        tint = Muted
                    )
                    Spacer(Modifier.width(5.dp))
                    Text("${post.commentsCount}", color = Muted, fontSize = 12.sp)

                    Spacer(Modifier.width(14.dp))

                    Icon(
                        Icons.Filled.Share,
                        contentDescription = "Share",
                        tint = Muted
                    )
                }

                IconButton(onClick = onBookmark) {
                    Icon(
                        if (post.isSaved) Icons.Filled.Bookmark
                        else Icons.Filled.BookmarkBorder,
                        contentDescription = "Save post",
                        tint = if (post.isSaved) Purple else Muted
                    )
                }
            }
        }
    }
}

@Composable
fun NativeAdCard(nativeUnitId: String, isBengali: Boolean) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFEEF3FF)
        )
    ) {
        Row(
            modifier = Modifier.padding(15.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        Brush.linearGradient(listOf(Color(0xFF087BFF), Purple))
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text("AD", color = Color.White, fontWeight = FontWeight.Bold)
            }

            Spacer(Modifier.width(10.dp))

            Column(Modifier.weight(1f)) {
                Text(
                    if (isBengali) "স্পনসরড বিজ্ঞাপন"
                    else "Sponsored",
                    color = Ink,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
                Text(
                    if (isBengali) "বিজ্ঞাপন ইউনিট: ${nativeUnitId.take(16)}…"
                    else "Ad unit: ${nativeUnitId.take(16)}…",
                    color = Muted,
                    fontSize = 10.sp
                )
            }
        }
    }
}
