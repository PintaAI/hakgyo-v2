# Hakgyo V2

## Project Overview

Hakgyo V2 is a Bun/Turborepo monorepo containing the web and mobile clients for Hakgyo.
The project is currently an early scaffold:

- `apps/web`: Next.js 15 application using React 19, Tailwind CSS 4, Better Auth, tRPC, Prisma, and PostgreSQL on Neon.
- `apps/mobile`: Expo 57 / React Native application using NativeWind. It currently contains the initial welcome screen only.
- `packages/api`: type-only tRPC contract consumed by Expo.
- `packages/shared`: reserved workspace package for other code shared between clients; it is currently empty.

The web app currently includes GitHub OAuth and email/password configuration through Better Auth, a tRPC `post` router, and the starter `Post` model. Do not treat the starter post flow as the final Hakgyo domain model.

## Repository Layout

```text
apps/
  web/
    src/app/                 Next.js App Router pages and API routes
    src/server/better-auth/  Better Auth server and client setup
    src/server/api/          tRPC context, root router, and feature routers
    src/server/db.ts         Prisma client using the Neon adapter
    prisma/schema.prisma     Database schema and migrations source
  mobile/                    Expo entry point and React Native UI
packages/
  api/                       Type-only export of the web AppRouter contract
  shared/                    Future shared types/utilities
```

## Package Manager and Commands

Use Bun 1.2.0. Run commands from the repository root unless a package-specific command is needed.

```bash
bun install
bun run dev
bun run build
bun run lint
bun run format
```

Useful package-specific commands:

```bash
bun --cwd apps/web run dev
bun --cwd apps/web run typecheck
bun --cwd apps/web run check
bun --cwd apps/web run db:generate
bun --cwd apps/web run db:migrate
bun --cwd apps/web run db:push
bun --cwd apps/web run db:studio
bun --cwd apps/mobile run start
bun --cwd apps/mobile run android
bun --cwd apps/mobile run ios
bun --cwd apps/mobile run typecheck
```

`bun run dev` starts both workspace apps through Turbo. The mobile app can also be started independently with Expo.

## Environment and Database

- Copy `apps/web/.env.example` to `apps/web/.env` before running the web app.
- Required server variables are validated in `apps/web/src/env.js`: `DATABASE_URL`, `DIRECT_URL`, `APP_URL`, Google OAuth credentials, and `BETTER_AUTH_SECRET` in production.
- The Expo client reads `EXPO_PUBLIC_API_URL` from `apps/mobile/.env`. It must be the Next.js origin without `/api/trpc`; use a LAN address when testing on a physical device.
- `DATABASE_URL` is the pooled Neon connection used by the application. `DIRECT_URL` is the direct connection used by Prisma CLI commands.
- Never commit `apps/web/.env` or secrets.
- Edit `apps/web/prisma/schema.prisma` for schema changes, then use the appropriate Prisma command. The generated client under `apps/web/generated/prisma` is generated output and should not be edited manually.

## Web Conventions

- Use the App Router under `apps/web/src/app`.
- Add tRPC procedures to a feature router under `apps/web/src/server/api/routers`, then register that router in `src/server/api/root.ts`.
- Use `publicProcedure` for unauthenticated procedures and `protectedProcedure` for procedures requiring a session.
- Keep database access on the server through `src/server/db.ts`; do not import Prisma into client components.
- Use the `~/` path alias for imports within the web app.
- Keep authentication changes aligned across `src/server/better-auth/config.ts`, `server.ts`, `client.ts`, and the auth route.
- The shared tRPC endpoint is `/api/trpc`. Mobile authentication works by forwarding the Better Auth cookie returned by `authClient.getCookie()`.

## Mobile Conventions

- The entry point is `apps/mobile/index.ts`, which registers `apps/mobile/App.tsx` with Expo.
- Import `global.css` in the app entry and use NativeWind classes for styling unless a native API requires a `StyleSheet`.
- Keep the `hakgyo` deep-link scheme aligned between `apps/mobile/app.json`, the Expo auth client, and Better Auth `trustedOrigins`.
- Validate UI changes on both iOS and Android when platform-specific behavior is involved.

## Change and Verification Guidelines

- Keep changes scoped to the relevant workspace package.
- Update environment examples and validation together when adding configuration.
- After web changes, run `bun --cwd apps/web run typecheck` and `bun --cwd apps/web run lint` when applicable.
- After shared or workspace configuration changes, run the corresponding root Turbo command.
- Do not add generated files, local environment files, build output, or dependency directories to commits.
