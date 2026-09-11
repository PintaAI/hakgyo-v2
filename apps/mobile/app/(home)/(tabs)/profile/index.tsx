import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";

import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";
import {
  Action,
  Card,
  Empty,
  Eyebrow,
  QueryState,
  Row,
  StudyScreen,
} from "../../../../src/components/learning-ui";
import { WeeklyStreak } from "../../../../src/components/weekly-streak";
import { achievementLabel, dateLabel } from "../../../../src/lib/study";
import {
  type AvailableOrganizationTheme,
  useAppTheme,
} from "../../../../src/providers/AppThemeProvider";

function ThemeOption({
  theme,
  selected,
  onSelect,
}: {
  theme: AvailableOrganizationTheme | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onSelect}
      className={`flex-row items-center gap-3 rounded-xl px-3 py-3 active:opacity-70 ${
        selected ? "bg-primary/10" : ""
      }`}
    >
      <View
        className="size-5 rounded-full border-2 border-primary p-1"
        accessibilityElementsHidden
      >
        {selected ? <View className="flex-1 rounded-full bg-primary" /> : null}
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-foreground">
          {theme?.name ?? "Hakgyo Default"}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {theme ? "Organization theme" : "Standard application theme"}
        </Text>
      </View>
      {theme ? (
        <View className="flex-row overflow-hidden rounded-full border border-border">
          <View
            className="size-6"
            style={{ backgroundColor: theme.theme.background }}
          />
          <View
            className="size-6"
            style={{ backgroundColor: theme.theme.primary }}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

export default function ProfileTab() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    activeTheme,
    availableThemes,
    colors,
    isRefreshingThemes,
    refreshThemes,
    selectTheme,
  } = useAppTheme();
  const progress = api.gamification.getMySummary.useQuery();
  const connections = api.account.listMcpAuthorizations.useQuery();
  const connector = api.account.getMcpConnectionInfo.useQuery();
  const revoke = api.account.revokeMcpAuthorization.useMutation({
    onSuccess: () => connections.refetch(),
  });
  const displayName = session?.user.name || "Hakgyo learner";
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError(result.error.message || "Unable to sign out.");
        return;
      }

      await queryClient.cancelQueries();
      queryClient.clear();
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <StudyScreen
      title="Profile"
      onRefresh={() => {
        void progress.refetch();
        void connections.refetch();
        void refreshThemes();
      }}
      refreshing={
        progress.isRefetching || connections.isRefetching || isRefreshingThemes
      }
    >
      <View className="flex-row items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4">
        <View
          className="size-14 items-center justify-center overflow-hidden rounded-full"
          style={{ backgroundColor: colors.primary }}
        >
          {session?.user.image ? (
            <Image
              className="size-full"
              resizeMode="cover"
              source={{ uri: session.user.image }}
            />
          ) : (
            <Text
              className="text-lg font-extrabold"
              style={{ color: colors.primaryForeground }}
            >
              {initials || "H"}
            </Text>
          )}
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text
            className="text-xl font-black tracking-tight text-foreground"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {session?.user.email ?? "Not signed in"}
          </Text>
        </View>
      </View>
      <WeeklyStreak />
      <Card>
        <Eyebrow>Appearance</Eyebrow>
        <Text className="text-sm leading-5 text-muted-foreground">
          Choose a theme from an organization where you have an active course.
          Your choice is stored on this device.
        </Text>
        <View accessibilityRole="radiogroup" className="gap-1">
          <ThemeOption
            theme={null}
            selected={!activeTheme}
            onSelect={() => void selectTheme(null)}
          />
          {availableThemes.map((theme) => (
            <ThemeOption
              key={theme.organizationId}
              theme={theme}
              selected={activeTheme?.organizationId === theme.organizationId}
              onSelect={() => void selectTheme(theme.organizationId)}
            />
          ))}
        </View>
        {availableThemes.length === 0 ? (
          <Empty>No organization themes are available yet.</Empty>
        ) : null}
      </Card>
      <Card>
        <Eyebrow>Milestones</Eyebrow>
        {progress.data?.achievements.length === 0 ? (
          <Empty>
            Complete your first learning activity to earn a milestone.
          </Empty>
        ) : null}
        {progress.data?.achievements.map((achievement) => (
          <Row
            key={achievement.code}
            title={achievementLabel(achievement.code)}
            detail={dateLabel(achievement.earnedAt)}
          />
        ))}
      </Card>
      <Card>
        <Eyebrow>Learning activity</Eyebrow>
        {progress.data?.recentActivity.map((activity, index) => (
          <Row
            key={index}
            title={activity.action.replaceAll("_", " ").toLowerCase()}
            detail={`+${activity.xpAwarded} XP · ${dateLabel(activity.occurredAt)}`}
          />
        ))}
        <Text className="text-xs text-muted-foreground">
          Course streaks currently use UTC days.
        </Text>
      </Card>
      <Card>
        <Eyebrow>Connected AI apps</Eyebrow>
        <Text className="text-sm leading-5 text-muted-foreground">
          Use Hakgyo’s connector with a compatible AI app. Authorization happens
          in that app’s browser sign-in flow.
        </Text>
        <QueryState
          pending={connector.isPending}
          error={connector.error}
          retry={() => void connector.refetch()}
        />
        {connector.data ? (
          <Text selectable className="text-sm text-primary">
            {connector.data.resource}
          </Text>
        ) : null}
        <Action
          secondary
          disabled={!connector.data}
          onPress={() => {
            if (connector.data)
              void Share.share({ message: connector.data.resource }).catch(() =>
                setError("Couldn’t share the connector address."),
              );
          }}
        >
          Share connector address
        </Action>
        <QueryState
          pending={connections.isPending}
          error={connections.error}
          retry={() => void connections.refetch()}
        />
        {connections.data?.length === 0 ? (
          <Empty>No AI apps have been authorized.</Empty>
        ) : null}
        {connections.data?.map((connection) => (
          <View key={connection.id} className="gap-3">
            <Row
              title={connection.name}
              detail={`Authorized ${dateLabel(connection.createdAt)}`}
            />
            <Action
              secondary
              disabled={revoke.isPending}
              onPress={() =>
                Alert.alert(
                  "Disconnect AI app?",
                  `${connection.name} will lose its authorization to access Hakgyo.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Disconnect",
                      style: "destructive",
                      onPress: () =>
                        revoke.mutate({ clientId: connection.clientId }),
                    },
                  ],
                )
              }
            >
              Disconnect
            </Action>
          </View>
        ))}
        {revoke.error ? (
          <Text accessibilityRole="alert" className="text-sm text-destructive">
            {revoke.error.message}
          </Text>
        ) : null}
      </Card>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-center text-sm font-semibold text-destructive"
        >
          {error}
        </Text>
      ) : null}

      <Pressable
        className="items-center rounded-2xl border border-border bg-card px-5 py-4 active:opacity-70"
        disabled={isSigningOut}
        onPress={() => void handleSignOut()}
        style={{ opacity: isSigningOut ? 0.6 : 1 }}
      >
        {isSigningOut ? (
          <ActivityIndicator />
        ) : (
          <Text className="text-base font-bold text-foreground">Sign out</Text>
        )}
      </Pressable>
    </StudyScreen>
  );
}
