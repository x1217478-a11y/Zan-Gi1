# Zan-Gi Android Proguard / R8 Rules

# Keep data models so serialization / reflection doesn't strip them
-keep class com.zangi.app.data.model.** { *; }

# Google Mobile Ads SDK (AdMob)
-keep public class com.google.android.gms.ads.** {
   public *;
}
-keep public class com.google.ads.** {
   public *;
}

# AndroidX / Compose rules
-keep class androidx.compose.material3.** { *; }
-dontwarn androidx.compose.**

# Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory { *; }
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler { *; }
-dontwarn kotlinx.coroutines.**

# Coil Image Loader
-keep class coil.** { *; }
-dontwarn coil.**
-keep class io.coilkt.** { *; }
-dontwarn io.coilkt.**
