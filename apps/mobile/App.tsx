import "./global.css";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { authClient } from "./src/lib/auth-client";
import { api, TRPCProvider } from "./src/lib/trpc";

export default function App() {
  return (
    <SafeAreaProvider>
      <TRPCProvider>
        <AuthScreen />
      </TRPCProvider>
    </SafeAreaProvider>
  );
}

function AuthScreen() {
  const {
    data: session,
    isPending: sessionPending,
    refetch,
  } = authClient.useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const account = api.account.me.useQuery(undefined, {
    enabled: Boolean(session?.user),
    retry: false,
  });

  const submitEmail = async () => {
    setError(null);
    setSubmitting(true);

    const result =
      mode === "sign-in"
        ? await authClient.signIn.email({ email: email.trim(), password })
        : await authClient.signUp.email({
            email: email.trim(),
            name: name.trim(),
            password,
          });

    setSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Authentication failed.");
      return;
    }

    await refetch();
  };

  const signInWithGoogle = async () => {
    setError(null);
    setSubmitting(true);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed.");
      return;
    }

    await refetch();
  };

  if (sessionPending) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f3f0e8]">
        <ActivityIndicator color="#173f35" />
      </View>
    );
  }

  if (session?.user) {
    return (
      <SafeAreaView className="flex-1 bg-[#173f35]">
        <StatusBar style="light" />
        <View className="flex-1 justify-between px-7 py-8">
          <View>
            <Text className="text-xs font-bold uppercase tracking-[3px] text-[#e9c46a]">
              Hakgyo / connected
            </Text>
            <Text className="mt-5 text-4xl font-black leading-tight text-[#fffaf0]">
              Welcome back,{"\n"}
              {session.user.name}.
            </Text>
            <Text className="mt-4 text-base leading-6 text-[#c9d8d2]">
              Your Better Auth session is stored securely on this device.
            </Text>
          </View>

          <View className="rounded-[28px] border border-[#fffaf0]/15 bg-[#fffaf0] p-6">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-[#9b5b3d]">
              Protected tRPC response
            </Text>
            {account.isPending ? (
              <ActivityIndicator className="mt-6 self-start" color="#173f35" />
            ) : account.error ? (
              <Text className="mt-4 text-sm leading-5 text-[#a53d2d]">
                {account.error.message}
              </Text>
            ) : (
              <View className="mt-5 gap-2">
                <Text className="text-2xl font-black text-[#173f35]">
                  {account.data?.name}
                </Text>
                <Text className="text-sm text-[#52665f]">
                  {account.data?.email}
                </Text>
                <View className="mt-3 self-start rounded-full bg-[#dce9df] px-3 py-1.5">
                  <Text className="text-xs font-bold text-[#173f35]">
                    API authenticated
                  </Text>
                </View>
              </View>
            )}
          </View>

          <Pressable
            className="items-center rounded-full border border-[#fffaf0]/40 px-5 py-4 active:bg-white/10"
            onPress={async () => {
              await authClient.signOut();
              await refetch();
            }}
          >
            <Text className="font-bold text-[#fffaf0]">Sign out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f3f0e8]">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-between px-7 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#e76f51]">
              <Text className="text-xl font-black text-[#fffaf0]">H</Text>
            </View>
            <Text className="mt-8 text-xs font-bold uppercase tracking-[3px] text-[#9b5b3d]">
              Learn together
            </Text>
            <Text className="mt-3 text-5xl font-black leading-[52px] text-[#173f35]">
              Your school,{"\n"}within reach.
            </Text>
          </View>

          <View className="mt-12 gap-4">
            {mode === "sign-up" && (
              <TextInput
                autoComplete="name"
                className="rounded-2xl border border-[#173f35]/15 bg-[#fffaf0] px-5 py-4 text-base text-[#173f35]"
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor="#7d8b85"
                value={name}
              />
            )}
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              className="rounded-2xl border border-[#173f35]/15 bg-[#fffaf0] px-5 py-4 text-base text-[#173f35]"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#7d8b85"
              value={email}
            />
            <TextInput
              autoCapitalize="none"
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              className="rounded-2xl border border-[#173f35]/15 bg-[#fffaf0] px-5 py-4 text-base text-[#173f35]"
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#7d8b85"
              secureTextEntry
              value={password}
            />

            {error && (
              <Text className="rounded-xl bg-[#f8ddd6] px-4 py-3 text-sm text-[#8c3527]">
                {error}
              </Text>
            )}

            <Pressable
              className="items-center rounded-2xl bg-[#173f35] px-5 py-4 active:bg-[#245f51] disabled:opacity-50"
              disabled={submitting}
              onPress={submitEmail}
            >
              {submitting ? (
                <ActivityIndicator color="#fffaf0" />
              ) : (
                <Text className="text-base font-bold text-[#fffaf0]">
                  {mode === "sign-in" ? "Sign in" : "Create account"}
                </Text>
              )}
            </Pressable>

            <View className="flex-row items-center gap-3 py-1">
              <View className="h-px flex-1 bg-[#173f35]/15" />
              <Text className="text-xs font-bold uppercase text-[#718079]">
                or
              </Text>
              <View className="h-px flex-1 bg-[#173f35]/15" />
            </View>

            <Pressable
              className="items-center rounded-2xl border border-[#173f35]/20 bg-[#fffaf0] px-5 py-4 active:bg-white disabled:opacity-50"
              disabled={submitting}
              onPress={signInWithGoogle}
            >
              <Text className="text-base font-bold text-[#173f35]">
                Continue with Google
              </Text>
            </Pressable>

            <Pressable
              className="items-center py-2"
              onPress={() => {
                setError(null);
                setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              }}
            >
              <Text className="text-sm text-[#52665f]">
                {mode === "sign-in"
                  ? "New to Hakgyo? "
                  : "Already registered? "}
                <Text className="font-black text-[#173f35]">
                  {mode === "sign-in" ? "Create an account" : "Sign in"}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
