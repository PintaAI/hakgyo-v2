import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import { router, Stack } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { authClient } from "../../../../src/lib/auth-client";
import { userErrorMessage as errorMessage } from "../../../../src/lib/error-message";
import { api } from "../../../../src/lib/trpc";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { usePushNotifications } from "../../../../src/providers/PushNotificationsProvider";

function isAppleCancel(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "ERR_REQUEST_CANCELED"
  );
}

export default function ProfileAccountScreen() {
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const push = usePushNotifications();
  const { data: session } = authClient.useSession();
  const blockers = api.account.deletionBlockers.useQuery();
  const revokeApple = api.account.revokeAppleAuthorization.useMutation();
  const accounts = useQuery({
    queryKey: ["auth", "linked-accounts", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const result = await authClient.listAccounts();
      if (result.error) throw result.error;
      return result.data.map((account) => account.providerId);
    },
  });
  const providers = accounts.data ?? [];
  const hasPassword = providers.includes("credential");
  const hasApple = providers.includes("apple");
  const canRevokeApple = hasApple && Platform.OS === "ios";

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = session?.user.email ?? "";
  const emailMatches =
    confirmEmail.trim().toLowerCase() === email.trim().toLowerCase();
  // The confirmation step depends on knowing whether the account has a password.
  const canStartDelete = blockers.isSuccess && accounts.isSuccess;
  const canSubmit =
    emailMatches && (!hasPassword || password.length > 0) && !isDeleting;

  const openDeleteRequest = () => {
    if (blockers.data?.length) {
      Alert.alert("Selesaikan sebelum menghapus", blockers.data.join("\n\n"));
      return;
    }
    setError(null);
    setIsConfirming(true);
  };

  /**
   * Accounts without a password prove it is them by signing in again, which
   * also gives Better Auth the fresh session it requires for deletion. Apple
   * accounts sign in natively so the new authorization code can be revoked.
   */
  const reauthenticateWithProvider = async () => {
    if (canRevokeApple) {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [],
      });
      if (!credential.identityToken || !credential.authorizationCode) {
        throw new Error("Apple tidak mengembalikan data masuk.");
      }
      if (!hasPassword) {
        const result = await authClient.signIn.social({
          provider: "apple",
          idToken: { token: credential.identityToken },
        });
        if (result.error) throw result.error;
      }
      await revokeApple.mutateAsync({
        authorizationCode: credential.authorizationCode,
        clientId:
          Constants.expoConfig?.ios?.bundleIdentifier === "com.rorez.hakgyo.dev"
            ? "com.rorez.hakgyo.dev"
            : "com.rorez.hakgyo",
      });
      return;
    }
    if (!hasPassword) {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (result.error) throw result.error;
    }
  };

  const deleteAccount = async () => {
    if (!canSubmit) return;
    setError(null);
    setIsDeleting(true);
    try {
      await reauthenticateWithProvider();
      // Needs the session, so it must run before the account is gone.
      await push.unregisterDevice().catch(() => undefined);
      const result = await authClient.deleteUser(
        hasPassword ? { password } : {},
      );
      if (result.error) throw result.error;

      // Clears the stored cookie; MobileSyncProvider then wipes local data.
      await authClient.signOut().catch(() => undefined);
      await queryClient.cancelQueries();
      queryClient.clear();
      Alert.alert(
        "Akun dihapus",
        "Akun dan data belajar kamu telah dihapus dari Hakgyo.",
      );
      router.replace("/");
    } catch (cause) {
      if (isAppleCancel(cause)) return;
      setError(errorMessage(cause, "Akun tidak dapat dihapus. Coba lagi."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Akun" }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 px-4 pb-20 pt-4"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3 rounded-3xl border border-border bg-card p-4">
          <Text className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Detail akun
          </Text>
          <View className="gap-2">
            <View className="min-h-12 flex-row items-center gap-3 rounded-2xl bg-muted px-3">
              <Text
                className="flex-1 text-base font-semibold text-foreground"
                numberOfLines={1}
              >
                Nama
              </Text>
              <Text
                className="max-w-[58%] text-right text-base text-muted-foreground"
                numberOfLines={1}
              >
                {session?.user.name ?? "Pelajar Hakgyo"}
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
                {session?.user.email ?? "Belum masuk"}
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-3 rounded-3xl border border-border bg-card p-4">
          <Text className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Zona berbahaya
          </Text>
          {blockers.isPending ? (
            <Text className="text-sm leading-5 text-muted-foreground">
              Memeriksa keterkaitan akun…
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
              Menghapus akun akan menghapus profil, progres, dan data belajar
              kamu secara permanen. Tindakan ini tidak dapat dibatalkan.
            </Text>
          )}
          {blockers.error || accounts.error ? (
            <Pressable
              accessibilityRole="button"
              className="min-h-12 items-center justify-center rounded-2xl border border-border px-4"
              onPress={() => {
                void blockers.refetch();
                void accounts.refetch();
              }}
            >
              <Text className="text-base font-semibold text-primary">
                Coba lagi
              </Text>
            </Pressable>
          ) : null}

          {isConfirming ? (
            <View className="gap-3">
              <Text className="text-sm leading-5 text-foreground">
                Ketik <Text className="font-bold">{email}</Text> untuk
                mengonfirmasi.
              </Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                className="rounded-2xl border border-input bg-background px-4 py-3 text-base text-foreground"
                editable={!isDeleting}
                keyboardType="email-address"
                onChangeText={setConfirmEmail}
                placeholder="Alamat email"
                placeholderTextColor={colors.mutedForeground}
                value={confirmEmail}
              />
              {hasPassword ? (
                <TextInput
                  autoCapitalize="none"
                  autoComplete="current-password"
                  className="rounded-2xl border border-input bg-background px-4 py-3 text-base text-foreground"
                  editable={!isDeleting}
                  onChangeText={setPassword}
                  placeholder="Kata sandi saat ini"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  textContentType="password"
                  value={password}
                />
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  {canRevokeApple
                    ? "Kamu akan diminta masuk dengan Apple sekali lagi untuk mengonfirmasi."
                    : "Kamu akan diminta masuk dengan Google sekali lagi untuk mengonfirmasi."}
                </Text>
              )}
              {error ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
                >
                  {error}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={!canSubmit}
                onPress={() => void deleteAccount()}
                className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive px-4"
                style={{ opacity: canSubmit ? 1 : 0.45 }}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">
                    Hapus akun permanen
                  </Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isDeleting}
                onPress={() => {
                  setIsConfirming(false);
                  setConfirmEmail("");
                  setPassword("");
                  setError(null);
                }}
                className="min-h-12 items-center justify-center rounded-2xl border border-border px-4"
              >
                <Text className="text-base font-semibold text-foreground">
                  Batal
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={!canStartDelete}
              onPress={openDeleteRequest}
              className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive/10 px-4"
              style={{ opacity: canStartDelete ? 1 : 0.55 }}
            >
              <Text className="text-base font-semibold text-destructive">
                Hapus akun…
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </>
  );
}
