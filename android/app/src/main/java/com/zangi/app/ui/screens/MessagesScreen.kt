package com.zangi.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zangi.app.data.repository.ChatRepository
import com.zangi.app.ui.theme.ZanGiPrimary

@Composable
fun MessagesScreen(
    chatRepository: ChatRepository,
    isBengali: Boolean
) {
    val conversations by chatRepository.getConversationsFlow().collectAsState(initial = emptyList())
    val liveRooms by chatRepository.getLiveRoomsFlow().collectAsState(initial = emptyList())

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp)
    ) {
        Text(
            text = if (isBengali) "বার্তা ও লাইভ রুমস" else "Messages & Creator Rooms",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(modifier = Modifier.fillMaxSize()) {
            // Live Creator Audio Rooms
            item {
                Text(
                    text = if (isBengali) "🎙️ সরাসরি লাইভ রুম (অডিও)" else "🎙️ Live Audio Rooms",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF475569)
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            items(liveRooms) { room ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = "LIVE NOW • ${room.activeListeners} listening", fontSize = 11.sp, color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                            Text(text = "Preview", fontSize = 11.sp, color = Color(0xFF64748B))
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = room.title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(text = "Host: ${room.host.displayName}", fontSize = 12.sp, color = Color(0xFF64748B))
                    }
                }
            }

            // Direct Chats
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = if (isBengali) "💬 প্রত্যক্ষ বার্তা" else "💬 Direct Conversations",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF475569)
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            items(conversations) { conv ->
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
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFE2E8F0))
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(text = conv.participant.displayName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Text(text = conv.lastMessageTimestamp, fontSize = 11.sp, color = Color(0xFF94A3B8))
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = conv.lastMessage,
                                fontSize = 12.sp,
                                color = Color(0xFF64748B),
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }
    }
}
