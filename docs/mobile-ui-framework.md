# Hakgyo Mobile UI Framework

## Status

This document defines the target UI scaffold and implementation conventions for `apps/mobile`.
It adapts the proven structural patterns from Ethos to Hakgyo's organization, cohort,
assessment, and role-based workflows. It is a framework for future implementation, not a
description of the current single-screen mobile app.

## Goals

- Make route ownership obvious from the filesystem.
- Keep native navigation behavior consistent on iOS and Android.
- Present short, focused tasks as native form sheets and long workflows as screens.
- Share visual primitives without building a large generic component library.
- Keep server state, local SQLite state, and synchronization responsibilities separate.
- Support student, teacher, and administrator experiences in one route tree.
- Give quick actions, widgets, inbound shares, and deep links stable route targets.

## Core Principles

1. **Route groups describe navigation context, not authorization.** Use `(auth)` and
   `(workspace)` groups. Do not create separate student, teacher, and administrator route
   trees. Permissions decide which actions are visible and allowed.
2. **The stack that opens a sheet owns that sheet.** Register form routes as direct children
   of the stack above the tabs. Do not add an inner stack around a form-sheet route.
3. **Routes compose features; they do not implement data access.** Route files may coordinate
   feature hooks and components, but repositories and synchronization stay outside `app/`.
4. **Local writes succeed offline first.** UI mutations write to SQLite and enqueue sync work.
   A screen does not wait for network access unless the operation is inherently online-only.
5. **Prefer native navigation and platform behavior.** Let stacks own titles, back buttons,
   sheets, and toolbars. Use platform-specific files only when behavior truly differs.
6. **Start with the smallest reusable component.** Keep one-off composition in its feature.
   Promote it to `components/ui` only after it becomes a stable cross-feature primitive.

## Target Directory Structure

```text
apps/mobile/
  app/
    _layout.tsx
    index.tsx
    +not-found.tsx
    inbound-share.tsx
    (auth)/
      _layout.tsx
      sign-in.tsx
      sign-up.tsx
    (workspace)/
      _layout.tsx
      organization-picker.tsx
      search.tsx
      (tabs)/
        _layout.tsx
        home/
          _layout.tsx
          index.tsx
        cohorts/
          _layout.tsx
          index.tsx
          [cohortId].tsx
        assessments/
          _layout.tsx
          index.tsx
          [assessmentId].tsx
        profile/
          _layout.tsx
          index.tsx
          account.tsx
          preferences.tsx
      forms/
        cohort-create.tsx
        cohort-invite.tsx
        assessment-create.tsx
        assessment-submit.tsx
        attendance-mark.tsx
  src/
    components/
      ui/
        AppButton.tsx
        AppSymbol.tsx
        AppText.tsx
        AppTextInput.tsx
        EmptyState.tsx
        FormField.tsx
        FormSection.tsx
        Screen.tsx
        SheetBody.tsx
      navigation/
        OfflineIndicator.tsx
        SyncStatusButton.tsx
      forms/
        AndroidFormFooter.tsx
        FormError.tsx
    features/
      auth/
        components/
        hooks/
      cohorts/
        components/
        hooks/
      assessments/
        components/
        hooks/
      attendance/
        components/
        hooks/
      profile/
        components/
        hooks/
    providers/
      AppProviders.tsx
      AppThemeProvider.tsx
      AuthBootstrapProvider.tsx
      OfflineSyncProvider.tsx
      ToastProvider.tsx
    navigation/
      form-sheet-options.ts
      routes.ts
    data/
      db/
        migrations.ts
        schema.ts
      repositories/
      sync/
        mutation-queue.ts
        sync-engine.ts
    lib/
      auth-client.ts
      query-client.ts
      trpc.tsx
    native/
      quick-actions.ts
      sharing.ts
    widgets/
      upcoming-work.tsx
    tasks/
      background-sync.ts
    config.ts
  global.css
  app.json
  eas.json
  metro.config.js
  package.json
  tsconfig.json
```

