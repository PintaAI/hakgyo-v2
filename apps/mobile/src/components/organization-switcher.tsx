import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { getOrganizationSwitcherOptions } from "../lib/organization-switcher";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import { GlassBox } from "./GlassBox";
import { HakgyoHero } from "./learn/hakgyo-hero";
import { HeroMark, HeroTitle } from "./learn/hero-parts";
import { Avatar, Eyebrow } from "./learning-ui";
import { SymbolIcon } from "./ui/symbol-icon";

function OrganizationMark({
  logoUrl,
  name,
  size = 36,
}: {
  logoUrl: string | null;
  name: string;
  size?: number;
}) {
  return (
    <Avatar
      initials={name.trim().charAt(0).toUpperCase() || "H"}
      size={size}
      tone="muted"
      uri={logoUrl}
    />
  );
}

export function OrganizationSwitcherTrigger({
  compact = false,
  align = "end",
  onPress,
}: {
  compact?: boolean;
  /** Which edge the trigger hugs within its container. */
  align?: "start" | "end";
  onPress: () => void;
}) {
  const { activeBrand, colors } = useAppTheme();

  const trigger = (
    <Pressable
      accessibilityHint="Menampilkan organisasi yang tersedia"
      accessibilityLabel={`Organisasi saat ini: ${activeBrand.name}`}
      accessibilityRole="button"
      className={
        compact
          ? "h-11 max-w-44 flex-row items-center gap-2 rounded-full pl-1.5 pr-3.5 active:opacity-70"
          : "min-w-0 shrink flex-row items-center gap-2 py-1.5 pl-1.5 pr-3"
      }
      // Android: no container, like the toolbar icon buttons beside it, with
      // the platform ripple as press feedback.
      android_ripple={compact ? undefined : { color: colors.border }}
      onPress={onPress}
    >
      <OrganizationMark
        logoUrl={activeBrand.logoUrl}
        name={activeBrand.name}
        size={compact ? 32 : 36}
      />
      <Text
        className="min-w-0 shrink text-sm font-bold text-foreground"
        numberOfLines={1}
      >
        {activeBrand.name}
      </Text>
      {!compact ? (
        <SymbolIcon
          name="chevron.down"
          size={16}
          tintColor={colors.mutedForeground}
        />
      ) : null}
    </Pressable>
  );

  return (
    // A row that can shrink, so a long name truncates instead of the pill
    // measuring itself against its own content.
    <View
      className={`min-w-0 shrink flex-row ${align === "start" ? "justify-start" : "justify-end"}`}
    >
      {compact ? (
        // Plain glass with a hairline, like an untinted StudyGlass, rather
        // than a solid primary pill.
        <GlassBox
          isInteractive
          glassEffectStyle="clear"
          style={{
            borderRadius: 9999,
            borderWidth: 1,
            borderColor: colors.border,
            maxWidth: 176,
          }}
        >
          {trigger}
        </GlassBox>
      ) : (
        // Android only draws the ripple inside a rounded shape when an
        // ancestor clips it; the trigger's own radius leaves it square.
        <View className="min-w-0 shrink overflow-hidden rounded-full">
          {trigger}
        </View>
      )}
    </View>
  );
}

/**
 * The organization picker sheet: the active organization in the Hakgyo hero,
 * then every organization the learner belongs to as one list.
 */
export function OrganizationSwitcherContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const {
    activeBrand,
    availableOrganizations,
    colors,
    colorScheme,
    isRefreshingOrganizations,
    selectOrganization,
  } = useAppTheme();
  const switcherOptions = getOrganizationSwitcherOptions(
    activeBrand,
    availableOrganizations,
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow gap-4 px-5 pb-8"
      showsVerticalScrollIndicator={false}
    >
      <HakgyoHero
        inSheet
        onClose={onClose}
        closeLabel="Tutup pemilih organisasi"
      >
        <HeroMark
          face={
            <OrganizationMark
              logoUrl={activeBrand.logoUrl}
              name={activeBrand.name}
              size={56}
            />
          }
        />
        <HeroTitle
          eyebrow="Organisasi aktif"
          title={activeBrand.name}
          description="Kelas, latihan, dan warna aplikasi mengikuti organisasi yang kamu pilih."
        />
      </HakgyoHero>

      <View className="flex-row items-center justify-between">
        <Eyebrow>Pilih organisasi</Eyebrow>
        <ActivityIndicator
          accessibilityLabel="Memperbarui organisasi"
          animating={isRefreshingOrganizations}
          color={colors.primary}
          size="small"
        />
      </View>

      {availableOrganizations.length === 0 ? (
        <Text className="py-5 text-center text-sm text-muted-foreground">
          Belum ada organisasi aktif yang kamu ikuti.
        </Text>
      ) : null}

      {switcherOptions.length ? (
        <View className="overflow-hidden rounded-2xl border border-border">
          {switcherOptions.map((organization, index) => {
            const selected =
              organization.organizationId === activeBrand.organizationId;
            return (
              <View key={organization.organizationId ?? "hakgyo-default"}>
                {index > 0 ? <View className="ml-16 h-px bg-border" /> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  className="min-h-16 flex-row items-center gap-3 px-4 py-3 active:opacity-70"
                  style={
                    selected
                      ? {
                          backgroundColor: withOpacity(
                            colors.primary,
                            colorScheme === "dark" ? 0.22 : 0.1,
                          ),
                        }
                      : undefined
                  }
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
                    size={40}
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
                        ? "Tema organisasi"
                        : "Tema Hakgyo"}
                    </Text>
                  </View>
                  {selected ? (
                    <SymbolIcon
                      name="checkmark"
                      size={18}
                      weight="bold"
                      tintColor={colors.primary}
                    />
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}
