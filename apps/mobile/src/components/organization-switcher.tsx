import { useEffect } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getOrganizationSwitcherOptions } from "../lib/organization-switcher";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import { GlassBox } from "./GlassBox";

function OrganizationMark({
  logoUrl,
  name,
  size = "size-9",
}: {
  logoUrl: string | null;
  name: string;
  size?: string;
}) {
  return (
    <View
      className={`${size} items-center justify-center overflow-hidden rounded-full border border-border bg-muted`}
    >
      {logoUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          cachePolicy="memory-disk"
          className="size-full"
          contentFit="cover"
          source={{ uri: logoUrl }}
          transition={0}
        />
      ) : (
        <Text className="text-xs font-black text-primary">
          {name.trim().charAt(0).toUpperCase() || "H"}
        </Text>
      )}
    </View>
  );
}

export function OrganizationSwitcherTrigger({
  compact = false,
  onPress,
}: {
  compact?: boolean;
  onPress: () => void;
}) {
  const { activeBrand, colorScheme, colors } = useAppTheme();

  const trigger = (
    <Pressable
      accessibilityHint="Shows your available organizations"
      accessibilityLabel={`Current organization: ${activeBrand.name}`}
      accessibilityRole="button"
      className={
        compact
          ? "h-10 max-w-44 flex-row items-center gap-2 rounded-full pl-1 pr-3 active:opacity-70"
          : "max-w-[80%] flex-row items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3 active:opacity-70"
      }
      onPress={onPress}
    >
      <OrganizationMark
        logoUrl={activeBrand.logoUrl}
        name={activeBrand.name}
        size={compact ? "size-8" : "size-9"}
      />
      <Text
        className={`min-w-0 shrink text-sm font-bold ${compact ? "" : "text-foreground"}`}
        numberOfLines={1}
        style={
          compact
            ? {
                color:
                  colorScheme === "dark"
                    ? colors.foreground
                    : colors.background,
              }
            : undefined
        }
      >
        {activeBrand.name}
      </Text>
      {!compact ? (
        <Text className="text-xs text-muted-foreground">⌄</Text>
      ) : null}
    </Pressable>
  );

  return (
    <View className="items-end">
      {compact ? (
        <GlassBox
          isInteractive
          tintColor={withOpacity(
            colors.primary,
            colorScheme === "dark" ? 1 : 0.72,
          )}
          glassEffectStyle="clear"
          style={{
            borderRadius: 9999,
            maxWidth: 176,
          }}
        >
          {trigger}
        </GlassBox>
      ) : (
        trigger
      )}
    </View>
  );
}

export function OrganizationSwitcherContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const {
    activeBrand,
    availableOrganizations,
    colors,
    isRefreshingOrganizations,
    refreshOrganizations,
    selectOrganization,
  } = useAppTheme();
  // The sheet mounts each time it opens, so refresh here: an organization
  // joined since the last fetch (new cohort enrollment, invite accepted on
  // web) shows up instead of the stale cached list.
  useEffect(() => {
    void refreshOrganizations();
  }, [refreshOrganizations]);
  const switcherOptions = getOrganizationSwitcherOptions(
    activeBrand,
    availableOrganizations,
  );

  return (
    // NativeWind's safe-area integration only wraps SafeAreaProvider;
    // SafeAreaView needs native styles to fill the form sheet.
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["bottom"]}
    >
      <View className="flex-1 gap-2 px-5 pb-5 pt-4">
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-xl font-black text-foreground">
            Choose organization
          </Text>
          <Pressable
            accessibilityRole="button"
            className="rounded-full px-3 py-2 active:opacity-60"
            onPress={onClose}
          >
            <Text className="text-sm font-bold text-primary">Done</Text>
          </Pressable>
        </View>
        <Text className="mb-2 text-sm text-muted-foreground">
          Learning content and branding will switch together.
        </Text>
        {isRefreshingOrganizations ? (
          <Text className="mb-2 text-xs text-muted-foreground">
            Updating organizations…
          </Text>
        ) : null}
        <ScrollView
          contentContainerClassName="gap-2 pb-4"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          {switcherOptions.map((organization) => {
            const selected =
              organization.organizationId === activeBrand.organizationId;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`flex-row items-center gap-3 rounded-2xl border px-3 py-3 active:opacity-70 ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                }`}
                key={organization.organizationId ?? "hakgyo-default"}
                onPress={() => {
                  onClose();
                  if (organization.organizationId) {
                    void selectOrganization(organization.organizationId);
                  }
                }}
              >
                <OrganizationMark
                  logoUrl={organization.logoUrl}
                  name={organization.name}
                  size="size-11"
                />
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text
                    className="text-base font-bold text-foreground"
                    numberOfLines={1}
                  >
                    {organization.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {organization.isThemed
                      ? "Organization theme"
                      : "Hakgyo theme"}
                  </Text>
                </View>
                {selected ? (
                  <Text
                    className="text-lg font-black"
                    style={{ color: colors.primary }}
                  >
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
          {availableOrganizations.length === 0 ? (
            <Text className="py-5 text-center text-sm text-muted-foreground">
              No active organization enrollments yet.
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
