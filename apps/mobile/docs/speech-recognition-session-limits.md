# Speech recognition session limits and restart behavior

**Research date:** 2026-09-19  
**Scope:** `expo-speech-recognition` v57.1.0, Apple Speech, and Android
`SpeechRecognizer`

## Bottom line

Repeated short sessions usually fail because a new session starts before the old
one has fully finished, not because either OS publishes a small fixed session
count. `stop()` is asynchronous: use the package's `end` event as the teardown
barrier, serialize all starts, and back off rather than immediately looping on
errors. On Android, starting again before `onResults` or `onError` is explicitly
rejected by the recognition service. On iOS, native error 1100 means an earlier
recognition instance is still active.

Request churn can also reach service throttles. Apple's server recognizer has
documented request and duration limits; Android exposes “busy” and “too many
requests” errors but publishes no universal threshold because the selected
recognition service implements the behavior. On-device recognition avoids
Apple's server limits and reduces dependency on remote Android services, when
the locale model is installed.

## Documented limits and behavior

| Area                        | Primary-source finding                                                                                                                                                                                                                                | Practical consequence                                                                                                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apple server duration       | Apple's archived QA states at most one minute of audio per `SFSpeechRecognitionRequest`. WWDC19 confirms that server recognition has request-count and duration limits.                                                                               | Roll over a genuinely long server-backed session before one minute; do not create many tiny requests merely to avoid this limit.                                                                                       |
| Apple server request rate   | The same 2017 QA states 1,000 requests per device per hour, regardless of audio length. WWDC16 also says devices can be limited per day and apps globally throttled.                                                                                  | Rapid automatic restarts consume quota even when every session is only seconds long. Error 203 can represent quota exhaustion. The numeric QA is historical, so treat it as evidence of throttling, not a current SLA. |
| Apple on-device recognition | WWDC19 says server request and audio-duration limits do not apply to on-device recognition. `requiresOnDeviceRecognition` is honored only when `supportsOnDeviceRecognition` is true.                                                                 | Prefer on-device recognition for sustained hands-free use when the target locale is supported; otherwise retain a server-limit fallback path.                                                                          |
| Apple overlap               | Apple documents native error 1100 as “Trying to start recognition while an earlier instance is still active.” Errors 1101/1107 indicate an invalidated/interrupted speech-process connection.                                                         | Never restart from a partial/final-result callback or error callback alone. Wait for complete teardown.                                                                                                                |
| Android duration            | Android publishes no portable maximum session duration. Its API warns that recognition may stream to remote servers and is not intended for continuous recognition because of battery and bandwidth cost.                                             | Do not promise indefinite listening. Behavior varies by OS, device, installed service, locale, and online/offline mode.                                                                                                |
| Android overlap/throttling  | `ERROR_RECOGNIZER_BUSY` (8) means the service is busy; `ERROR_TOO_MANY_REQUESTS` (10) means too many requests from the same client. After `stopListening()`, Android requires waiting for `onResults` or `onError` before another `startListening()`. | An immediate stop/start loop can first produce busy errors and then service throttling. There is no documented universal cooldown or request threshold.                                                                |
| Android endpoint options    | Android says the silence/minimum-length extras should rarely be changed, can cause unexpected results, and may be ignored by the recognizer implementation.                                                                                           | Treat silence values as hints, not a way to force session duration or reliable continuous operation.                                                                                                                   |

## What v57.1.0 does

- The package documents `end` as the final event, including after errors.
  `stop()` asks for final processing, while `abort()` cancels immediately; both
  complete through an eventual `end` event.
- On Android, each `start()` destroys the previous `SpeechRecognizer`, creates a
  new one, and calls `startListening()`. Destruction/binder teardown can still
  lag behind JavaScript, so back-to-back starts can reach a service that remains
  busy. Native errors 8 and 10 map to `"busy"` and
  `"too-many-requests"` respectively.
- In v57.1.0, `"too-many-requests"` is emitted by Android native source but is
  absent from the TypeScript `ExpoSpeechRecognitionErrorCode` union and README
  error table. Use `event.code === 10` for reliable diagnosis until the package
  aligns its public types.
- On iOS, non-continuous recognition has a package-managed three-second
  no-result timer. `continuous: true` removes that timer. On Android 13+, the
  package implements continuous mode with a custom audio source and segmented
  session; the package states continuous recognition is unsupported on Android
  12 and below.
- The owner specifically recommends waiting for `end` before changing the iOS
  audio category or starting playback. `abort()` shortens teardown when no final
  result is needed, but `end` remains the completion signal.

## Why failure can appear only after several interactions

1. A result, timeout, or `stop()` causes JavaScript to mark the turn complete
   before native finalization and microphone teardown finish. The next turn
   overlaps the old native task and produces Android busy/error 8 or Apple error 1100.
2. A no-speech handler immediately starts again before the old session's `end`.
   Repeated silence creates a tight request loop, making overlap and throttling
   progressively more likely.
3. Playback or another audio library changes `AVAudioSession` while recognition
   is still stopping. The package's “audio input is busy” error is raised when
   the input format reports zero sample rate or channels; owner issue #102 ties
   this class of failure to competing playback/session management.
