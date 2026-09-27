import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function OnboardingScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-7">
      <Text className="text-3xl font-black text-foreground">
        Selamat datang di Hakgyo
      </Text>
      <Link className="font-bold text-primary" href="/auth">
        Lanjut ke halaman masuk
      </Link>
    </View>
  );
}
