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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
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
import com.zangi.app.data.model.PostType
import com.zangi.app.ui.theme.ZanGiPrimary
import com.zangi.app.ui.theme.ZanGiSecondary
import com.zangi.app.ui.viewmodel.FeedViewModel

@Composable
fun CreatePostScreen(
    viewModel: FeedViewModel,
    isBengali: Boolean,
    onDone: () -> Unit
) {
    var content by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf(PostType.TEXT) }
    var hashtagInput by remember { mutableStateOf("ZanGiBD, CreatorStudio") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(
                text = if (isBengali) "নতুন পোস্ট তৈরি করুন" else "Create New Post",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(12.dp))

            // Post type selector
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = selectedType == PostType.TEXT,
                    onClick = { selectedType = PostType.TEXT },
                    label = { Text("Text Post") }
                )
                FilterChip(
                    selected = selectedType == PostType.IMAGE,
                    onClick = { selectedType = PostType.IMAGE },
                    label = { Text("Photo") }
                )
                FilterChip(
                    selected = selectedType == PostType.SHORT_VIDEO,
                    onClick = { selectedType = PostType.SHORT_VIDEO },
                    label = { Text("Short Video") }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = content,
                onValueChange = { content = it },
                placeholder = {
                    Text(
                        if (isBengali) "আপনার চিন্তা শেয়ার করুন... (AI সহকারীর পরামর্শ নিতে ডানপাশের আইকনে ট্যাপ করুন)"
                        else "What are you imagining today?..."
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp),
                shape = RoundedCornerShape(16.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = hashtagInput,
                onValueChange = { hashtagInput = it },
                label = { Text("Hashtags (comma separated)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )
        }

        Button(
            onClick = {
                if (content.isNotBlank()) {
                    val tags = hashtagInput.split(",").map { it.trim().removePrefix("#") }.filter { it.isNotEmpty() }
                    viewModel.createPost(content, selectedType, tags)
                    onDone()
                }
            },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = ZanGiPrimary)
        ) {
            Text(if (isBengali) "পোস্ট করুন" else "Publish to Universe", fontWeight = FontWeight.Bold)
        }
    }
}
