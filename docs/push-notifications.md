# Push notifications

Learners get pushes on web (Web Push/VAPID) and in the Expo app (iOS/Android through the Expo push service). Every notification is also stored as an inbox row (`Notification`); push delivery is best effort per device (`PushTarget`).

## Server flow

Domain routers call a trigger from `apps/web/src/server/notifications/triggers.ts` after their write commits, through `notifyInBackground` (Next.js `after()`, inline outside a request). Triggers pick recipients and copy, then call `notifyUsers` in `dispatch.ts`, which stores inbox rows, sends to every active device, and disables devices the push services report as gone. Expo messages go out in batches of 100 on the `default` Android channel with `priority: "high"`; a trigger's `tag` makes later pushes about the same event, meeting or attempt replace earlier ones.

| Trigger                                     | Sent when                                                                                                          | Recipients                                   | App route                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------- |
| Event opened                                | `assessmentEvent.open` with `notify`                                                                               | Valid participants with an ACTIVE enrollment | `/events/[eventId]`                                     |
| Event cancelled                             | `assessmentEvent.cancel` with `notify`                                                                             | Same (drafts have none)                      | `/events/[eventId]`                                     |
| Event closes soon                           | Cron, closes within 30 min, opened more than 30 min ago                                                            | Recipients above who have not submitted      | `/events/[eventId]`                                     |
| Participation invalidated                   | `assessmentEvent.invalidateAttempt`                                                                                | That learner                                 | `/events/[eventId]`                                     |
| Submission graded                           | `assessment.reviewAttempt` (standalone assessments only)                                                           | That learner                                 | attempt screen                                          |
| Meeting scheduled / rescheduled / cancelled | `cohort.createMeeting`, `updateMeeting` (time changes only), `deleteMeeting` (future meetings), each with `notify` | ACTIVE cohort members                        | Belajar tab focused on the cohort (`/learn?cohortId=…`) |
| Meeting starts soon                         | Cron, starts within 60 min                                                                                         | ACTIVE cohort members                        | same                                                    |
| Enrollment added / removed                  | `enrollment.set*Enrollment` (becomes ACTIVE), `remove*Enrollment` (was ACTIVE)                                     | That learner                                 | course / none                                           |

Teachers choose per action with the "Beri tahu peserta" checkbox (default on); the `notify` input defaults to `true` for MCP callers. Event times in copy are relative because learner time zones are not stored reliably; meeting times use the meeting's time zone.

## Cron

`.github/workflows/notifications.yml` calls `POST /api/cron/notifications` every 10 minutes with `Authorization: Bearer $CRON_SECRET` (the same secret as the sync compaction job). It sends due reminders (claimed through `AssessmentEvent.closingReminderSentAt` and `CohortMeeting.reminderSentAt`, so overlapping runs send once; rescheduling a meeting clears its flag) and checks Expo receipts: `PushTicket` rows older than 15 minutes are resolved, `DeviceNotRegistered` disables the device, and tickets older than a day are dropped. GitHub may start scheduled runs late; the reminder windows are wider than the interval to absorb that.

## Mobile client

`PushNotificationsProvider` (inside the root navigator) registers the device through `notification.registerDevice` whenever permission already exists, re-registers on token rotation, and routes taps, including the tap that launched the app. It never prompts on launch: the one-time pre-permission alert appears on the Tugas tab or an event screen, and Profile › Pengaturan › Notifikasi has an on/off switch. Signing out calls `notification.disableDevice` first. Pushes carry the entity ids from the trigger's `data` (`eventId`, `meetingId`, `attemptId`, `cohortId`, `courseId`). A push that arrives while the app is open, or is tapped, runs a sync check so the Pembaruan drawer shows the change immediately; a tap also dismisses the drawer notices and unread indicators about the same entity (`src/lib/notification-target.ts`). The drawer stays the in-app list; the server inbox (`notification.inboxList`) is not shown on mobile. The install's `deviceId` lives in SecureStore.

Push needs a development or store build on a physical device; simulators and Expo Go report the feature as unavailable.

## Setup

Adding `expo-notifications` changed native code, so build new binaries (`eas build`) for both variants.

**iOS.** The APNs key lives in EAS. Check that `com.rorez.hakgyo` and `com.rorez.hakgyo.dev` both have push enabled with `eas credentials -p ios`.

**Android.**

1. Create a Firebase project and add two Android apps: `com.rorez.hakgyo` and `com.rorez.hakgyo.dev`.
2. Download `google-services.json` (it covers both apps) to `apps/mobile/google-services.json`. It only holds public identifiers and is safe to commit. `app.config.ts` picks it up automatically, or from the `GOOGLE_SERVICES_JSON` EAS file variable.
3. In Firebase › Project settings › Service accounts, generate a private key and upload it with `eas credentials -p android` › Google Service Account › FCM V1. Never commit this key.
4. If the Firebase API key is restricted, allow "Firebase Installations API" and "FCM Registration API".

**Server.** Set `CRON_SECRET` in Vercel and as a GitHub Actions secret. If "enhanced push security" is enabled for the EAS project, set `EXPO_ACCESS_TOKEN` in Vercel.

**Test.** Sign in on a device, enable notifications, then send `notification.sendTest` (web notification settings) and check the device list.
