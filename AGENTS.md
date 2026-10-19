# Hakgyo V2

## Project Overview

Hakgyo V2 is a Bun/Turborepo monorepo containing the web and mobile clients for Hakgyo, a Korean-learning platform where organizations run courses for learners.

- `apps/web`: Next.js 16 application (React 19, Tailwind CSS 4, Better Auth, tRPC 11, Prisma 7 on Neon PostgreSQL, Cloudflare R2 storage). It hosts the teacher workspace, the learner web app, organization landing pages, the superadmin area, the shared tRPC API, the mobile sync endpoints and an MCP server.
- `apps/mobile`: Expo 57 / React Native learner app using Expo Router and NativeWind, with offline course bundles and an operation queue synced through `mobileSyncV2`.
- `packages/api`: type-only tRPC contract (`AppRouter`) consumed by Expo.
- `packages/shared`: code shared by both clients, including the mobile sync protocol (`@hakgyo/shared/mobile-sync`), learning helpers, colors and organization themes.

Core domain: organizations with members (OWNER, ADMIN, TEACHER) and a SIMPLE or ADVANCED permission mode; courses built from modules and items that place materials, vocabulary sets, PDF books and assessments; cohorts (study groups) with staff, enrollments and meetings; assessment attempts, teacher review and assessment events (Latihan and Tryout for one or more classes, see `docs/assessment-events.md`); vocabulary progress, practice and gamification. Topic docs live in `docs/` (for example `docs/api.md`, `docs/database.md`, `docs/mobile-sync.md`, `docs/mobile-releases.md`, `docs/maintenance.md`, `docs/mcp-server.md`).

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
bun run --cwd apps/mobile ota:publish --channel production --message "…"  # guarded EAS Update
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
- Add tRPC procedures to a feature router under `apps/web/src/server/api/routers`, then register that router in `src/server/api/root.ts` with `lazy(() => import(...))` like the others. Cold starts then load only the routers a request calls. Code that reads procedure definitions directly (the MCP tool schemas) must call `loadAllRouters()` first.
- Keep routers thin: procedures declare input schemas and delegate to domain services under `src/server/<domain>/` (for example `src/server/assessment/` for access checks, authoring, learner attempts and review). Services take the Prisma client and the acting user id so the same logic serves web, mobile sync and MCP callers.
- Enforce access with the helpers in `src/server/authorization` (`requireOrganizationPermission`, `requireCoursePermission`, `requireCohortPermission`, `requireCourseItemAccess`, `requireContentAuthor`) rather than ad hoc membership queries.
- Use `ctx.actorUserId` for the acting user. MCP tools call the same routers through `createMcpCaller`, where `ctx.session` is null.
- Changing a procedure's input or output changes the mobile contract exported by `packages/api`; run the mobile typecheck after such changes.
- Use `publicProcedure` for unauthenticated procedures, `protectedProcedure` for procedures requiring an authenticated user, `superadminProcedure` for the superadmin area, and `mobileProtocolProcedure` for mobile sync procedures that gate on the sync protocol version.
- Keep database access on the server through `src/server/db.ts`; do not import Prisma into client components.
- Use the `~/` path alias for imports within the web app.
- Import `Link` from `~/components/link`, not `next/link` (ESLint enforces this). It prefetches when the user hovers, focuses or touches a link instead of whenever it scrolls into view, because each prefetch of a dynamic route is a function call on Vercel.
- Keep Vercel function calls low. Every request is billed compute.
  - Load a page's data in its server render: `await api.x.prefetch(input)` and wrap the page in `HydrateClient`. Don't leave it to client `useQuery` calls after hydration. Await the prefetch: a pending query renders a skeleton on the server and can cause a hydration mismatch. ESLint rejects `void` prefetches under `src/app`.
  - Vercel renders in UTC, while users are mostly in WIB. Render timestamps in server-rendered UI with `LocalDateTime` (`~/components/local-date-time`), or pass an explicit `timeZone`. Never format them with the runtime's default zone.
  - Don't poll unless the data changes because of other people. Prefer refetching on focus or on user action.
  - Don't export `maxDuration` (or other segment config that differs from the default) from a route without a reason. It splits the route into its own Vercel function with its own cold starts.
