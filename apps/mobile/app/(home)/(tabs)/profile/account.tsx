import { router, Stack } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";

export default function ProfileAccountScreen() {
  const { data: session } = authClient.useSession();
  const blockers = api.account.deletionBlockers.useQuery();

  const openDeleteRequest = () => {
    if (blockers.data?.length) {
      Alert.alert(
        "Resolve before deleting",
        blockers.data.join("\n\n"),
      );
      return;
    }
    Alert.alert(
      "Delete account",
      "Self-service account deletion is not available yet. Please contact your organization administrator to delete your account.",
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Account" }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 px-4 pb-20 pt-4"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3 rounded-3xl border border-border bg-card p-4">
          <Text className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Account details
          </Text>
          <View className="gap-2">
            <View className="min-h-12 flex-row items-center gap-3 rounded-2xl bg-muted px-3">
              <Text
                className="flex-1 text-base font-semibold text-foreground"
                numberOfLines={1}
              >
                Name
              </Text>
              <Text
                className="max-w-[58%] text-right text-base text-muted-foreground"
                numberOfLines={1}
              >
                {session?.user.name ?? "Hakgyo learner"}
              </Text>
            </View>
            <View className="min-h-12 flex-row items-center gap-3 rounded-2xl bg-muted px-3">
              <Text
                className="flex-1 text-base font-semibold text-foreground"
                numberOfLines={1}
              >
                Email
              </Text>
              <Text
                className="max-w-[58%] text-right text-base text-muted-foreground"
                numberOfLines={1}
              >
                {session?.user.email ?? "Not signed in"}
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-3 rounded-3xl border border-border bg-card p-4">
          <Text className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Danger zone
          </Text>
          {blockers.isPending ? (
            <Text className="text-sm leading-5 text-muted-foreground">
              Checking account dependencies…
            </Text>
          ) : blockers.data?.length ? (
            <View className="gap-1.5">
              {blockers.data.map((blocker) => (
                <Text
                  key={blocker}
                  className="text-sm leading-5 text-muted-foreground"
                >
                  • {blocker}
                </Text>
              ))}
            </View>
          ) : (
            <Text className="text-sm leading-5 text-muted-foreground">
              Deleting your account removes your profile and learning data.
              Organization owners must transfer ownership first.
            </Text>
          )}
          {blockers.error ? (
            <Pressable
              accessibilityRole="button"
              className="min-h-12 items-center justify-center rounded-2xl border border-border px-4"
              onPress={() => {
                void blockers.refetch();
                router.back();
              }}
            >
              <Text className="text-base font-semibold text-primary">
                Retry
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={blockers.isPending}
            onPress={openDeleteRequest}
            className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive/10 px-4"
            style={{ opacity: blockers.isPending ? 0.55 : 1 }}
          >
            <Text className="text-base font-semibold text-destructive">
              Delete account…
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
