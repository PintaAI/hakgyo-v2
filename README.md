# Hakgyo V2

Hakgyo V2 is a Bun/Turborepo monorepo with a Next.js backend/web client and an Expo mobile client. Both clients use Better Auth and the same type-safe tRPC API hosted by Next.js.

## Local Setup

```bash
bun install
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Configure `apps/web/.env` with the Neon database connection and Google OAuth credentials. Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to the origin of the Next.js app:

- iOS simulator: `http://localhost:3000`
- Android emulator: `http://10.0.2.2:3000`
- Physical device: use the computer's LAN address, such as `http://192.168.1.10:3000`

Start both apps:

```bash
bun run dev
```

The API is served at `/api/trpc` and Better Auth is served at `/api/auth`. The mobile client forwards Better Auth's securely stored session cookie to tRPC protected procedures.

## Google OAuth

Create a Google OAuth client with application type **Web application**. Add these authorized redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://your-domain.com/api/auth/callback/google
```

Better Auth completes OAuth on the Next.js backend and redirects the native app through the `hakgyo://` scheme. The native bundle ID and Android package are both `com.rorez.hakgyo`.

## Vercel and Mobile

Deploy `apps/web` as the Vercel project and configure all variables from `apps/web/.env.example`. Set `APP_URL` to the stable production origin, not a preview deployment URL. Better Auth and Zoom OAuth both derive their callback URLs from this value.

For production mobile builds, set:

```text
EXPO_PUBLIC_API_URL=https://your-domain.com
```

`EXPO_PUBLIC_API_URL` is embedded in the mobile bundle and is not a secret. Rebuild or publish an EAS Update when changing it.

## Shared API Contract

`packages/api` exports only the `AppRouter` TypeScript type. Runtime server code remains in `apps/web`, while Expo gets end-to-end input and output types without bundling Prisma or server credentials.
