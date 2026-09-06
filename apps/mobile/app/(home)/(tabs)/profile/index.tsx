import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";

import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";
import {
  Action,
  Empty,
  QueryState,
  Row,
  Section,
  StudyScreen,
} from "../../../../src/components/learning-ui";
import { LearningProgress } from "../../../../src/components/learning-progress";
import { achievementLabel, dateLabel } from "../../../../src/lib/study";

export default function ProfileTab() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = api.gamification.getMySummary.useQuery();
  const connections = api.account.listMcpAuthorizations.useQuery();
  const connector = api.account.getMcpConnectionInfo.useQuery();
  const revoke = api.account.revokeMcpAuthorization.useMutation({
    onSuccess: () => connections.refetch(),
  });

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
      }}
      refreshing={progress.isRefetching || connections.isRefetching}
    >
      <View className="items-center gap-1">
        {session?.user.name ? (
          <Text className="text-base font-bold text-foreground">
            {session.user.name}
          </Text>
        ) : null}
        <Text className="text-sm text-muted-foreground">
          {session?.user.email}
        </Text>
      </View>
      <LearningProgress />
      <Section title="Milestones">
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
      </Section>
      <Section title="Learning activity">
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
      </Section>
      <Section title="Connected AI apps">
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
      </Section>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-center text-sm font-semibold text-destructive"
        >
          {error}
        </Text>
      ) : null}

      <Pressable
        className="min-w-48 items-center rounded-full border border-border px-5 py-4"
        disabled={isSigningOut}
        onPress={() => void handleSignOut()}
        style={{ opacity: isSigningOut ? 0.6 : 1 }}
      >
        {isSigningOut ? (
          <ActivityIndicator />
        ) : (
          <Text className="font-bold text-foreground">Sign out</Text>
        )}
      </Pressable>
    </StudyScreen>
  );
}
