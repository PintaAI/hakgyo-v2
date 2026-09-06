# Hakgyo mobile: student product brief and delivery plan

Date: 2026-09-06. Platform priority: iOS. Status: product decisions delegated; first connected implementation in this branch.

## Conversation record

The user requested a complete student learning experience, support for multiple joined courses and cohorts, vocabulary games driven by existing database content, gamification, tryouts and on-demand assessments with results, Zoom sessions, WhatsApp discussion links, and integration with Hakgyo's AI/MCP layer. Teacher and administrator workflows are excluded from mobile. Existing navigation can change. Ethos is the native UI reference. Android follows in a later iteration.

An initial interview proposed fourteen decision areas. The user then delegated the remaining decisions and asked the agent to focus on UI logic, with device-based visual refinement handled by the user. The recommendations below are **agent-selected defaults**, not answers the user supplied to the interview. The work includes a first implementation and a roadmap; it does not represent every planned capability as finished.

## Product direction

Hakgyo is the student's daily companion to their enrolled learning program. A successful visit finishes a small learning action and makes the next action obvious. The initial audience is existing Hakgyo students; course purchase, course authoring, staff permissions, and organization management remain outside mobile.

The daily loop is: open Today, recall a short vocabulary set, continue a lesson, join a scheduled class when relevant, and see earned progress. Assessments measure learning separately from a practice game's self-reported recall. XP rewards meaningful server-recorded activities. It is not a measure of language proficiency.

First-release defaults: existing account authentication; course access supplied by Hakgyo; English interface copy consistent with the existing mobile shell, while preserving original Korean/Indonesian learning content; all enrolled courses visible together; no compulsory global course selector; five native tabs; calm encouragement; no hearts, loss of access for making mistakes, or public global leagues.

## Information architecture

| Destination | Primary job                                    | Deeper screens                                                                                        |
| ----------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Today       | Find the next useful learning action           | Daily practice, upcoming session, next incomplete activity per course, XP/streak summary              |
| Learn       | Browse enrolled curriculum                     | Course outline, modules, material reader, vocabulary set, assessment introduction                     |
| Practice    | Repeat, test, and review                       | Vocabulary rounds, on-demand assessments, invited tryouts/quick assessments, recent attempts, results |
| Cohorts     | Participate in live learning                   | Course context, upcoming sessions, join Zoom, WhatsApp discussion                                     |
| Profile     | Understand progress and control account access | Milestones, recent activity, connected AI authorizations, sign out                                    |

The existing `/assessments` tab route backs the Practice label to preserve internal links. The sidebar is a secondary shortcut list using student language. It does not introduce a separate workspace or staff mode. Route context carries course, item, event, and attempt IDs; the server verifies access to each resource.

## Curriculum and access

A Course contains ordered Modules and typed Course Items: material, vocabulary set, or assessment. A Cohort is a time-bound group attached to a course. A student may have direct course enrollment and/or cohort enrollment and may belong to several cohorts of the same course. Selecting a cohort for an assessment follows the backend's existing eligible-cohort requirement.

Use the existing course outline's module access and completion rules. Sequentially locked modules stay locked. The mobile catalogue starts from actual student enrollments; staff membership alone does not populate it. Expired, revoked, cancelled, or unpublished access must be handled as unavailable even when the student retains a deep link. Backend authorization is authoritative; navigation hiding is only presentation.

Materials use the existing native content renderer and asset resolver. Vocabulary references embedded in material resolve back to a published vocabulary item in the same module and organization. Both the source material and target vocabulary item must be accessible.

## Vocabulary and daily practice

The first implementation uses two modes: reveal-and-rate recall and multiple choice, alternating between term-to-meaning and meaning-to-term. Sessions contain up to ten eligible words. Duplicate answer labels are removed; sets with only one distinct option fall back to reveal-and-rate. Blank terms/definitions are excluded from playable questions.