- Keep links as semantic anchors. To make a Next.js `Link` or `<a>` look like a button, apply `buttonVariants` from `~/components/ui/button`; do not render links through Base UI `Button`, including with `nativeButton={false}`.
- On phone widths, use fewer cards and use all of the available space. Let sections run edge to edge and separate them with hairline borders instead of nesting cards, then restore card surfaces from `sm` up. Follow the auth route (`src/app/auth`, `AuthPanel`): `cardSurface` with `max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none`. Keep primary actions within thumb reach (a sticky bottom bar when the page scrolls), and prefer list rows over tables. Check every UI change at 390px wide.
- Maintenance mode (`MAINTENANCE_MODE`, see `docs/maintenance.md`) is read only through `getMaintenanceState()` in `src/server/maintenance.ts`. tRPC procedures get it from the base procedure; wrap new route handlers with `guardRoute("read" | "write", handler)`, call `skipCronDuringMaintenance()` in new cron routes, and skip writes made by reads when `writesBlockedByMaintenance()`. Temporary unavailability must use `SERVICE_UNAVAILABLE`, never a code the mobile sync engine treats as terminal.
- Keep authentication changes aligned across `src/server/better-auth/config.ts`, `server.ts`, `client.ts`, and the auth route.
- The shared tRPC endpoint is `/api/trpc`. Mobile authentication works by forwarding the Better Auth cookie returned by `authClient.getCookie()`.

## Mobile Conventions

- The app uses Expo Router (`"main": "expo-router/entry"`); routes live in `apps/mobile/app/` and the root layout is `app/_layout.tsx`.
- Import `global.css` in the root layout and use NativeWind classes for styling unless a native API requires a `StyleSheet`.
- Reuse the shared UI primitives in `src/components/ui` (re-exported from `src/components/learning-ui.tsx`: `Action`, `Card`, `Eyebrow`, `ProgressBar`, `Badge`, `FullScreenState`, `TextField` and so on) instead of hand-rolling buttons, cards, labels and loading or error states. `Action` buttons and `Card` surfaces are `rounded-2xl` rectangles (`StudyGlass` glass surfaces default to a radius of 20), and screens use the `px-5` gutter. `Action` takes a `variant` (`primary`, `secondary`, `outline`, `destructive`, `destructiveTinted`, `link`, `ghost`) and a `size` (`default`, `sm`, and `inline` for text-only links within content). For glass tints use `glassTint()`, and open course items and assessment events with the helpers in `src/lib/navigation.ts`.
- Learner data flows through the offline sync layer in `src/sync/` (see `docs/mobile-sync.md`); queue writes as sync operations instead of calling mutations directly when the flow must work offline.
- Publish EAS Updates with `ota:publish`, never plain `eas update`: it refuses when an installed build on the channel has different native code. Bump `version` in `app.config.ts` when native code changes (see `docs/mobile-releases.md`).
- Keep the `hakgyo` deep-link scheme aligned between `apps/mobile/app.json`, the Expo auth client, and Better Auth `trustedOrigins`.
- Native tabs use a nested `Stack` layout per tab, and each layout takes its screen options from `useTabStackScreenOptions()` (`src/navigation/tab-stack-options.ts`). Tab roots show a transparent native header on iOS (it carries the sidebar button followed by the org switcher, plus a settings gear on the right that turns into the updates bell while updates are unread, or just the updates bell, as `Stack.Toolbar` items; a screen has one toolbar per side, and `Stack.Toolbar` ignores children wrapped in fragments) and no header on Android, where `AndroidTabActions` renders the same buttons inside the content. There is no native large title: Home, Latihan and Cari render their own in-content title, and Belajar (Learn) bleeds its cohort cards under the header instead. Build tab roots with `TabScreen` (`src/components/tab-screen.tsx`), which wires up the header actions, the optional `PageTitle` (with an optional icon) and, on Home only, the doodle background. Profil is not a tab: it is a page sheet (`app/profile`) opened from the sidebar, the Home greeting and the header gear.
- The tab headers use `scrollEdgeEffects: { top: "soft" }` for iOS 26+ Liquid Glass behavior; older iOS versions ignore it and keep the transparent header. Do not add `headerBlurEffect` alongside `scrollEdgeEffects`, because Expo documents that the effects can overlap.
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
