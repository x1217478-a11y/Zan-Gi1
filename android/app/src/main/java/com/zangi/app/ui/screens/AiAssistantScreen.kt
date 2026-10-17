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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zangi.app.data.model.AiAssistantMessage
import com.zangi.app.data.model.AiLanguage
import com.zangi.app.data.model.AiTaskType
import com.zangi.app.ui.theme.ZanGiPrimary
import com.zangi.app.ui.theme.ZanGiSecondary
import com.zangi.app.ui.viewmodel.AiAssistantViewModel

@Composable
fun AiAssistantScreen(
    viewModel: AiAssistantViewModel,
    isBengali: Boolean
) {
    val uiState by viewModel.uiState.collectAsState()
    val messages by viewModel.messages.collectAsState()
    val status by viewModel.serviceStatus.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Filled.AutoAwesome,
                        contentDescription = "AI Studio",
                        tint = ZanGiSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isBengali) "Zan-Gi AI ক্রিয়েটর সহকারী" else "Zan-Gi AI Creator Studio",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                }
                Text(
                    text = "${status.model} • ${if (status.isConfigured) "Active Proxy" else "Offline Demo Mode"}",
                    fontSize = 11.sp,
                    color = Color(0xFF64748B)
                )
            }

            // Language Selector
            Row {
                FilterChip(
                    selected = uiState.currentLanguage == AiLanguage.BENGALI,
                    onClick = { viewModel.setLanguage(AiLanguage.BENGALI) },
                    label = { Text("বাংলা", fontSize = 11.sp) }
                )
                Spacer(modifier = Modifier.width(6.dp))
                FilterChip(
                    selected = uiState.currentLanguage == AiLanguage.ENGLISH,
                    onClick = { viewModel.setLanguage(AiLanguage.ENGLISH) },
                    label = { Text("EN", fontSize = 11.sp) }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Quick Task Buttons
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            val tasks = listOf(
                AiTaskType.CAPTION_DRAFTING to (if (isBengali) "ক্যাপশন তৈরি" else "Draft Caption"),
                AiTaskType.HASHTAG_OPTIMIZATION to (if (isBengali) "হ্যাশট্যাগ বাছাই" else "Hashtags"),
                AiTaskType.SHORT_VIDEO_SCRIPT to (if (isBengali) "ভিডিও স্ক্রিপ্ট" else "Video Script"),
                AiTaskType.TRANSLATION to (if (isBengali) "অনুবাদ" else "Translate")
            )
            items(tasks) { (task, label) ->
                FilterChip(
                    selected = uiState.activeTask == task,
                    onClick = { viewModel.setTask(task) },
                    label = { Text(label, fontSize = 12.sp) }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Chat Message Log
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            reverseLayout = false
        ) {
            items(messages) { message ->
                AiMessageBubble(message = message)
                Spacer(modifier = Modifier.height(10.dp))
            }
        }

        if (uiState.isGenerating) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (isBengali) "AI চিন্তা করছে..." else "AI is drafting response...",
                    fontSize = 12.sp,
                    color = Color(0xFF64748B)
                )
            }
        }

        // Input Field
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = uiState.inputPrompt,
                onValueChange = { viewModel.onInputChanged(it) },
                placeholder = {
                    Text(
                        if (isBengali) "এখানে লিখুন (যেমন: ২০২৬ সালের নতুন টেক পোস্ট ক্যাপশন)..."
                        else "Ask for captions, scripts, or translations...",
                        fontSize = 13.sp
                    )
                },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(24.dp),
                singleLine = true
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(
                onClick = { viewModel.sendPrompt() },
                enabled = !uiState.isGenerating && uiState.inputPrompt.isNotBlank()
            ) {
                Icon(
                    Icons.Filled.Send,
                    contentDescription = "Send",
                    tint = ZanGiPrimary
                )
            }
        }
    }
}

@Composable
fun AiMessageBubble(message: AiAssistantMessage) {
    val isUser = message.sender == "user"

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Card(
            colors = CardDefaults.cardColors(
                containerColor = if (isUser) ZanGiPrimary else Color(0xFFF1F5F9)
            ),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth(if (isUser) 0.8f else 0.95f)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                if (!isUser) {
                    Text(
                        text = "Zan-Gi Copilot (${message.modelSignature})",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = ZanGiSecondary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }
                Text(
                    text = message.content,
                    fontSize = 13.sp,
                    lineHeight = 19.sp,
                    color = if (isUser) Color.White else Color(0xFF0F172A)
                )
            }
        }
    }
}
