# On-Device Speech-to-Text in Expo

**Research date:** 2026-09-15  
**Project:** Hakgyo V2 mobile app  
**Current mobile stack:** Expo SDK 57 / React Native

## Conclusion

Yes, Hakgyo can access speech-to-text on both iOS and Android from an Expo app. The native operating systems provide speech-recognition APIs, but Expo does not currently provide an official speech-to-text module. Expo's official `expo-speech` package is for text-to-speech only.

The most direct Expo integration is the community package [`expo-speech-recognition`](https://github.com/jamsch/expo-speech-recognition). It wraps Apple's `SFSpeechRecognizer` on iOS and Android's `SpeechRecognizer`, and exposes an option for requiring on-device recognition.

This integration requires a custom Expo development or production build. It cannot be added to the standard Expo Go app because the package contains native code and a config plugin.

## What “on-device” means

On-device recognition means the audio is processed locally by the operating system's speech-recognition service instead of being sent to a remote recognition service. It is not guaranteed for every device, language, or Android speech service, so the app must check availability at runtime.

If on-device recognition is mandatory for privacy, the app should refuse to start when local recognition is unavailable rather than silently falling back to a network service.

## Platform support

### iOS

Apple provides speech recognition through `SFSpeechRecognizer` and `SFSpeechRecognitionRequest`.

- Check `SFSpeechRecognizer.supportsOnDeviceRecognition` before starting.
- Set `requiresOnDeviceRecognition = true` on the recognition request when audio must remain on the device.
- Apple notes that the request only honors this setting when the recognizer reports on-device support.
- On-device recognition may be less accurate than network-based recognition.
- The app must request speech-recognition authorization and microphone access.
- The app's `Info.plist` must include `NSSpeechRecognitionUsageDescription` and `NSMicrophoneUsageDescription` with user-facing explanations.

Sources:

- [Apple: SFSpeechRecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer)
- [Apple: supportsOnDeviceRecognition](https://developer.apple.com/documentation/speech/sfspeechrecognizer/supportsondevicerecognition)
- [Apple: requiresOnDeviceRecognition](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition)
- [Apple: requestAuthorization](https://developer.apple.com/documentation/speech/sfspeechrecognizer/requestauthorization%28_%3A%29)

### Android

Android provides speech recognition through `android.speech.SpeechRecognizer`.

- `SpeechRecognizer.isOnDeviceRecognitionAvailable(context)` reports whether an on-device service is available.
- `SpeechRecognizer.createOnDeviceSpeechRecognizer(context)` creates a recognizer that uses the on-device service.
- The on-device factory and availability check were added in Android API 31 (Android 12).
- Availability depends on the installed/default speech-recognition service and downloaded language model.
- Android may require the user to install or enable a compatible speech-recognition service and download the requested offline language model.
- The recognizer is intended for short speech input, not unrestricted continuous transcription; Android warns that recognition may stream audio to remote servers when using the normal recognizer API.
- The app must request `android.permission.RECORD_AUDIO`.

Source:

- [Android: SpeechRecognizer API reference](https://developer.android.com/reference/android/speech/SpeechRecognizer)

## Expo-specific requirements

`expo-speech` should not be selected for this feature: its documented API is text-to-speech, such as speaking text and listing voices.

The community package [`expo-speech-recognition`](https://github.com/jamsch/expo-speech-recognition) provides:

- iOS `SFSpeechRecognizer` integration
- Android `SpeechRecognizer` integration
- Permission helpers
- Interim and final result events
- Runtime availability checks
- `requiresOnDeviceRecognition` support
- An Expo config plugin for native permissions and Android speech-service package visibility

Because it contains native code, add it to the Expo app config and rebuild the native app:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-speech-recognition",
        {
          "microphonePermission": "Allow $(PRODUCT_NAME) to use the microphone.",
          "speechRecognitionPermission": "Allow $(PRODUCT_NAME) to use speech recognition."
        }
      ]
    ]
  }
}
```

Typical installation:

```bash
bun add expo-speech-recognition
```

Then create a development build or native app:

```bash
bunx expo run:android
bunx expo run:ios
```

Alternatively, use EAS Build for development and store builds. Adding or changing a native-code dependency requires rebuilding the development client.

Sources:

- [Expo: Speech (`expo-speech`)](https://docs.expo.dev/versions/v56.0.0/sdk/speech/)
- [Expo: Add custom native code](https://docs.expo.dev/workflow/customizing/)
- [Expo: Development builds FAQ](https://docs.expo.dev/develop/development-builds/faq/)
- [`expo-speech-recognition` documentation and config plugin](https://github.com/jamsch/expo-speech-recognition)

## Suggested runtime flow

1. Request microphone and speech-recognition permissions.
2. Check general recognition availability.
3. Check on-device availability.
4. Check whether the requested locale has an installed/downloaded local model, especially on Android.
5. Start recognition with `requiresOnDeviceRecognition: true`.
6. Display interim results, then persist the final transcript.
7. Handle permission denial, unavailable recognition, missing language models, interruption, timeout, and recognizer errors.
8. Stop and destroy/clean up recognition when the screen leaves or recording ends.

Example shape using the community module:

```ts
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

const permission =
  await ExpoSpeechRecognitionModule.requestPermissionsAsync();

if (!permission.granted) {
  // Show a permission explanation and settings action.
  return;
}

if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
  // Speech recognition is unavailable on this device.
  return;
}

