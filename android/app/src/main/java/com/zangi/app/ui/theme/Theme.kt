package com.zangi.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = ZanGiPrimary,
    onPrimary = ZanGiOnPrimary,
    primaryContainer = ZanGiPrimaryContainer,
    onPrimaryContainer = ZanGiOnPrimaryContainer,
    secondary = ZanGiSecondary,
    onSecondary = ZanGiOnSecondary,
    secondaryContainer = ZanGiSecondaryContainer,
    onSecondaryContainer = ZanGiOnSecondaryContainer,
    tertiary = ZanGiTertiary,
    onTertiary = ZanGiOnTertiary,
    tertiaryContainer = ZanGiTertiaryContainer,
    onTertiaryContainer = ZanGiOnTertiaryContainer,
    background = ZanGiBackground,
    onBackground = ZanGiOnBackground,
    surface = ZanGiSurface,
    onSurface = ZanGiOnSurface,
    surfaceVariant = ZanGiSurfaceVariant,
    onSurfaceVariant = ZanGiOnSurfaceVariant,
    outline = ZanGiOutline,
    outlineVariant = ZanGiOutlineVariant
)

// Dark Color Scheme adhering to anti-slop optical compensation
private val DarkColorScheme = darkColorScheme(
    primary = ZanGiPrimary,
    onPrimary = ZanGiOnPrimary,
    secondary = ZanGiSecondary,
    onSecondary = ZanGiOnSecondary,
    tertiary = ZanGiTertiary,
    onTertiary = ZanGiOnTertiary,
    background = androidx.compose.ui.graphics.Color(0xFF090D16),
    onBackground = androidx.compose.ui.graphics.Color(0xFFF8FAFC),
    surface = androidx.compose.ui.graphics.Color(0xFF0F172A),
    onSurface = androidx.compose.ui.graphics.Color(0xFFF8FAFC),
    surfaceVariant = androidx.compose.ui.graphics.Color(0xFF1E293B),
    onSurfaceVariant = androidx.compose.ui.graphics.Color(0xFF94A3B8)
)

@Composable
fun ZanGiTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = colorScheme.background.toArgb()
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = ZanGiTypography,
        content = content
    )
}
