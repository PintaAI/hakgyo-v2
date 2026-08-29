import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { authClient } from "../../../../src/lib/auth-client";

export default function ProfileTab() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError(result.error.message || "Unable to sign out.");
        return;
      }

      queryClient.clear();
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-7">
      <Text className="text-2xl font-black text-foreground">Profile</Text>
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
    </View>
  );
}
