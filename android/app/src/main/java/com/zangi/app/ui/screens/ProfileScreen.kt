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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zangi.app.ui.theme.ZanGiCoinGold
import com.zangi.app.ui.theme.ZanGiPrimary

@Composable
fun ProfileScreen(
    isBengali: Boolean,
    onOpenSettings: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp)
    ) {
        // Top action bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "fahim_ai",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
            IconButton(onClick = onOpenSettings) {
                Icon(Icons.Filled.Settings, contentDescription = "Settings")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Profile Avatar and Stats
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFE2E8F0))
            )

            Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "14.8K", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(text = if (isBengali) "অনুসারী" else "Followers", fontSize = 12.sp, color = Color(0xFF64748B))
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "328", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(text = if (isBengali) "অনুসরণ" else "Following", fontSize = 12.sp, color = Color(0xFF64748B))
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "42", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(text = if (isBengali) "পোস্ট" else "Posts", fontSize = 12.sp, color = Color(0xFF64748B))
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Bio
        Text(text = "Fahim Ahmed", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Text(
            text = "Building the future of AI & Social in Bangladesh. Connect. Create. Imagine. Earn. 🇧🇩",
            fontSize = 13.sp,
            lineHeight = 19.sp,
            color = Color(0xFF334155)
        )

        Spacer(modifier = Modifier.height(14.dp))

        // Creator Earnings Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
            shape = RoundedCornerShape(14.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = "Zan-Gi Creator Coins", fontSize = 11.sp, color = Color(0xFF92400E), fontWeight = FontWeight.SemiBold)
                    Text(text = "1,420 Coins ($14.20)", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF78350F))
                }
                Button(
                    onClick = {},
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB45309)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Payouts", fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = {},
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF1F5F9))
        ) {
            Text(if (isBengali) "প্রোফাইল সম্পাদনা করুন" else "Edit Profile", color = Color(0xFF0F172A))
        }
    }
}
