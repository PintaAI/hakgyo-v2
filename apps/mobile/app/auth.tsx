import {
  Link,
  router,
  Stack,
  useLocalSearchParams,
  type Href,
} from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { authClient } from "../src/lib/auth-client";
import { useAppTheme } from "../src/providers/AppThemeProvider";

type SignInMethod = "email" | "google";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function AuthScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ redirectTo?: string | string[] }>();
  const requestedRedirect = Array.isArray(params.redirectTo)
    ? params.redirectTo[0]
    : params.redirectTo;
  const postSignInPath: Href =
    requestedRedirect?.startsWith("/courses/") === true
      ? (requestedRedirect as Href)
      : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingMethod, setPendingMethod] = useState<SignInMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPending = pendingMethod !== null;

  const handleEmailSignIn = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Masukkan alamat email dan kata sandi kamu.");
      return;
    }

    setError(null);
    setPendingMethod("email");

    try {
      const result = await authClient.signIn.email({
        email: normalizedEmail,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Tidak dapat masuk.");
        return;
      }

      router.replace(postSignInPath);
    } catch (cause) {
      setError(errorMessage(cause, "Tidak dapat masuk."));
    } finally {
      setPendingMethod(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setPendingMethod("google");

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });

      if (result.error) {
        setError(result.error.message || "Gagal masuk dengan Google.");
        return;
      }

      router.replace(postSignInPath);
    } catch (cause) {
      setError(errorMessage(cause, "Gagal masuk dengan Google."));
    } finally {
      setPendingMethod(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Masuk" }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-5 px-5 pb-10 pt-5"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
            Akun Hakgyo
          </Text>
          <Text className="text-3xl font-black tracking-tight text-foreground">
            Masuk untuk melanjutkan
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Akses kelas, Group belajar, dan tugas kamu dari satu tempat.
          </Text>
        </View>

        <View className="gap-3 rounded-xl border border-border bg-card p-4">
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            className="rounded-full border border-input bg-background px-4 py-3 text-base text-foreground"
            editable={!isPending}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Alamat email"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
            textContentType="emailAddress"
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="current-password"
            className="rounded-full border border-input bg-background px-4 py-3 text-base text-foreground"
            editable={!isPending}
            onChangeText={setPassword}
            onSubmitEditing={() => void handleEmailSignIn()}
            placeholder="Kata sandi"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="go"
            secureTextEntry
            textContentType="password"
            value={password}
          />

          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
            >
              {error}
            </Text>
          ) : null}

          <Pressable
            className="items-center rounded-full bg-primary px-5 py-4"
            disabled={isPending}
            onPress={() => void handleEmailSignIn()}
            style={{ opacity: isPending ? 0.6 : 1 }}
          >
            {pendingMethod === "email" ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text className="font-bold text-primary-foreground">Masuk</Text>
            )}
          </Pressable>
          <Pressable
            className="items-center rounded-full border border-border px-5 py-4"
            disabled={isPending}
            onPress={() => void handleGoogleSignIn()}
            style={{ opacity: isPending ? 0.6 : 1 }}
          >
            {pendingMethod === "google" ? (
              <ActivityIndicator />
            ) : (
              <Text className="font-bold text-foreground">
                Lanjutkan dengan Google
              </Text>
            )}
          </Pressable>
        </View>

        <View className="items-center gap-2">
          <Link className="font-bold text-primary" href="/(onboarding)/start">
            Baru di Hakgyo? Mulai sekarang
          </Link>
          {Platform.OS === "android" ? (
            <Pressable onPress={() => router.back()}>
              <Text className="text-sm text-muted-foreground">Tutup</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