Create folders only when their first real file is introduced. The tree defines ownership; it
does not require empty placeholder directories.

## Routing Model

### Root Layout

`app/_layout.tsx` is infrastructure only. It should:

- Import `global.css` once.
- Mount `GestureHandlerRootView` and `SafeAreaProvider`.
- Mount the provider composition from `src/providers/AppProviders.tsx`.
- Declare root stack entries for `(auth)`, `(workspace)`, and `inbound-share`.
- Apply the app navigation theme and global screen defaults.

It should not contain feature queries, form state, or permission prompts. Ask for notification,
camera, and photo permissions when the user invokes the relevant feature, not at startup.

```tsx
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <Stack screenOptions={rootScreenOptions}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(workspace)" options={{ headerShown: false }} />
            <Stack.Screen
              name="inbound-share"
              options={{ presentation: "modal" }}
            />
          </Stack>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

### Startup Route

`app/index.tsx` is the only startup decision point. It waits for authentication, the local
database, and the last selected organization, then uses `router.replace`:

| Condition                          | Destination                        |
| ---------------------------------- | ---------------------------------- |
| No authenticated session           | `/(auth)/sign-in`                  |
| Session but no active organization | `/(workspace)/organization-picker` |
| Session and active organization    | `/(workspace)/(tabs)/home`         |

Render a branded loading state while the decision is unresolved. Do not let every screen
implement its own startup redirect.

### Authentication Group

`(auth)` owns sign-in and sign-up screens. Authentication success returns to `app/index.tsx`,
which chooses the correct workspace destination. Password reset and email verification can be
added to this group later.

Authentication screens are full screens by default. A compact re-authentication prompt may be
a root form sheet, but it should be a separate route from initial sign-in.

### Workspace Stack

`(workspace)/_layout.tsx` owns the tabs, workspace-level detail screens, and all forms that must
open above the tab bar.

```tsx
export default function WorkspaceLayout() {
  return (
    <Stack screenOptions={workspaceScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="organization-picker" options={pageSheetOptions} />
      <Stack.Screen name="search" options={pageSheetOptions} />
      <Stack.Screen
        name="forms/cohort-create"
        options={standardFormSheetOptions}
      />
      <Stack.Screen
        name="forms/cohort-invite"
        options={compactFormSheetOptions}
      />
      <Stack.Screen
        name="forms/assessment-create"
        options={largeFormSheetOptions}
      />
      <Stack.Screen
        name="forms/assessment-submit"
        options={largeFormSheetOptions}
      />
      <Stack.Screen
        name="forms/attendance-mark"
        options={standardFormSheetOptions}
      />
    </Stack>
  );
}
```

Register a route here when it must cover multiple tabs or preserve the selected tab underneath.
Register a route inside a tab stack when it is a normal drill-down destination owned by that tab.

### Tabs

Use Expo Router native tabs with four stable destinations:

| Tab         | Purpose                                                       |
| ----------- | ------------------------------------------------------------- |
| Home        | Today, announcements, upcoming work, and role-aware shortcuts |
| Cohorts     | Classes, membership, roster, and attendance entry points      |
| Assessments | Assignments, quizzes, submissions, grading, and feedback      |
| Profile     | Account, organization selection, preferences, and sync status |

Teachers and administrators may see creation actions that students do not, but tab identities
remain stable across roles. This prevents role changes from creating a second navigation model.

Each tab receives its own nested stack so detail screens keep a native back history. The tab
layout owns tab icons and labels; the nested layout owns titles and detail presentation.

## Form-Sheet Framework

### Sheet Presets

Keep all reusable native stack options in `src/navigation/form-sheet-options.ts`. Use a small set
of named presets instead of tuning every route independently.

```tsx
import { Platform } from "react-native";

const iosBase = {
  presentation: "formSheet" as const,
  headerLargeTitle: false,
  headerTransparent: true,
  sheetExpandsWhenScrolledToEdge: false,
  sheetGrabberVisible: true,
};

const androidBase = {
  presentation: "formSheet" as const,
  headerLargeTitle: false,
  headerTransparent: false,
  sheetInitialDetentIndex: 0,
  sheetCornerRadius: 28,
  sheetElevation: 24,
  sheetShouldOverflowTopInset: false,
  sheetLargestUndimmedDetentIndex: "none" as const,
};

export const compactFormSheetOptions = Platform.select({
  ios: { ...iosBase, sheetAllowedDetents: "fitToContents" as const },
  default: {
    ...androidBase,
    sheetAllowedDetents: "fitToContents" as const,
    sheetResizeAnimationEnabled: true,
  },
});

export const standardFormSheetOptions = Platform.select({
  ios: { ...iosBase, sheetAllowedDetents: [0.65, 0.92] as [number, number] },
  default: {
    ...androidBase,
    sheetAllowedDetents: [0.7, 1] as [number, number],
  },
});

export const largeFormSheetOptions = Platform.select({
  ios: { ...iosBase, sheetAllowedDetents: [0.92] as [number] },
  default: { ...androidBase, sheetAllowedDetents: [1] as [number] },
});

export const pageSheetOptions = Platform.select({
  ios: { ...iosBase, sheetAllowedDetents: [0.92] as [number] },
  default: { presentation: "modal" as const, headerLargeTitle: false },
});
```

### Choosing a Presentation

| Content                                     | Presentation         |
| ------------------------------------------- | -------------------- |
| Confirmation, invite code, small preference | Compact form sheet   |
| Short create/edit form                      | Standard form sheet  |
| Submission, grading, attendance roster      | Large form sheet     |
| Multi-step workflow or dense document       | Full screen          |
| Read-only detail reached from a tab         | Normal pushed screen |

Do not use `fitToContents` for long scrollable forms. Do not force every task into a sheet merely
because it edits data.

### Route Ownership Rules

- A form sheet is a direct child of its owning stack.
- A form route must not contain its own `_layout.tsx` unless it intentionally starts a nested
  navigation flow.
- Detail routes opened from a sheet may be sibling routes in the same parent stack.
- The route sets its title and toolbar through `<Stack.Screen>` and `<Stack.Toolbar>`.
- Navigation options determine presentation; the screen body determines content and validation.

### Form Body Pattern

Every sheet body follows this shape:

```tsx
export default function CohortInviteForm() {
  return (
    <>
      <Stack.Screen options={{ title: "Invite learners" }} />
      <SheetBody keyboardShouldPersistTaps="handled">
        <FormSection>
          <FormField label="Email address">...</FormField>
        </FormSection>
      </SheetBody>
    </>
  );
}
```

`SheetBody` standardizes background, automatic content insets, keyboard persistence, horizontal
padding, and bottom spacing. Keep feature-specific fields in the route or feature component.

On iOS, prefer native stack toolbar actions for close and save. On Android, use
`unstable_sheetFooter` with `AndroidFormFooter` when actions must remain visible. The form's save
function remains shared; only action placement varies.

### Form State and Submission

- Keep transient field state in the form route or a dedicated feature hook.
- Validate before writing to SQLite.
- Disable duplicate submission while a local transaction is running.
- Write the local entity and mutation-queue record in one SQLite transaction.
- Dismiss after the local transaction succeeds; synchronization may continue afterward.
- Show server rejection or conflict state through the affected record and sync UI, not a lost
  transient toast.
- Use destructive native alerts for deletions that cannot be trivially undone.

## Component Organization

### `components/ui`

Cross-feature visual primitives live here. They may depend on theme and React Native APIs, but not
on cohorts, assessments, tRPC routers, or repositories.

Recommended initial primitives:

- `AppText`: typography and accessibility scaling.
- `AppTextInput`: shared focus, error, disabled, and platform styling.
- `AppButton`: primary, secondary, ghost, and destructive actions.
- `AppSymbol`: one semantic icon API with iOS and Android mappings.
- `Screen`: full-screen scroll and inset defaults.
- `SheetBody`: form-sheet scroll and inset defaults.
- `FormSection` and `FormField`: labels, help text, and validation errors.
- `EmptyState`: concise no-data and recovery states.

Avoid primitives that merely rename `View` or `Pressable` without enforcing a real convention.

### `components/navigation`

Components coupled to navigation chrome but not one feature belong here, such as sync status,
offline state, organization switchers, and shared header actions.

### `components/forms`

Cross-feature form infrastructure belongs here. Platform-specific action placement and generic
error presentation are examples. Domain fields remain under their feature.

### `features/<feature>`

Feature-owned UI and hooks live together:

```text
features/cohorts/
  components/
    CohortCard.tsx
    CohortRoster.tsx
  hooks/
    useCohort.ts
    useCohortActions.ts
```

A feature component may import `components/ui`, repositories, and generated tRPC types. A UI
primitive must never import a feature.

### Platform Variants

Use React Native file resolution for genuinely different native implementations:

```text
AppSegmentedControl.tsx
AppSegmentedControl.android.tsx
ProfilePreferences.tsx
ProfilePreferences.ios.tsx
```

Keep the props contract identical across variants. Before editing a shared component, search for
`.ios.tsx`, `.android.tsx`, `.native.tsx`, and `.web.tsx` siblings.

Use `Platform.select` for small option or style differences. Use file variants when the component
tree, native API, or interaction model differs substantially.

## Theme and Visual Tokens

- Define semantic colors such as `background`, `surface`, `foreground`, `muted`, `primary`,
  `positive`, `warning`, and `negative`.
- Expose tokens through an app theme provider and NativeWind CSS variables.
- Do not scatter literal brand colors across route files.
- Let navigation consume the same theme as screen content.
- Keep spacing and radius choices limited and intentional.
- Prefer hierarchy, whitespace, and native headers over wrapping every section in a card.

`@expo/ui` is allowed for focused native controls where it improves platform fidelity. Wrap it in
a stable Hakgyo component or provide platform variants; feature routes should not accumulate raw
SwiftUI- or Compose-specific implementation details.

## Provider Composition

Compose providers once in `src/providers/AppProviders.tsx`. The intended dependency order is:

```text
AppThemeProvider
  Navigation ThemeProvider
    TRPCProvider / QueryClientProvider
      AuthBootstrapProvider
        SQLiteProvider
          OfflineSyncProvider
            ToastProvider
              Router content
```

Responsibilities:

| Provider       | Responsibility                                                  |
| -------------- | --------------------------------------------------------------- |
| App theme      | Semantic colors, system color scheme, and CSS variables         |
| TRPC/query     | Remote requests and server-state lifecycle                      |
| Auth bootstrap | Session readiness and active account identity                   |
| SQLite         | Open database, run migrations, and expose database readiness    |
| Offline sync   | Network observation, queue draining, conflicts, and sync status |
| Toast          | Ephemeral feedback only                                         |

Do not add a global provider for every feature. Prefer repository hooks and localized query hooks
until shared reactive state is demonstrably necessary.

## Offline UI Contract

The UI reads durable domain records from SQLite. TanStack Query remains useful for server-only
operations and invalidation, but its cache is not the offline source of truth.

Every synchronized record should carry enough metadata to explain its state:

- Stable client-generated ID.
- Organization and account scope.
- Local update timestamp.
- Server revision or version when available.
- Sync status: `synced`, `pending`, `failed`, or `conflict`.
- Soft-delete marker when deletion must synchronize.

UI conventions:

- Show one unobtrusive global offline indicator.
- Mark failed or conflicting records where users can act on them.
- Do not display a toast for every successful background synchronization.
- Disable only operations that are inherently online, not the entire screen.
- Scope local rows by authenticated account and organization to prevent data leakage after
  switching accounts.

## Native Entry Points

### Quick Actions

Quick actions resolve to stable routes through `src/native/quick-actions.ts`. Initial actions may
include opening the active cohort, creating an assessment, or opening today's attendance. Validate
the current role and organization after launch before honoring the destination.

### Widgets

Widgets read a deliberately small shared snapshot, not the full application database. Widget sync
code belongs under `src/widgets`; route files only trigger navigation to the corresponding detail.
Initial widget scope should be upcoming assessments and today's classes.

### Sharing

`app/inbound-share.tsx` is the single inbound-share entry route. It parses the shared payload,
checks authentication and organization context, then redirects to the relevant import or
attachment form. Outbound sharing remains a feature action using `expo-sharing`.

### Background Tasks

Define background tasks at module scope in `src/tasks/background-sync.ts`. The task calls the same
sync engine used by foreground synchronization. It must not import route components or assume the
UI is mounted.

## Imports and Naming

- Change the mobile alias to `@/* -> ./src/*` during the router migration.
- Do not point mobile aliases into `apps/web/src`; shared runtime-safe code belongs in a workspace
  package.
- Route filenames are lowercase kebab-case; component files use PascalCase.
- Hooks begin with `use`; providers end with `Provider`; repositories end with `Repository`.
- Use typed route constants only for destinations shared by quick actions, widgets, notifications,
  and sharing. Ordinary local navigation can use typed Expo Router paths directly.

## Migration Sequence

1. Change the package entry from `index.ts` to `expo-router/entry` and add the `app/` directory.
2. Add `app/_layout.tsx` and move the current auth screen into `(auth)` routes.
3. Add `app/index.tsx` as the centralized startup redirect.
4. Add the `(workspace)` stack and native tab scaffold with placeholder route bodies.
5. Introduce theme primitives and `AppProviders` without changing feature behavior.
6. Add SQLite schema, migrations, repositories, and database readiness handling.
7. Add the mutation queue and foreground sync before registering background sync.
8. Add form-sheet presets and migrate the first real create/edit workflow.
9. Add quick actions, widgets, and sharing only after their destination routes are stable.
10. Create a new iOS development build whenever native plugins, entitlements, or widget targets
    change.

## Review Checklist

Before merging a mobile UI feature, verify:

- The route is owned by the correct stack.
- A form sheet is registered directly in that stack.
- Role checks affect actions and data, not duplicated route trees.
- The screen uses shared theme tokens and existing primitives.
- Platform variants were checked before changing shared UI.
- Loading, empty, error, offline, pending-sync, and conflict states are considered.
- Local writes and queue writes are atomic.
- Accessibility labels and minimum touch targets are present.
- Keyboard behavior works on iOS and Android.
- Deep-link and native-entry destinations reject unauthorized context safely.
- `bun --cwd apps/mobile run typecheck` passes.
- `bunx expo install --check` passes.
- An iOS and Android bundle or development build is tested when native behavior changes.

## Decisions Adapted From Ethos

Hakgyo intentionally adopts these Ethos scaffold patterns:

- Root provider composition around a root Expo Router stack.
- Domain stack above native tabs.
- Nested tab stacks for normal detail navigation.
- Direct sibling registration of form-sheet routes.
- Reusable iOS and Android sheet option presets.
- iOS toolbar actions with an Android sheet footer fallback.
- Small app-level UI primitives plus feature-owned component folders.
- Platform-specific component files where native implementations differ.

Hakgyo intentionally changes these aspects:

- One workspace route tree replaces multiple top-level product areas.
- Roles are authorization concerns, not route groups.
- SQLite repositories and the mutation queue are explicit UI boundaries from the start.
- Permissions are requested contextually rather than during root layout mount.
- Native entry points resolve through centralized, authorization-aware route handling.
