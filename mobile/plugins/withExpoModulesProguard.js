const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PROGUARD_RULES = `
# ── Expo modules ────────────────────────────────────────────────────────────────
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# ── AndroidX WorkManager (used by expo-notifications, expo-background-fetch) ───
-keep class androidx.work.** { *; }
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.InputMerger
-keep public class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}
-keep class androidx.work.impl.WorkDatabase
-keep class androidx.work.impl.WorkDatabase_Impl
-keep class * extends androidx.work.impl.WorkDatabase
-dontwarn androidx.work.**

# ── React Native / Hermes ────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# ── Reanimated / Worklets ────────────────────────────────────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-dontwarn com.swmansion.**

# ── Keep classes instantiated via reflection ─────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
`;

module.exports = function withExpoModulesProguard(config) {
  return withDangerousMod(config, [
    "android",
    (mod) => {
      const proguardPath = path.join(
        mod.modRequest.platformProjectRoot,
        "app/proguard-rules.pro"
      );
      if (fs.existsSync(proguardPath)) {
        const existing = fs.readFileSync(proguardPath, "utf8");
        if (!existing.includes("androidx.work.impl.WorkDatabase")) {
          fs.writeFileSync(proguardPath, existing + PROGUARD_RULES);
        }
      }
      return mod;
    },
  ]);
};
