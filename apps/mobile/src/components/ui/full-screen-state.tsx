import { Text, View } from "react-native";

import { Action } from "./action";
import { Spinner } from "./spinner";

/**
 * A screen-sized loading, error or empty state, with optional back and retry
 * actions. Use it when the whole screen has nothing else to show.
 */
export function FullScreenState({
  kind,
  title,
  message,
  onBack,
  backLabel = "Kembali",
  onRetry,
}: {
  kind: "loading" | "error" | "empty";
  title?: string;
  /** For `loading` this is the caption under the spinner. */
  message?: string;
  onBack?: () => void;
  backLabel?: string;
  onRetry?: () => void;
}) {
  if (kind === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner label={message} />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-5 bg-background px-6">
      {kind === "error" ? (
        <View className="size-12 items-center justify-center rounded-2xl bg-destructive/10">
          <Text className="text-lg font-black text-destructive">!</Text>
        </View>
      ) : null}
      <View className="items-center gap-2">
        {title ? (
          <Text
            accessibilityRole="header"
            className="text-center text-xl font-black text-foreground"
          >
            {title}
          </Text>
        ) : null}
        {message ? (
          <Text
            accessibilityRole={kind === "error" ? "alert" : undefined}
            className="text-center text-sm leading-5 text-muted-foreground"
          >
            {message}
          </Text>
        ) : null}
      </View>
      {onBack || onRetry ? (
        <View className="w-full max-w-xs flex-row gap-3">
          {onBack ? (
            <View className="flex-1">
              <Action variant="secondary" onPress={onBack}>
                {backLabel}
              </Action>
            </View>
          ) : null}
          {onRetry ? (
            <View className="flex-1">
              <Action onPress={onRetry}>Coba lagi</Action>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
