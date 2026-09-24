// Dynamic Expo config: APP_VARIANT=development builds the dev client as a
// separate side-by-side app (Hakgyo Dev / com.rorez.hakgyo.dev). Anything else
// (including unset, used by EAS preview/production) builds the prod app.
// NOTE: the `hakgyo` deep-link scheme is intentionally identical for both
// variants to stay aligned with the Expo auth client and Better Auth
// trustedOrigins (see AGENTS.md).
const variant =
  process.env.APP_VARIANT === "development" ? "development" : "production";
const isDev = variant === "development";

const bundleIdentifier = isDev
  ? "com.rorez.hakgyo.dev"
  : "com.rorez.hakgyo";
const androidPackage = isDev ? "com.rorez.hakgyo.dev" : "com.rorez.hakgyo";
const appGroup = isDev ? "group.com.rorez.hakgyo.dev" : "group.com.rorez.hakgyo";

export default {
  expo: {
    name: isDev ? "Hakgyo Dev" : "Hakgyo",
    slug: "hakgyo",
    scheme: "hakgyo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    updates: {
      url: "https://u.expo.dev/942928d2-590a-4ca4-831f-247fa79f83e7",
    },
    runtimeVersion: {
      policy: "fingerprint",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier,
      icon: {
        light: "./assets/ios-icon-light.png",
        dark: "./assets/ios-icon-dark.png",
        tinted: "./assets/ios-icon-tinted.png",
      },
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      package: androidPackage,
      adaptiveIcon: {
        backgroundColor: "#FFFFFF",
        foregroundImage: "./assets/android-icon-foreground.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-secure-store",
      "expo-sqlite",
      "expo-background-task",
      "expo-quick-actions",
      "expo-widgets",
      "expo-sharing",
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#FFFFFF",
          image: "./assets/splash-icon-light.png",
          imageWidth: 200,
          resizeMode: "contain",
          dark: {
            backgroundColor: "#000000",
            image: "./assets/splash-icon-dark.png",
          },
        },
      ],
      "expo-audio",
      [
        "expo-speech-recognition",
        {
          microphonePermission: "Allow $(PRODUCT_NAME) to use the microphone.",
          speechRecognitionPermission:
            "Allow $(PRODUCT_NAME) to use speech recognition.",
        },
      ],
    ],
    extra: {
      eas: {
        build: {
          experimental: {
            ios: {
              appExtensions: [
                {
                  targetName: "ExpoWidgetsTarget",
                  bundleIdentifier: `${bundleIdentifier}.ExpoWidgetsTarget`,
                  entitlements: {
                    "com.apple.security.application-groups": [appGroup],
                  },
                },
              ],
            },
          },
        },
        projectId: "942928d2-590a-4ca4-831f-247fa79f83e7",
      },
      router: {},
    },
    owner: "rorez",
  },
};