Each word has device-local recall history scoped to user and vocabulary set. New/due words come first. A missed word becomes due after ten minutes. Consecutive successful recalls schedule reviews after 1, 2, 4, 8, 16, then at most 30 days. An edited term or definition resets its local schedule through a content fingerprint. These are transparent initial heuristics, not a validated proficiency score. Practice feedback never labels a word permanently mastered.

Students can do extra practice when nothing is due. After all playable words have been reviewed on this device, they can explicitly complete the corresponding vocabulary course item. The existing idempotent server completion path controls the one-time XP reward. Replaying a completed set does not manufacture additional XP or refresh the server streak. That limitation is deliberate until daily review events are implemented.

Next iteration: audio-backed listening rounds, example sentences, typing/production, a daily queue across sets, persistent session resumption, downloadable vocabulary packs, and a shared review-event store. Pronunciation grading requires its own quality evaluation and should not infer accuracy from speech transcription alone.

## Assessments and results

Reuse the current distinction between on-demand course assessments and backend-managed TRYOUT/QUICK_ASSESSMENT events. A tryout is not assumed to be a one-time placement test. Event eligibility, open/close state, timing, shuffle behavior, attempt limits, invalidation, and answer release follow existing server policy.

The flow is introduction → cohort selection when required → start/resume → answer questions → review submission decision → submit → graded result or awaiting review. Practice lists up to fifty recent attempts and routes students back to saved work/results. An already submitted attempt opens its result instead of allowing edits.

The initial native attempt screen shows remaining time, stores a local draft, saves to the server on question navigation or explicit Save answers, and confirms irreversible submission. The countdown continues outside the app. At expiry, only previously server-saved answers can be submitted; the UI states that constraint. It does not invent a local final grade or silently claim synchronization. Server errors keep the learner's current work visible.

Follow-up hardening: serialized background autosave with visible last-save time, draft revision reconciliation across devices, proactive event-state refresh, recovery after submission response loss, server finalization of expired attempts, question navigation/review map, and released explanations/manual feedback. Correct answers must never be exposed before the existing server release policy allows them.

## Live learning and discussion

The cohort screen is enrollment-scoped and displays upcoming scheduled/started meetings. Times render in the device's locale/timezone. Zoom joining is offered ten minutes before the scheduled start until the scheduled end, or earlier when the server marks the meeting started. Cancelled/ended meetings are not joinable. Missing or invalid links have an explicit unavailable state. Actual meeting admission remains Zoom's responsibility.

Zoom opens through the HTTPS join link, allowing the operating system to hand off to Zoom or a browser. WhatsApp uses a cohort-specific group invitation link. The app does not infer attendance from opening Zoom, or WhatsApp membership from opening an invitation. Changing those facts requires provider-supported synchronization.

Next: session reminders, an upcoming/past session detail view, recordings when the backend supplies authorized recording metadata, calendar export, and a reliable attendance model if required by the curriculum. Discussion remains in WhatsApp; built-in chat is not planned for the first release.

## AI and MCP

The existing MCP service is the integration boundary for external AI clients. Mobile shows the server's canonical connector resource URL, supports sharing it, lists the current user's authorizations, and allows revocation. Use the canonical server URL, not the device's LAN API address. OAuth authorization is initiated by a compatible external client and uses the existing browser consent flow.

This is not an embedded chat assistant. A future in-app tutor should answer within the current course/lesson context, explain vocabulary, offer examples and short exercises, and link claims to the source material. It needs a deliberate student-scoped tool set. Existing broad MCP permissions must be audited before presenting any tutor as read-only or student-restricted; a student-only mobile UI does not change external OAuth scopes.

Tutor implementation gate: establish supported provider/model configuration, server-side streaming transport, learner authorization for every retrieval/tool operation, cost limits, conversation retention controls, and evaluation examples drawn from real curriculum. The tutor may explain existing grades but must not write grades, award XP, or bypass assessment answer-release rules.

## Motivation and progress

Initial progress uses the existing server summary, milestone codes, and activity events. Display earned XP, completed activities, current streak, and dated milestones. The current server calculates streaks using UTC; the UI acknowledges that rather than pretending to use the learner's timezone.

