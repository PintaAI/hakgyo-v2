/**
 * Inputs of the native fingerprint that EAS records on every build and that
 * `scripts/ota-publish.ts` compares before publishing an update.
 *
 * Skipped because they do not change the native code an update runs against:
 * - package.json scripts: only dev-server and OTA helpers live here. Adding a
 *   native build hook (`eas-build-*`, `postinstall`) therefore needs a
 *   `version` bump by hand.
 * - eas.json: build profiles, channels and submit settings. Profile env that
 *   feeds app.config.ts is still covered through the evaluated Expo config.
 *
 * @type {import('expo/fingerprint').Config}
 */
module.exports = {
  sourceSkips: ["PackageJsonScriptsAll"],
  ignorePaths: ["eas.json"],
};
