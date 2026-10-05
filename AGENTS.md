# Hakgyo V2

## Project Overview

Hakgyo V2 is a Bun/Turborepo monorepo containing the web and mobile clients for Hakgyo, a Korean-learning platform where organizations run courses for learners.

- `apps/web`: Next.js 16 application (React 19, Tailwind CSS 4, Better Auth, tRPC 11, Prisma 7 on Neon PostgreSQL, Cloudflare R2 storage). It hosts the teacher workspace, the learner web app, organization landing pages, the superadmin area, the shared tRPC API, the mobile sync endpoints and an MCP server.
- `apps/mobile`: Expo 57 / React Native learner app using Expo Router and NativeWind, with offline course bundles and an operation queue synced through `mobileSyncV2`.
- `packages/api`: type-only tRPC contract (`AppRouter`) consumed by Expo.
- `packages/shared`: code shared by both clients, including the mobile sync protocol (`@hakgyo/shared/mobile-sync`), learning helpers, colors and organization themes.

Core domain: organizations with members (OWNER, ADMIN, TEACHER) and a SIMPLE or ADVANCED permission mode; courses built from modules and items that place materials, vocabulary sets, PDF books and assessments; cohorts (study groups) with staff, enrollments and meetings; assessment attempts, teacher review and assessment events (tryouts/exams); vocabulary progress, practice and gamification. Topic docs live in `docs/` (for example `docs/api.md`, `docs/database.md`, `docs/mobile-sync.md`, `docs/mcp-server.md`).

## Repository Layout

```text
apps/
  web/
    src/app/                 Next.js App Router pages and API routes (tRPC, auth, MCP, mobile bundles, cron)
    src/server/api/          tRPC context, root router, and feature routers
    src/server/<domain>/     Domain services used by routers (assessment, course, mobile, vocabulary, ...)
    src/server/authorization/ Organization, course, cohort and course-item permission checks
    src/server/better-auth/  Better Auth server and client setup
    src/server/db.ts         Prisma client using the Neon adapter
    prisma/schema.prisma     Database schema and migrations source
    prisma/seed.ts           Seeded development accounts and content
  mobile/
    app/                     Expo Router routes (entry: expo-router/entry)
    src/sync/                Offline sync engine, store and hooks
    src/components, src/lib  React Native UI and client helpers
packages/
  api/                       Type-only export of the web AppRouter contract
  shared/                    Code shared between web and mobile
docs/                        Design notes and topic documentation
```

## Package Manager and Commands

Use Bun 1.3.14. Run commands from the repository root unless a package-specific command is needed.

```bash
bun install
bun run dev
bun run build
bun run lint
bun run typecheck
bun run format
```

Useful package-specific commands. Put `--cwd` after `run`; `bun --cwd <dir> run <script>` only prints usage.

```bash
bun run --cwd apps/web dev
bun run --cwd apps/web typecheck
bun run --cwd apps/web lint
bun run --cwd apps/web check
bun run --cwd apps/web db:generate
bun run --cwd apps/web db:migrate:dev   # create and apply a migration in development
bun run --cwd apps/web db:migrate       # prisma migrate deploy
bun run --cwd apps/web db:seed
bun run --cwd apps/web db:studio
bun run --cwd apps/mobile start
bun run --cwd apps/mobile android
bun run --cwd apps/mobile ios
bun run --cwd apps/mobile typecheck
```

`bun run dev` starts both workspace apps through Turbo. The mobile app can also be started independently with Expo.

## Testing

- Tests use `bun test` and live next to the code as `*.test.ts`. Run them per workspace (`cd apps/web && bun test`, likewise `apps/mobile` and `packages/shared`) or pass specific files.
- `*.integration.test.ts` files run against the database in `DATABASE_URL` and skip only when it is unset. Bun loads `apps/web/.env` automatically, so do not run them against the shared development database; run individual unit test files instead.
- CI (`.github/workflows/ci.yml`) currently runs lint and typecheck only.

## Environment and Database

- Copy `apps/web/.env.example` to `apps/web/.env` before running the web app.
- Server variables are validated in `apps/web/src/env.js`: `DATABASE_URL`, `DIRECT_URL`, `APP_URL`, Google OAuth credentials, Cloudflare R2 and Zoom credentials, and `BETTER_AUTH_SECRET` in production. Optional variables include `SUPERADMIN_EMAILS`, `CRON_SECRET`, AI/audio keys and web-push VAPID keys.
- The Expo client reads `EXPO_PUBLIC_API_URL` from `apps/mobile/.env` (see `apps/mobile/.env.example`). It must be the Next.js origin without `/api/trpc`; use a LAN address when testing on a physical device.
- `DATABASE_URL` is the pooled Neon connection used by the application. `DIRECT_URL` is the direct connection used by Prisma CLI commands.
- Never commit `apps/web/.env` or secrets.
- Edit `apps/web/prisma/schema.prisma` for schema changes, then use the appropriate Prisma command. The generated client under `apps/web/generated/prisma` is generated output and should not be edited manually.