The next gamification increment adds distinct daily-review events, deduplication by user/session, bounded daily XP, and a configurable learner timezone with an explicit migration policy. Only then should daily practice promise streak credit. Add optional goals and gentle reminders after that. Streak freezes, leagues, and comparative ranking remain later product experiments. Existing assessment-event rankings remain available after closure according to server policy.

## Native UI direction from Ethos

Ethos was inspected for its native tab layout, Home screen/native toolbar, sidebar organization, iOS-specific components, and project conventions. Adopt semantic theme colors, system tab navigation, one stack per tab, native page titles, lightweight rows, consistent loading/retry/empty states, and iOS-specific boundaries when necessary. Keep the first ScrollView directly in the screen hierarchy with automatic inset adjustment. Preserve the root light/dark navigation theme and existing iOS scroll-edge treatment.

Do not copy Ethos's finance domain, custom app switching, or entire local-first synchronization engine. Native form sheets should be registered at the parent stack that actually presents them. Use native controls when they fit the action; use ordinary React Native content for custom learning interactions. Ensure generous touch targets, readable dynamic text, VoiceOver labels/state, selectable learning text, and no correctness conveyed by color alone.

The current implementation focuses on behavior. The user will refine spacing, typography, imagery, animation, and on-device feel. Device verification remains necessary for native tabs, keyboard behavior, safe areas, audio, screen-reader traversal, external app handoffs, and large text.

