const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Expo Config Plugin to enable Android ABI splits (armeabi-v7a, arm64-v8a, x86, x86_64)
 * and universal APK generation, significantly reducing individual APK file sizes.
 */
const withAndroidSplits = (config) => {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === "groovy") {
      let contents = modConfig.modResults.contents;
      if (!contents.includes("splits {")) {
        const splitsBlock = `
    splits {
        abi {
            reset()
            enable true
            universalApk true
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
    }
`;
        contents = contents.replace(/android\s*\{/, `android {${splitsBlock}`);
        modConfig.modResults.contents = contents;
      }
    }
    return modConfig;
  });
};

module.exports = withAndroidSplits;
