const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo Config Plugin to ensure official program artwork assets are copied
 * to Android res/drawable so they are accessible natively for push/local notifications.
 */
const withProgramDrawables = (config) => {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const resDrawableDir = path.resolve(
        projectRoot,
        "android/app/src/main/res/drawable"
      );
      const assetsDir = path.resolve(projectRoot, "assets/programs");

      if (!fs.existsSync(resDrawableDir)) {
        fs.mkdirSync(resDrawableDir, { recursive: true });
      }

      const files = [
        { src: "gaul-morning-show.png", dest: "program_gaul_morning_show.png" },
        { src: "gaul-waktu-setempat.png", dest: "program_gaul_waktu_setempat.png" },
        { src: "asupan-gaul.png", dest: "program_asupan_gaul.png" },
      ];

      for (const { src, dest } of files) {
        const srcPath = path.resolve(assetsDir, src);
        const destPath = path.resolve(resDrawableDir, dest);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      }

      return modConfig;
    },
  ]);
};

module.exports = withProgramDrawables;