References: [Expo native tabs](https://docs.expo.dev/router/advanced/native-tabs/), [Expo stack navigation](https://docs.expo.dev/router/advanced/stack/), and [React Native ScrollView](https://reactnative.dev/docs/scrollview). Installed package types are the version-specific compatibility check for this Expo 57 codebase.

## Data and architecture boundaries

| Concern                              | Authority / storage                                | Mobile responsibility                                               |
| ------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------- |
| Identity and session                 | Better Auth                                        | Session routing and account-scoped caches                           |
| Enrollment, curriculum, locks        | Existing server authorization and learning outline | Display accessible actions and recover from access changes          |
| Lesson/vocabulary completion         | Existing progress mutation                         | Explicit completion and query invalidation                          |
| Attempts, grading, event eligibility | Assessment services                                | Draft UI, persistence, save/submit/result states                    |
| XP, course streak, milestones        | Existing gamification service                      | Render earned values, never fabricate rewards                       |
| Per-word review schedule             | Device SQLite key/value storage initially          | Account/set isolation, content-version reset, visible save failures |
| Zoom/WhatsApp URLs                   | Enrollment-scoped cohort response                  | Validate link type and handle external opening failures             |
| AI authorizations                    | Existing OAuth/MCP service                         | Display canonical connection information and revoke consent         |

Keep credentials and provider secrets on the server. Mobile consumes the type-only AppRouter contract. New first-pass endpoints are `learning.listMyCohorts`, `assessment.listMyAttempts`, and `account.getMcpConnectionInfo`; `learning.getVocabularyPractice` is extended to return playable words and the authorized completion item. No database migration is required for this increment.

## Delivery sequence and completion gates

1. **Connected student foundation — implemented in this branch.** Five tabs, multi-course navigation, next lesson per course, cohort sessions/links, events, recent assessment attempts/results, local vocabulary recall, server progress, and connector management. Gate: typecheck, relevant logic tests, backend access smoke checks, and iOS JS export. This is an initial implementation, not App Store readiness.
2. **Reliable assessment lifecycle.** Complete the interruption/autosave/reconciliation work listed above, provide released answer review, and handle all timed-event transitions. Gate: background/foreground, connectivity loss, force quit, expired/closed/invalidated event, concurrent device, and lost-response cases preserve server truth and explain recoverable work.
3. **Daily learning engine.** Persist review events and schedules on the server; synchronize downloaded vocabulary packs; add a resumable daily queue, examples and listening; implement deduplicated daily rewards/timezone behavior. Gate: retries cannot duplicate rewards, account switching cannot expose another student's records, and offline completion does not falsely claim server acceptance.
4. **Reminders and live-session follow-through.** Add per-category opt-in notifications, quiet hours, timezone-safe scheduling, session detail/calendar actions, and supported recordings. Gate: changing/cancelling a meeting updates reminders; denied notification permission never blocks learning.
5. **Grounded tutor.** Build the student-scoped assistant after the authorization and evaluation gate above. Gate: inaccessible material, unreleased answers, and grade-changing tools cannot be reached; source-grounded explanations pass the curriculum evaluation set.
6. **iOS pilot and release.** User-led visual refinement, accessibility testing, low-end/device performance checks, account settings/deletion/support flows, privacy/retention review, crash reporting, and build/distribution configuration. Gate: representative enrolled students complete the daily loop and timed assessment on physical devices. Distribution is a separate action, not part of this branch.
7. **Android iteration.** Preserve shared product/state logic, add and verify Android navigation, keyboards, insets, back behavior, permissions, media, and deep-link fallbacks. Gate: the same learner acceptance flows pass on Android hardware.

## Measures of success

Primary outcome: weekly learners who complete meaningful learning actions on at least three distinct days. Supporting measures: first-action activation, vocabulary recall on later reviews, lesson continuation/completion, assessment completion and repeated-score improvement where comparable, live-session join-link usage, D7/D30 retention, and draft/sync/API failure rates. Join-link usage is not attendance; a same-session correct choice is not long-term retention.

Instrument events without embedding answer text or private course content in analytics. Define an event dictionary and establish a pilot baseline before setting numerical improvement targets. Analytics is planned, not added by this implementation.

## Known first-pass limits

- Review history is local and no vocabulary content download/offline-start contract exists. A loaded round can continue locally, but starting/revalidating a set and recording course completion need the API.
- In-progress vocabulary rounds restart after leaving; completed word reviews persist.
- Daily replay does not award new server XP/streak credit. Course completion remains one-time.
- Assessment drafts are local plus explicit server saves; there is no cross-device draft revision resolution or background autosave yet.
- Released detailed answer explanations are a follow-up; the native results view currently shows the server score/status.
- The course outline helper supports staff preview elsewhere. Mobile starts from enrolled courses, but stronger role-specific isolation for dual-role accounts is a future shared-authorization decision.
- Initial lists favor existing course sizes; aggregate/paginated learning feeds should replace per-course outline queries as enrollment volume grows.
- No push notifications, embedded tutor, attendance synchronization, calendar integration, or recording player is claimed as implemented.
- Physical iOS/Android behavior is unverified in this Linux workspace. JS export and type checks do not substitute for native device tests.

## Device handoff checklist

Use an enrolled student account, including a fixture with two courses/two cohorts. Check all five tabs in light/dark mode and large text. Open an unlocked and locked module. Complete material and return to Today. Open vocabulary directly and from an embedded material reference; play both modes, miss a word, reopen the set, and verify account isolation. Exercise Zoom before/within/after the join window and WhatsApp with/without installed apps. Start, save, leave, resume, expire, submit, and reopen an assessment. Check awaiting-review and invalidated-event states. Share the canonical connector address and revoke a test AI authorization. Sign out during navigation and ensure protected learning routes disappear.

## Verification record

- Bun 1.3.14: 30 targeted tests passed across eight files, covering native recall/draft/link logic and existing progression, completion, gamification, and assessment deadline rules.
- Mobile TypeScript check passed. Web `check` (ESLint plus TypeScript) passed.
- Expo iOS JavaScript export passed. This checks bundling, not native compilation or device rendering.
- Shared development-server smoke checks: anonymous `learning.listMyCohorts` returned 401; seeded student and teacher sessions received successful responses from enrolled courses, student cohorts, recent attempts, and canonical MCP information. Test sessions were signed out afterward.
- Those accounts returned no active cohorts or attempts, and no vocabulary fixture was exercised by the smoke pass. Positive live-meeting, vocabulary authorization, and assessment lifecycle API checks remain unverified. No fixture enrollments or scores were changed to force the test through.
- No native distribution, OTA publication, database migration, or physical-device test was performed.
