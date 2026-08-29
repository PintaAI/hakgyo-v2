# Mobile Authentication and Protected Routes

This document records the Better Auth and Expo Router approach for the Hakgyo mobile app. It is based on the current project configuration and the official documentation:

- [Better Auth Expo integration](https://better-auth.com/docs/integrations/expo)
- [Expo Router authentication](https://docs.expo.dev/router/advanced/authentication/)
- [Expo Router protected routes](https://docs.expo.dev/router/advanced/protected/)

## Current Project

The mobile app uses Expo SDK 57, Expo Router, Better Auth 1.7.1, Secure Store, and tRPC.

The Better Auth Expo guide currently describes Expo SDK 55. The integration principles apply to this project, but all implementation and verification should use the versions installed in `apps/mobile/package.json` rather than copying SDK-specific snippets blindly.

The existing integration already includes:

- `apps/web/src/server/better-auth/config.ts`
  - Enables email/password authentication.
  - Configures Google OAuth.
  - Installs the Better Auth `expo()` server plugin.
  - Trusts `hakgyo://` and development `exp://` origins.
- `apps/mobile/src/lib/auth-client.ts`
  - Uses `createAuthClient` and `expoClient`.
  - Stores session data and cookies in `expo-secure-store`.
  - Uses the `hakgyo` deep-link scheme and `hakgyo` storage prefix.
- `apps/mobile/src/lib/trpc.tsx`
  - Calls `authClient.getCookie()` for every request.
  - Sends the value as the `cookie` header.
  - Uses `credentials: "omit"` because native requests provide the cookie manually.
- `apps/mobile/app.json`
  - Declares the `hakgyo` scheme.

The current authentication UI and routing are still scaffolding:

- `apps/mobile/app/index.tsx` always redirects to onboarding.
- `apps/mobile/app/auth.tsx` navigates to home without calling Better Auth.
- `apps/mobile/app/_layout.tsx` declares onboarding, auth, and home routes but does not guard them.
- There is no splash-screen wait for the initial session lookup.
- `apps/mobile/src/lib/trpc.tsx` defines the authenticated tRPC provider, but it is not currently mounted by `apps/mobile/app/_layout.tsx`.

## Recommended Authentication Model

Use the Better Auth session as the single source of truth for authentication. Do not add a second persisted token or duplicate auth state unless a concrete product requirement needs it.

The root navigator should read the Better Auth session and expose three states:

| State | Navigation behavior |
| --- | --- |
| Session loading | Keep the splash screen visible and do not render a redirecting route yet. |
| No session | Allow onboarding and auth routes; block the home route. |
| Session available | Allow the home route; block onboarding and auth routes. |

The session cache in the Expo Better Auth client is persisted through Secure Store. It is useful for reducing startup flicker, but the server remains authoritative. A server rejection or expired session must still return the user to the unauthenticated flow.

## Protected Route Pattern

Expo Router SDK 57 supports `Stack.Protected`. The root stack should be the place where the top-level route groups are protected:

```tsx
<Stack>
  <Stack.Protected guard={Boolean(session)}>
    <Stack.Screen name="(home)" />
  </Stack.Protected>

  <Stack.Protected guard={!session}>
    <Stack.Screen name="(onboarding)" />
    <Stack.Screen name="auth" options={authSheetOptions} />
  </Stack.Protected>
</Stack>
```

The exact implementation should use the session hook exposed by the installed Better Auth client. The root navigator must be rendered below the component that can call that hook.

When a guard changes from true to false, Expo Router removes the protected route's history entries and redirects to the first available route. This means sign-out should update the Better Auth session and should not need to manually navigate to onboarding.

Protected routes are client-side navigation protection, not a security boundary. Every server-side tRPC procedure that contains private data or mutations must continue to use `protectedProcedure` and validate the Better Auth session on the server.

## Sign-In Flow

### Email and Password

`apps/mobile/app/auth.tsx` should:

1. Keep controlled email and password values.
2. Call `authClient.signIn.email({ email, password })`.
3. Display the returned error instead of navigating on failure.
4. Let the session update activate the home guard.
5. Optionally call `router.replace("/(home)/(tabs)/home")` after a successful result if the router does not react immediately to the session update.

The button must not navigate to home before Better Auth reports success.

### Google OAuth

Use `authClient.signIn.social({ provider: "google", callbackURL: "/..." })`.

The Expo plugin converts a relative callback path into a deep link using the configured `hakgyo` scheme. On native, social sign-in does not necessarily navigate automatically, so handle the result and allow the protected route state to determine the final screen.

The server already contains the required Google provider configuration. The mobile flow still needs to be wired to the UI and tested in a development build because OAuth callbacks cannot be validated reliably in an ordinary Expo Go session.

## Startup and Splash Screen

Authentication state is asynchronous. The root layout should prevent the splash screen from hiding until the initial Better Auth session query has completed.

Recommended behavior:

1. Call `SplashScreen.preventAutoHideAsync()` at module load.
2. Read the Better Auth session in the root navigation component.
3. Keep the navigator from making auth redirects while the session is pending.
4. Call `SplashScreen.hideAsync()` once the session state is known.

This prevents a launch sequence such as onboarding -> home, or home -> auth, while the cached session is being restored.

## Route Responsibilities

| Route | Responsibility | Authentication |
| --- | --- | --- |
| `app/index.tsx` | Optional neutral entry point. It should stop unconditionally redirecting to onboarding once root guards are active. | Depends on root guards |
| `app/(onboarding)/start.tsx` | Explain the product and link to auth. | Signed out only |
| `app/auth.tsx` | Email/password and Google sign-in. | Signed out only |
| `app/(home)/` | Authenticated application shell and tabs. | Signed in only |

The auth screen is currently configured as a form sheet. Keep that presentation option, but make its availability depend on the signed-out guard.

## Request and Cookie Rules

The current tRPC link follows Better Auth's native recommendation:

```ts
const cookie = await authClient.getCookie();

return {
  ...(cookie ? { cookie } : {}),
};
```

Keep `credentials: "omit"` when manually sending the cookie. Do not rely on browser cookie behavior from React Native. Do not log the cookie or include it in error reports.

The API URL must remain the Next.js origin, without `/api/trpc`:

```text
EXPO_PUBLIC_API_URL=https://your-hakgyo-web-origin
```

The tRPC client appends `/api/trpc` itself.

## Implementation Plan

1. Add a small mobile session provider or root session hook that exposes `session` and its loading state from `authClient.useSession()`.
2. Add splash-screen coordination around the initial session lookup.
3. Replace the root stack declarations with `Stack.Protected` guards.
4. Remove the unconditional redirect in `app/index.tsx`, or make it a neutral route that is compatible with the guarded stack.
5. Wire the email/password form to `authClient.signIn.email` with loading and error states.
6. Wire Google sign-in and verify the `hakgyo://` callback in a development build.
7. Add sign-out through `authClient.signOut()` and verify that the home history is removed.
8. Test cold launch, valid cached session, expired session, failed sign-in, successful sign-in, OAuth callback, and sign-out.

## Decisions Still Needed

These product decisions should be made before implementing the route guards:

- Should onboarding appear on every signed-out launch, or only until a local onboarding-completed flag is stored?
- After sign-in, should the auth form sheet dismiss first, or should the protected route replace the current stack directly?
- Should an expired session return to onboarding or directly to the auth sheet?
- Is Google sign-in required in the first mobile release, or should email/password be implemented first?

## Verification

Run the mobile typecheck after implementation:

```bash
bun --cwd apps/mobile run typecheck
```

Also test with a development build on both platforms when validating Secure Store, deep links, and OAuth. Route guards alone do not verify backend authorization; protected tRPC procedures must be exercised with both authenticated and unauthenticated requests.
