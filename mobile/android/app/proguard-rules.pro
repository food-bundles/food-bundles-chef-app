# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Fix R8 missing classes for expo-av / expo-modules-core
-keep class expo.modules.core.interfaces.services.KeepAwakeManager { *; }
-keep class expo.modules.kotlin.types.AnyTypeProvider { *; }
-keep class expo.modules.kotlin.types.LazyKType { *; }
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**
