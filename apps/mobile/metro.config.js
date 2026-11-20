const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  // Set at runtime by AppThemeProvider (Ukuran teks, see global.css).
  inlineVariables: { exclude: ["--font-scale"] },
});
