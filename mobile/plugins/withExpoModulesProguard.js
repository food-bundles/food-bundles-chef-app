const { withAppBuildGradle } = require("@expo/config-plugins");

const PROGUARD_RULES = `
# Fix R8 missing classes for expo-av / expo-modules-core
-keep class expo.modules.core.interfaces.services.KeepAwakeManager { *; }
-keep class expo.modules.kotlin.types.AnyTypeProvider { *; }
-keep class expo.modules.kotlin.types.LazyKType { *; }
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**
`;

module.exports = function withExpoModulesProguard(config) {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes("KeepAwakeManager")) {
      const fs = require("fs");
      const path = require("path");
      const proguardPath = path.join(
        mod.modRequest.projectRoot,
        "android/app/proguard-rules.pro"
      );
      if (fs.existsSync(proguardPath)) {
        const existing = fs.readFileSync(proguardPath, "utf8");
        if (!existing.includes("KeepAwakeManager")) {
          fs.writeFileSync(proguardPath, existing + PROGUARD_RULES);
        }
      }
    }
    return mod;
  });
};
