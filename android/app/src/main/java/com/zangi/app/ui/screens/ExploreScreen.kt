package com.zangi.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zangi.app.ui.theme.ZanGiPrimary

@Composable
fun ExploreScreen(isBengali: Boolean) {
    var searchQuery by remember { mutableStateOf("") }

    val trendingTags = listOf(
        "#ZanGiBD" to "14.2K posts",
        "#বাংলাAI" to "9.8K posts",
        "#DhakaTech2026" to "6.4K posts",
        "#CreatorEconomy" to "5.1K posts",
        "#DigitalArt" to "4.2K posts"
    )

    val communities = listOf(
        "Dhaka AI Creators Club" to "4.2K members",
        "Bengali 3D & VFX Universe" to "2.8K members",
        "Android Jetpack Compose Devs" to "1.9K members"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp)
    ) {
        // Search bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = {
                Text(
                    if (isBengali) "টপিক, হ্যাশট্যাগ বা ক্রিয়েটর খুঁজুন..." else "Search creators, hashtags, rooms...",
                    fontSize = 13.sp
                )
            },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = "Search", tint = Color(0xFF64748B)) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(20.dp))

        LazyColumn(modifier = Modifier.fillMaxSize()) {
            item {
                Text(
                    text = if (isBengali) "🔥 ট্রেন্ডিং হ্যাশট্যাগ" else "🔥 Trending Topics",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Spacer(modifier = Modifier.height(10.dp))
            }

            items(trendingTags) { (tag, count) ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFAFBFC)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = tag, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = ZanGiPrimary)
                            Text(text = count, fontSize = 12.sp, color = Color(0xFF64748B))
                        }
                        Text(text = "Trending", fontSize = 11.sp, color = Color(0xFF94A3B8))
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = if (isBengali) "👥 জনপ্রিয় কমিউনিটি" else "👥 Active Communities",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Spacer(modifier = Modifier.height(10.dp))
            }

            items(communities) { (title, members) ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFAFBFC)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Text(text = members, fontSize = 12.sp, color = Color(0xFF64748B))
                        }
                    }
                }
            }
        }
    }
}