## Browser Verification

- Use `https://jennie-linux.tail2268a1.ts.net` for browser checks against the shared development server.
- For authenticated checks, sign in at `/auth` with the seeded owner account `owner@hakgyo.test` and password `Hakgyo123!`. The complete seeded account list remains authoritative in `apps/web/prisma/seed.ts`.
- The isolated conversation-block preview is available at `/conversation-block-preview`; append `?variant=useful-expression`, `?variant=pronunciation`, or `?variant=both` to inspect each supporting-panel state.

## Web Conventions

- Use the App Router under `apps/web/src/app`.
- Add tRPC procedures to a feature router under `apps/web/src/server/api/routers`, then register that router in `src/server/api/root.ts`.
- Keep routers thin: procedures declare input schemas and delegate to domain services under `src/server/<domain>/` (for example `src/server/assessment/` for access checks, authoring, learner attempts and review). Services take the Prisma client and the acting user id so the same logic serves web, mobile sync and MCP callers.
- Enforce access with the helpers in `src/server/authorization` (`requireOrganizationPermission`, `requireCoursePermission`, `requireCohortPermission`, `requireCourseItemAccess`, `requireContentAuthor`) rather than ad hoc membership queries.
- Use `ctx.actorUserId` for the acting user. MCP tools call the same routers through `createMcpCaller`, where `ctx.session` is null.
- Changing a procedure's input or output changes the mobile contract exported by `packages/api`; run the mobile typecheck after such changes.
- Use `publicProcedure` for unauthenticated procedures, `protectedProcedure` for procedures requiring an authenticated user, `superadminProcedure` for the superadmin area, and `mobileProtocolProcedure` for mobile sync procedures that gate on the sync protocol version.
- Keep database access on the server through `src/server/db.ts`; do not import Prisma into client components.
- Use the `~/` path alias for imports within the web app.
- Keep links as semantic anchors. To make a Next.js `Link` or `<a>` look like a button, apply `buttonVariants` from `~/components/ui/button`; do not render links through Base UI `Button`, including with `nativeButton={false}`.
- On phone widths, use fewer cards and use all of the available space. Let sections run edge to edge and separate them with hairline borders instead of nesting cards, then restore card surfaces from `sm` up. Follow the auth route (`src/app/auth`, `AuthPanel`): `cardSurface` with `max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none`. Keep primary actions within thumb reach (a sticky bottom bar when the page scrolls), and prefer list rows over tables. Check every UI change at 390px wide.
- Keep authentication changes aligned across `src/server/better-auth/config.ts`, `server.ts`, `client.ts`, and the auth route.
- The shared tRPC endpoint is `/api/trpc`. Mobile authentication works by forwarding the Better Auth cookie returned by `authClient.getCookie()`.

## Mobile Conventions

- The app uses Expo Router (`"main": "expo-router/entry"`); routes live in `apps/mobile/app/` and the root layout is `app/_layout.tsx`.
- Import `global.css` in the root layout and use NativeWind classes for styling unless a native API requires a `StyleSheet`.
- Learner data flows through the offline sync layer in `src/sync/` (see `docs/mobile-sync.md`); queue writes as sync operations instead of calling mutations directly when the flow must work offline.
- Keep the `hakgyo` deep-link scheme aligned between `apps/mobile/app.json`, the Expo auth client, and Better Auth `trustedOrigins`.
- Native tabs use a nested `Stack` layout per tab. Keep tab root headers hidden by default; enable a header only for a tab that needs one.
- The Home tab uses an iOS-only transparent large-title header with `scrollEdgeEffects: { top: "soft" }` for iOS 26+ Liquid Glass behavior. Do not add `headerBlurEffect` alongside `scrollEdgeEffects`, because Expo documents that the effects can overlap.
- For transparent native headers, put the first `ScrollView` directly in the screen and use `contentInsetAdjustmentBehavior="automatic"`. Avoid manual `useSafeAreaInsets()` padding, which can double-apply navigator insets.
- Native tab tinting should use the semantic `primary` color family (`background`, `primary`, `foreground`, `border`), not the sidebar palette.
- Wrap the root native navigator in Expo Router’s `ThemeProvider` using `DarkTheme`/`DefaultTheme` selected from `useColorScheme()`. This prevents white flashes during iOS 26 native-tab transitions and Liquid Glass header rendering.
- Validate UI changes on both iOS and Android when platform-specific behavior is involved.

## Change and Verification Guidelines

- Keep changes scoped to the relevant workspace package.
- Update environment examples and validation together when adding configuration.
- After web changes, run `bun run --cwd apps/web typecheck` and `bun run --cwd apps/web lint` when applicable.
- After shared or workspace configuration changes, run the corresponding root Turbo command.
- Do not add generated files, local environment files, build output, or dependency directories to commits.
- Land changes on `main` through pull requests. Linear history is required on `main`, so merge with squash or rebase rather than a merge commit.