if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
  // Do not start if the product requires strictly local processing.
  return;
}

ExpoSpeechRecognitionModule.start({
  lang: "en-US",
  interimResults: true,
  requiresOnDeviceRecognition: true,
});

useSpeechRecognitionEvent("result", (event) => {
  const transcript = event.results[0]?.transcript ?? "";
  // Update the UI; persist only the final result as appropriate.
});
```

The exact locale/model checks and Android-specific behavior should follow the installed package version's API documentation.

## Important limitations

### Expo Go

Standard Expo Go cannot load this package's native module. Use a custom development build or a standalone app. This is an Expo architecture limitation, not a limitation of the iOS or Android speech APIs.

### Device and language availability

“Works on iOS and Android” does not mean every device supports every language offline. The app must check support and provide a useful unavailable/offline-model state.

### Android service fragmentation

Android's recognizer is provided by a system speech service. Behavior, supported languages, offline-model installation, and continuous-mode behavior can vary by OS version, manufacturer, and installed service.

### Accuracy and duration

On-device recognition can be less accurate than server-backed recognition. Apple documents practical recognition limits, including a one-minute limit for some live recognition tasks. Android also cautions against using `SpeechRecognizer` for continuous recognition because of battery and bandwidth costs.

### Privacy

The app should clearly indicate when the microphone is active, explain why access is needed, and avoid treating a normal recognition path as private unless on-device support has been checked and explicitly required.

## Compatibility note for Hakgyo

The project uses Expo SDK 57. The current `expo-speech-recognition` repository has releases and development dependencies aligned around SDK 56, although its package peer dependency is broad and there are reports of it being used in SDK 57 projects. This must be validated by building both platforms before committing to it.

Recommended validation targets:

- iOS 17+ physical device with the target locale available offline
- Android 12 device with an offline model installed
- Android 13/14+ device with the selected Google/on-device speech service
- Permission denied and permission revoked cases
- Airplane mode to verify that no network fallback occurs
- English plus the actual Hakgyo target languages

Do not treat the feature as complete until airplane-mode tests produce either a local transcript or a clear unsupported/unavailable state.

## Recommendation

Use `expo-speech-recognition` as the first implementation candidate, but keep the speech-recognition layer behind a small Hakgyo interface so the native package can be replaced later. Before implementation, verify SDK 57 builds on both platforms and confirm that the target languages have reliable offline models.

If consistent offline behavior and language support across a wide range of devices are strict requirements, evaluate bundling a local Whisper-style model through a native/on-device ML integration instead of depending on each operating system's speech service. That option increases app size, CPU/battery usage, and implementation complexity.