4. Server-backed short sessions multiply request count. Apple explicitly counts
   each request regardless of audio length; Android services can independently
   return error 10 without a published threshold.
5. Android endpoint extras are service hints. A sequence may work initially and
   later end sooner, be ignored, or behave differently after a service/network
   transition without violating the API contract.

## Recommended hands-free pattern

1. Keep one app-level owner and one state machine:
   `idle -> starting -> listening -> stopping -> idle`. Reject every `start()`
   unless the app is foregrounded and `getStateAsync()` returns `inactive`.
2. After `stop()` or `abort()`, wait for `end`; do not restart from `result`,
   `speechend`, `error`, or the return of `stop()` itself. `error` may precede
   `end`.
3. If hands-free mode still applies when `end` arrives, restart after a small
   guard delay. The platforms prescribe no magic duration; a conservative
   application policy is 250-500 ms initially, then exponential backoff with
   jitter (for example 1 s, 2 s, 4 s) after `busy`, `client`, network, or
   speech-process errors. Cap retries and require user action after the cap.
4. Do not auto-retry Android code 10 or an Apple quota error in a tight loop.
   Stop automatic listening, use a materially longer cooldown, and expose a
   retry action. Log native code, service package, locale, online/on-device mode,
   and session timestamps.
5. For `no-speech`/`speech-timeout`, wait for `end`, then use bounded backoff.
   Pause retries while backgrounded, interrupted, disabled, or unmounted.
6. Prefer `continuous: true` plus on-device recognition for supported iOS and
   Android 13+ hands-free flows, accumulating Android final segments. Keep the
   serialized restart path because an OS/service may still end the session.
7. On Apple server recognition, proactively roll a long session near 50-55
   seconds, wait for `end`, and restart with the same guard. Prefer on-device
   recognition instead when available.
8. On iOS, coordinate playback and recognition under one `AVAudioSession`
   policy. Do not restore/change category or start competing playback until
   `end`; use compatible `playAndRecord` settings consistently if simultaneous
   playback and recognition are required.
9. If true always-on VAD is required, use an audio-frame/VAD API rather than
   repeatedly invoking speech recognition. The package owner calls rapid
   restart on Android 12 and below resource-intensive and recommends dedicated
   audio/VAD tooling for that use case.

## Sources

### Package owner: exact v57.1.0

- [v57.1.0 README and API/event behavior](https://github.com/jamsch/expo-speech-recognition/blob/v57.1.0/README.md)
- [Android implementation: lifecycle and error mapping](https://github.com/jamsch/expo-speech-recognition/blob/v57.1.0/android/src/main/java/expo/modules/speechrecognition/ExpoSpeechService.kt)
- [iOS implementation: teardown, timer, and audio-input busy check](https://github.com/jamsch/expo-speech-recognition/blob/v57.1.0/ios/ExpoSpeechRecognizer.swift)
- [v57.1.0 public options and error types](https://github.com/jamsch/expo-speech-recognition/blob/v57.1.0/src/ExpoSpeechRecognitionModule.types.ts)
- [Owner guidance: wait for `end`; `abort()` is faster than `stop()`](https://github.com/jamsch/expo-speech-recognition/issues/12#issuecomment-2334936911)
- [Owner guidance: wait for `end` before changing iOS audio category](https://github.com/jamsch/expo-speech-recognition/issues/85#issuecomment-2798792315)
- [Owner guidance: on-device recognition for iOS continuous/API limits](https://github.com/jamsch/expo-speech-recognition/issues/81#issuecomment-2759492602)
- [Owner investigation and workaround for iOS audio-input busy conflicts](https://github.com/jamsch/expo-speech-recognition/issues/102#issuecomment-3093194808)
- [Owner guidance against repeated recognition as VAD on older Android](https://github.com/jamsch/expo-speech-recognition/issues/49#issuecomment-2461408646)

### Apple

- [Technical Q&A QA1951: 1,000 requests/hour/device and one minute/request](https://developer.apple.com/library/archive/qa/qa1951/_index.html)
- [WWDC16 Speech Recognition API: daily/global throttling and duration](https://developer.apple.com/videos/play/wwdc2016/509/)
- [WWDC19 Advances in Speech Recognition: on-device mode avoids server limits](https://developer.apple.com/videos/play/wwdc2019/256/)
- [`SFSpeechRecognitionTask.error`: native overlap/process error codes](https://developer.apple.com/documentation/speech/sfspeechrecognitiontask/error)
- [`requiresOnDeviceRecognition`](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition)
- [`SFSpeechRecognizer.isAvailable`](https://developer.apple.com/documentation/speech/sfspeechrecognizer/isavailable)

### Android

- [`SpeechRecognizer`: lifecycle contract, busy/throttle errors, and continuous-use warning](https://developer.android.com/reference/android/speech/SpeechRecognizer)
- [`RecognizerIntent`: segmented sessions and endpoint-option caveats](https://developer.android.com/reference/android/speech/RecognizerIntent)
- [AOSP `SpeechRecognizer.java` source](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/core/java/android/speech/SpeechRecognizer.java)
- [AOSP `RecognizerIntent.java` source](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/core/java/android/speech/RecognizerIntent.java)
