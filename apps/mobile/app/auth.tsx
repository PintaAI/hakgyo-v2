import * as AppleAuthentication from "expo-apple-authentication";
import { router, Stack, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";

import {
  Action,
  Callout,
  Card,
  HeroHeader,
  TextField,
} from "../src/components/learning-ui";
import { apiUrl } from "../src/config";
import { authClient } from "../src/lib/auth-client";
import { userErrorMessage as errorMessage } from "../src/lib/error-message";
import { useAppTheme } from "../src/providers/AppThemeProvider";
import { firstParam } from "../src/lib/route-params";

type SignInMethod = "email" | "google" | "apple";
type AuthMode = "sign-in" | "sign-up";

export default function AuthScreen() {
  const { colorScheme } = useAppTheme();
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    void AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
  }, []);
  const params = useLocalSearchParams<{
    redirectTo?: string | string[];
    mode?: string | string[];
  }>();
  const requestedRedirect = firstParam(params.redirectTo);
  const postSignInPath: Href =
    requestedRedirect?.startsWith("/courses/") === true
      ? (requestedRedirect as Href)
      : "/";
  const requestedMode = firstParam(params.mode);
  const [mode, setMode] = useState<AuthMode>(
    requestedMode === "sign-up" ? "sign-up" : "sign-in",
  );
  const isSignUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingMethod, setPendingMethod] = useState<SignInMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isPending = pendingMethod !== null;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
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
    setNotice(null);
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
        setError(errorMessage(result.error, failureMessage));
        return;
      }

      // Sign-up only creates a session once the email is verified.
      if (isSignUp && !result.data?.token) {
        setNotice(
          `Kami mengirim tautan verifikasi ke ${normalizedEmail}. Buka tautan itu, lalu masuk.`,
        );
        setMode("sign-in");
        setPassword("");
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
        setError(errorMessage(result.error, "Gagal masuk dengan Google."));
        return;
      }

      router.replace(postSignInPath);
    } catch (cause) {
      setError(errorMessage(cause, "Gagal masuk dengan Google."));
    } finally {
      setPendingMethod(null);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setPendingMethod("apple");

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setError("Apple tidak mengembalikan data masuk.");
        return;
      }

      // Apple only shares the name on the first sign-in, so pass it along.
      const result = await authClient.signIn.social({
        provider: "apple",
        idToken: {
          token: credential.identityToken,
          user: {
            email: credential.email ?? undefined,
            name: credential.fullName
              ? {
                  firstName: credential.fullName.givenName ?? undefined,
                  lastName: credential.fullName.familyName ?? undefined,
                }
              : undefined,
          },
        },
      });

      if (result.error) {
        setError(errorMessage(result.error, "Gagal masuk dengan Apple."));
        return;
      }

      router.replace(postSignInPath);
    } catch (cause) {
      const canceled =
        !!cause &&
        typeof cause === "object" &&
        "code" in cause &&
        cause.code === "ERR_REQUEST_CANCELED";
      if (!canceled) setError(errorMessage(cause, "Gagal masuk dengan Apple."));
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
        <HeroHeader
          eyebrow="Akun Hakgyo"
          title={isSignUp ? "Buat akun gratis" : "Masuk untuk melanjutkan"}
          description={
            isSignUp
              ? "Akun baru langsung mendapat kurikulum Hangeul Mastery."
              : "Akses kurikulum, kelas, dan tugas kamu dari satu tempat."
          }
        />

        <Card>
          {isSignUp ? (
            <TextField
              autoCapitalize="words"
              autoComplete="name"
              editable={!isPending}
              onChangeText={setName}
              placeholder="Nama"
              returnKeyType="next"
              textContentType="name"
              value={name}
            />
          ) : null}
          <TextField
            autoCapitalize="none"
            autoComplete="email"
            editable={!isPending}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Alamat email"
            returnKeyType="next"
            textContentType="emailAddress"
            value={email}
          />
          <TextField
            autoCapitalize="none"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            editable={!isPending}
            onChangeText={setPassword}
            onSubmitEditing={() => void handleEmailSubmit()}
            placeholder={
              isSignUp ? "Kata sandi (min. 8 karakter)" : "Kata sandi"
            }
            returnKeyType="go"
            secureTextEntry
            textContentType={isSignUp ? "newPassword" : "password"}
            value={password}
          />

          {notice ? <Callout>{notice}</Callout> : null}
          {error ? <Callout tone="destructive">{error}</Callout> : null}

          <Action
            disabled={isPending}
            loading={pendingMethod === "email"}
            onPress={() => void handleEmailSubmit()}
          >
            {isSignUp ? "Daftar" : "Masuk"}
          </Action>
          {!isSignUp ? (
            <Action
              accessibilityRole="link"
              disabled={isPending}
              size="inline"
              variant="ghost"
              onPress={() =>
                void Linking.openURL(`${apiUrl}/auth/forgot-password`)
              }
            >
              Lupa kata sandi?
            </Action>
          ) : null}
          {isAppleAvailable ? (
            <View
              pointerEvents={isPending ? "none" : "auto"}
              style={{ opacity: isPending ? 0.6 : 1 }}
            >
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  isSignUp
                    ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                    : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                }
                buttonStyle={
                  colorScheme === "dark"
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={16}
                onPress={() => void handleAppleSignIn()}
                style={{ height: 48, width: "100%" }}
              />
            </View>
          ) : null}
          <Action
            disabled={isPending}
            loading={pendingMethod === "google"}
            variant="secondary"
            onPress={() => void handleGoogleSignIn()}
          >
            Lanjutkan dengan Google
          </Action>
        </Card>

        <View className="items-center gap-2">
          <Action
            disabled={isPending}
            size="inline"
            variant="link"
            onPress={() => switchMode(isSignUp ? "sign-in" : "sign-up")}
          >
            {isSignUp
              ? "Sudah punya akun? Masuk"
              : "Baru di Hakgyo? Daftar gratis"}
          </Action>
          {Platform.OS === "android" ? (
            <Action size="inline" variant="ghost" onPress={() => router.back()}>
              Tutup
            </Action>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
