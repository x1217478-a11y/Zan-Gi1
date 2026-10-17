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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
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
import com.zangi.app.ui.viewmodel.AdsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    adsViewModel: AdsViewModel,
    isBengali: Boolean,
    onToggleLanguage: () -> Unit,
    onBack: () -> Unit
) {
    val adConfig by adsViewModel.adConfig.collectAsState()

    var saveMediaToDevice by remember { mutableStateOf(false) }
    var wifiOnly by remember { mutableStateOf(true) }
    var saveToGallery by remember { mutableStateOf(false) }
    var localOnlyMedia by remember { mutableStateOf(false) }
    var showClearCacheDialog by remember { mutableStateOf(false) }
    var cacheFreedNotice by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        TopAppBar(
            title = {
                Text(
                    if (isBengali) "সেটিংস ও গোপনীয়তা"
                    else "Settings & Privacy",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back"
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color.White
            )
        )

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFFAFBFC)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "App Language / ভাষা",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp
                            )
                            Text(
                                if (isBengali) "বাংলা (Bengali active)"
                                else "English active",
                                fontSize = 12.sp,
                                color = Color(0xFF64748B)
                            )
                        }
                        Switch(
                            checked = isBengali,
                            onCheckedChange = { onToggleLanguage() }
                        )
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFF0FDF4)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            if (isBengali) "💾 স্টোরেজ ও ডাউনলোড"
                            else "💾 Storage & Downloads",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Color(0xFF15803D)
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            if (isBengali)
                                "অ্যাপের ক্যাশ ও ডাউনলোড সেটিংস"
                            else
                                "Manage download and media preferences",
                            fontSize = 12.sp,
                            color = Color(0xFF166534)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        SettingSwitch(
                            title = if (isBengali) "ডিভাইসে মিডিয়া সংরক্ষণ করুন"
                            else "Save media to device",
                            description = if (isBengali)
                                "ডাউনলোড করা মিডিয়া ডিভাইসে রাখুন"
                            else "Keep downloaded media on your device",
                            checked = saveMediaToDevice,
                            onCheckedChange = { saveMediaToDevice = it }
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        SettingSwitch(
                            title = if (isBengali) "ওয়াই-ফাই অনলি অটো-ডাউনলোড"
                            else "Wi-Fi-only auto-download",
                            description = if (isBengali)
                                "মোবাইল ডেটা সাশ্রয় করুন"
                            else "Restrict automatic downloads to Wi-Fi",
                            checked = wifiOnly,
                            onCheckedChange = { wifiOnly = it }
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        SettingSwitch(
                            title = if (isBengali) "ফটো গ্যালারিতে সেভ করুন"
                            else "Save to Gallery",
                            description = if (isBengali)
                                "ডাউনলোড করা মিডিয়া গ্যালারিতে রাখুন"
                            else "Save downloaded media to your gallery",
                            checked = saveToGallery,
                            onCheckedChange = { saveToGallery = it }
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        SettingSwitch(
                            title = if (isBengali) "লোকাল-অনলি মিডিয়া মোড"
                            else "Local-only media mode",
                            description = if (isBengali)
                                "ক্লাউডে আপলোড না করার পছন্দ"
                            else "Preference to keep media local",
                            checked = localOnlyMedia,
                            onCheckedChange = { localOnlyMedia = it }
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedButton(
                            onClick = { showClearCacheDialog = true },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                if (isBengali) "ক্যাশ মুছুন"
                                else "Clear Temporary Cache"
                            )
                        }

                        cacheFreedNotice?.let { notice ->
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = notice,
                                fontSize = 12.sp,
                                color = Color(0xFF15803D)
                            )
                        }
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFFAFBFC)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    "Ads Mode (Google Mobile Ads)",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    "Enables configured ads",
                                    fontSize = 12.sp,
                                    color = Color(0xFF64748B)
                                )
                            }

                            Switch(
                                checked = adConfig.adsEnabled,
                                onCheckedChange = {
                                    adsViewModel.toggleAdsEnabled(it)
                                }
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            "Banner: ${adConfig.bannerAdUnitId}",
                            fontSize = 11.sp,
                            color = Color(0xFF64748B)
                        )
                        Text(
                            "Rewarded: ${adConfig.rewardedAdUnitId}",
                            fontSize = 11.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFFAFBFC)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            if (isBengali) "গোপনীয়তা ও নিরাপত্তা"
                            else "Privacy & Security",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            if (isBengali)
                                "অ্যাকাউন্টের নিরাপত্তা ও গোপনীয়তা সেটিংস।"
                            else
                                "Manage account security and privacy settings.",
                            fontSize = 12.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFFAFBFC)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            if (isBengali) "ডেটা সেভার ও মিডিয়া অপ্টিমাইজেশন"
                            else "Data Saver & Media Optimization",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            if (isBengali)
                                "মিডিয়া ব্যবহারের সময় ডেটা সাশ্রয়ের পছন্দ।"
                            else
                                "Media preferences to help reduce data usage.",
                            fontSize = 12.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                }
            }
        }

        if (showClearCacheDialog) {
            AlertDialog(
                onDismissRequest = { showClearCacheDialog = false },
                title = {
                    Text(
                        if (isBengali) "ক্যাশ মুছবেন?"
                        else "Clear Temporary Cache?"
                    )
                },
                text = {
                    Text(
                        if (isBengali)
                            "এটি শুধু এই স্ক্রিনের অস্থায়ী নোটিশ মুছে দেবে। বাস্তব ফাইল ক্যাশ মুছতে আলাদা cache-clearing ব্যবস্থা প্রয়োজন।"
                        else
                            "This screen does not yet clear real app cache files. A cache-clearing implementation is required for that."
                    )
                },
                confirmButton = {
                    TextButton(
                        onClick = {
                            showClearCacheDialog = false
                            cacheFreedNotice = if (isBengali)
                                "নোটিশ বন্ধ করা হয়েছে; বাস্তব ক্যাশ এখনো মুছা হয়নি।"
                            else
                                "Notice dismissed; actual cache was not cleared."
                        }
                    ) {
                        Text(if (isBengali) "ঠিক আছে" else "OK")
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = { showClearCacheDialog = false }
                    ) {
                        Text(if (isBengali) "বাতিল" else "Cancel")
                    }
                }
            )
        }
    }
}

@Composable
private fun SettingSwitch(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(end = 8.dp)
        ) {
            Text(
                title,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp
            )
            Text(
                description,
                fontSize = 11.sp,
                color = Color(0xFF64748B)
            )
        }

        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}
