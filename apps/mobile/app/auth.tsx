import { router, Stack, useLocalSearchParams, type Href } from "expo-router";
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
type AuthMode = "sign-in" | "sign-up";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function AuthScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{
    redirectTo?: string | string[];
    mode?: string | string[];
  }>();
  const requestedRedirect = Array.isArray(params.redirectTo)
    ? params.redirectTo[0]
    : params.redirectTo;
  const postSignInPath: Href =
    requestedRedirect?.startsWith("/courses/") === true
      ? (requestedRedirect as Href)
      : "/";
  const requestedMode = Array.isArray(params.mode)
    ? params.mode[0]
    : params.mode;
  const [mode, setMode] = useState<AuthMode>(
    requestedMode === "sign-up" ? "sign-up" : "sign-in",
  );
  const isSignUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingMethod, setPendingMethod] = useState<SignInMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPending = pendingMethod !== null;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleEmailSubmit = async () => {
    const normalizedEmail = email.trim();
    const normalizedName = name.trim();
    const failureMessage = isSignUp
      ? "Tidak dapat mendaftar."
      : "Tidak dapat masuk.";

    if (isSignUp && !normalizedName) {
      setError("Masukkan nama kamu.");
      return;
    }

    if (!normalizedEmail || !password) {
      setError("Masukkan alamat email dan kata sandi kamu.");
      return;
    }

    if (isSignUp && password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    setError(null);
    setPendingMethod("email");

    try {
      // New accounts are enrolled in Hangeul Mastery by the server's
      // user-create hook, so a fresh learner lands on a populated home.
      const result = isSignUp
        ? await authClient.signUp.email({
            name: normalizedName,
            email: normalizedEmail,
            password,
          })
        : await authClient.signIn.email({
            email: normalizedEmail,
            password,
          });

      if (result.error) {
        setError(result.error.message || failureMessage);
        return;
      }

      router.replace(postSignInPath);
    } catch (cause) {
      setError(errorMessage(cause, failureMessage));
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
      <Stack.Screen options={{ title: isSignUp ? "Daftar" : "Masuk" }} />
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
            {isSignUp ? "Buat akun gratis" : "Masuk untuk melanjutkan"}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {isSignUp
              ? "Akun baru langsung mendapat kursus Hangeul Mastery."
              : "Akses kelas, Group belajar, dan tugas kamu dari satu tempat."}
          </Text>
        </View>

        <View className="gap-3 rounded-xl border border-border bg-card p-4">
          {isSignUp ? (
            <TextInput
              autoCapitalize="words"
              autoComplete="name"
              className="rounded-full border border-input bg-background px-4 py-3 text-base text-foreground"
              editable={!isPending}
              onChangeText={setName}
              placeholder="Nama"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
              textContentType="name"
              value={name}
            />
          ) : null}
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
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="rounded-full border border-input bg-background px-4 py-3 text-base text-foreground"
            editable={!isPending}
            onChangeText={setPassword}
            onSubmitEditing={() => void handleEmailSubmit()}
            placeholder={
              isSignUp ? "Kata sandi (min. 8 karakter)" : "Kata sandi"
            }
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="go"
            secureTextEntry
            textContentType={isSignUp ? "newPassword" : "password"}
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
            onPress={() => void handleEmailSubmit()}
            style={{ opacity: isPending ? 0.6 : 1 }}
          >
            {pendingMethod === "email" ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text className="font-bold text-primary-foreground">
                {isSignUp ? "Daftar" : "Masuk"}
              </Text>
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
          <Pressable
            accessibilityRole="button"
            disabled={isPending}
            onPress={() => switchMode(isSignUp ? "sign-in" : "sign-up")}
          >
            <Text className="font-bold text-primary">
              {isSignUp
                ? "Sudah punya akun? Masuk"
                : "Baru di Hakgyo? Daftar gratis"}
            </Text>
          </Pressable>
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
