# iOS App Store submission

What the Hakgyo iOS app needs to pass App Review, what the code already covers, and the steps that have to happen in Apple's and Vercel's consoles.

## Covered in code

| Requirement | Where |
| --- | --- |
| In-app account deletion (5.1.1(v)) | `apps/mobile/app/(home)/(tabs)/profile/account.tsx` calls Better Auth `deleteUser`. Password accounts confirm with their password; Google/Apple accounts sign in again to get a fresh session. |
| Sign in with Apple, offered alongside Google (4.8) | `apps/mobile/app/auth.tsx` native button; server `apple` provider in `apps/web/src/server/better-auth/config.ts` verifies identity tokens against the bundle IDs. |
| Apple token revocation on deletion (TN3194) | `account.revokeAppleAuthorization` → `apps/web/src/server/better-auth/apple.ts`. Needs the `APPLE_*` key variables below. |
| Privacy policy, terms and support inside the app | Profile > Pengaturan > Bantuan opens `/privacy`, `/terms`, `/support` and a mailto to `supportEmail` (`@hakgyo/shared`). |
| Purpose strings, privacy manifest, encryption flag | `apps/mobile/app.config.ts` (`privacyManifests`, `usesNonExemptEncryption: false`). |
| No undeclared background modes (2.5.4) | Background audio is off; widget, background-task, quick-action and share plugins were removed because nothing used them. |
| No purchase hand-off from the app (3.1.1) | The app never opens the web learner area; meetings without a link show an in-app notice. Payment review and rejection pushes are `webOnly`. |

## Manual steps before the first submission

1. **Apple Developer**
   - Enable the *Sign in with Apple* capability on `com.rorez.hakgyo` (EAS syncs capabilities on the next build).
   - Create a *Sign in with Apple* key (Keys > +). Download the `.p8`.
2. **Vercel (production env)**: set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (the `.p8` contents, newlines escaped as `\n`), then redeploy. Without them deletion still works but Apple tokens are not revoked, which App Review requires.
3. **App Store Connect**
   - Create the app record for `com.rorez.hakgyo`, then put its Apple ID in `apps/mobile/eas.json` under `submit.production.ios.ascAppId`.
   - Privacy Policy URL: `https://hakgyo.id/privacy`. Support URL: `https://hakgyo.id/support`.
   - App Privacy: name, email, user ID, device ID (push token), other user content (answers), product interaction (learning progress). All linked to the user, none used for tracking, purpose *App Functionality*. Audio is turned into text by Apple's speech recognition; Hakgyo never receives recordings.
   - Age rating: answer the current questionnaire (including the social-media question). No user-to-user messaging; account creation is available.
   - iPad screenshots are required because `supportsTablet` is true.
4. **Production data**: make sure the Hangeul Mastery course is `PUBLISHED`, otherwise a new reviewer account starts empty.
5. **Review account**: create a learner account in production that is enrolled in a Group belajar with materials, an open assessment and vocabulary, and put its credentials in App Review Information.
6. After the listing is live, set `STORE_URLS.ios` in `apps/mobile/src/components/forced-update-gate.tsx`.

## Review notes template

> Hakgyo is the learner app for Korean-language schools that run their classes on Hakgyo. Teachers and administrators manage courses on the web; the app is for learners only. Every new account is enrolled in the free Hangeul Mastery course. Further classes are assigned by the learner's school. Classes are not sold in the app.
>
> Demo learner: `<email>` / `<password>`. Account deletion: Profil > Pengaturan > Detail akun > Hapus akun.
