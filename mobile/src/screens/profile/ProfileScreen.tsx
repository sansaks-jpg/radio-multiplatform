import React, { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Profile, ProfileStackParamList } from "../../types";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { useProfile } from "../../hooks/useProfile";
import { openExternalUrl } from "../../services/youtube";
import { Screen } from "../../components/ui/Screen";
import { Card } from "../../components/ui/Card";

/**
 * Profile hub — identity + account + about + social + logout.
 * App preferences di AppSettings (gear). DESIGN.md Sonic Pulse.
 * Callers: ProfileNavigator ProfileHome.
 */

function initials(name: string | null | undefined): string {
  if (!name) return "GF";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type IconTone = "brand" | "orange" | "live";

function InfoRow({
  icon,
  tone = "brand",
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: IconTone;
  label: string;
  value: string | null | undefined;
}) {
  const colors = useThemeStore((s) => s.colors);
  const toneMap: Record<IconTone, { bg: string; fg: string }> = {
    brand: { bg: "bg-brand/10", fg: colors.brand },
    orange: { bg: "bg-orange/10", fg: colors.orange },
    live: { bg: "bg-live/10", fg: colors.live },
  };
  const t = toneMap[tone];
  return (
    <View className="flex-row items-center gap-3 py-3.5">
      <View
        className={`h-10 w-10 items-center justify-center rounded-lg ${t.bg}`}
      >
        <Ionicons name={icon} size={18} color={t.fg} />
      </View>
      <View className="flex-1">
        <Text
          className="text-[11px] font-semibold uppercase tracking-wide text-text-dim"
          style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
        >
          {label}
        </Text>
        <Text
          className="mt-0.5 text-sm font-medium text-text"
          style={{ fontFamily: "PlusJakartaSans_500Medium" }}
        >
          {value && value.length > 0 ? value : "Belum tersedia"}
        </Text>
      </View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="mb-2 mt-6 flex-row items-center gap-2 px-1">
      <View className="h-4 w-1 rounded-full bg-brand" />
      <Text
        className="text-[13px] font-bold uppercase tracking-widest text-text-dim"
        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
      >
        {title}
      </Text>
    </View>
  );
}

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { profile, initializing } = useProfile();
  const signOut = useAuthStore((s) => s.signOut);
  const colors = useThemeStore((s) => s.colors);
  const typedProfile: Profile | null = profile;
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleSignOut = async () => {
    setLogoutOpen(false);
    await signOut();
  };

  return (
    <Screen scroll dockInset="dock">
      {/* Header — larger title, settings gear more prominent */}
      <View className="mt-1 flex-row items-center justify-between">
        <Text
          className="text-[28px] font-extrabold tracking-tight text-text"
          style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
        >
          Profil
        </Text>
        <Pressable
          onPress={() => navigation.navigate("AppSettings")}
          accessibilityRole="button"
          accessibilityLabel="Pengaturan aplikasi"
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {initializing ? (
        <View className="mt-20 items-center justify-center">
          <ActivityIndicator color={colors.brand} size="large" />
          <Text
            className="mt-3 text-sm text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_400Regular" }}
          >
            Memuat profil…
          </Text>
        </View>
      ) : (
        <>
          {/* Identity card — more prominent, better avatar */}
          <View className="mt-6 items-center rounded-2xl bg-surface p-6">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-brand">
              <Text
                className="text-3xl font-extrabold text-onbrand"
                style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
              >
            {initials(typedProfile?.full_name)}
          </Text>
        </View>
        <Text
          className="mt-4 text-2xl font-extrabold text-text"
          style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
        >
          {typedProfile?.full_name ?? "Pendengar Gaul"}
        </Text>
        {typedProfile?.email ? (
          <Text
            className="mt-1.5 text-sm text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_400Regular" }}
          >
            {typedProfile.email}
          </Text>
        ) : null}
        {typedProfile?.city ? (
          <View className="mt-3 flex-row items-center gap-1.5 rounded-full bg-orange/10 px-3 py-1.5">
            <Ionicons name="location-outline" size={12} color={colors.orange} />
            <Text
              className="text-xs font-semibold text-orange"
              style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
            >
              {typedProfile.city}
            </Text>
          </View>
        ) : null}
      </View>

      <SectionHeader title="Akun" />
      <Card>
        <InfoRow
          icon="person-outline"
          label="Nama"
          value={typedProfile?.full_name}
        />
        <View className="h-px bg-line/40" />
        <InfoRow icon="mail-outline" label="Email" value={typedProfile?.email} />
        <View className="h-px bg-line/40" />
        <InfoRow
          icon="logo-whatsapp"
          tone="orange"
          label="WhatsApp"
          value={typedProfile?.whatsapp}
        />
      </Card>

      <SectionHeader title="Lainnya" />
      <Card className="p-0">
        <Pressable
          onPress={() => navigation.navigate("About")}
          accessibilityRole="button"
          accessibilityLabel="Tentang Gaul FM"
          className="flex-row items-center gap-3 px-4 py-4 active:opacity-70"
        >
          <View className="h-11 w-11 items-center justify-center rounded-lg bg-brand/10">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.brand}
            />
          </View>
          <Text
            className="flex-1 text-base font-semibold text-text"
            style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
          >
            Tentang Gaul FM
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </Pressable>
      </Card>

      <SectionHeader title="Sesi" />
      <Card className="p-0">
        <Pressable
          onPress={() => setLogoutOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Keluar dari akun"
          className="flex-row items-center gap-3 px-4 py-4 active:opacity-70"
        >
          <View className="h-11 w-11 items-center justify-center rounded-lg bg-live/10">
            <Ionicons name="log-out-outline" size={20} color={colors.live} />
          </View>
          <Text
            className="flex-1 text-base font-semibold text-live"
            style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
          >
            Keluar
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </Pressable>
      </Card>

      {/* Media sosial */}
      <SocialLinks />

      <View className="h-6" />

      {/* Custom logout confirmation — dark themed, no native Alert chrome */}
      <Modal
        visible={logoutOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup dialog"
          onPress={() => setLogoutOpen(false)}
          className="flex-1 items-center justify-center bg-black/70 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-surface"
          >
            <View className="items-center px-6 pb-4 pt-7">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-live/12">
                <Ionicons
                  name="log-out-outline"
                  size={26}
                  color={colors.live}
                />
              </View>
              <Text
                className="mt-4 text-center text-lg font-extrabold text-text"
                style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
              >
                Keluar dari akun?
              </Text>
              <Text
                className="mt-1.5 text-center text-sm leading-5 text-text-dim"
                style={{ fontFamily: "PlusJakartaSans_400Regular" }}
              >
                Kamu perlu login ulang untuk mengakses profil dan pengingat
                program.
              </Text>
            </View>
            <View className="flex-row gap-2.5 px-5 pb-5">
              <Pressable
                onPress={() => setLogoutOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Batal"
                className="min-h-12 flex-1 items-center justify-center rounded-md border border-line/60 bg-surface-2 active:opacity-80"
              >
                <Text
                  className="text-sm font-bold text-text"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Batal
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSignOut()}
                accessibilityRole="button"
                accessibilityLabel="Keluar"
                className="min-h-12 flex-1 items-center justify-center rounded-md bg-live active:opacity-90"
              >
                <Text
                  className="text-sm font-extrabold text-white"
                  style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                >
                  Keluar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
        </Modal>
      </>
      )}
    </Screen>
  );
}

type SocialKey = "instagram" | "youtube" | "tiktok";

interface SocialItem {
  key: SocialKey;
  label: string;
  url: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SOCIALS: SocialItem[] = [
  {
    key: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/radiogaulfm_smg/",
    icon: "logo-instagram",
  },
  {
    key: "youtube",
    label: "YouTube",
    url: "https://www.youtube.com/@radiogaulfm_smg",
    icon: "logo-youtube",
  },
  {
    key: "tiktok",
    label: "TikTok",
    url: "https://www.tiktok.com/@radiogaulfm_smg",
    icon: "logo-tiktok",
  },
];

/** Media sosial — centered footer with brand watermark. */
function SocialLinks() {
  const colors = useThemeStore((s) => s.colors);
  const open = useCallback((url: string) => {
    // YouTube → native app; IG/TikTok → system (or their apps if linked)
    void openExternalUrl(url);
  }, []);

  return (
    <View className="mt-10 items-center">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-brand/15">
        <Ionicons name="radio" size={24} color={colors.brand} />
      </View>
      <Text
        className="text-sm font-extrabold tracking-tight text-text"
        style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
      >
        Gaul FM Semarang
      </Text>
      <Text
        className="mt-0.5 text-xs text-text-dim"
        style={{ fontFamily: "PlusJakartaSans_400Regular" }}
      >
        Ikuti kami di media sosial
      </Text>

      <View className="mt-4 flex-row items-center gap-4">
        {SOCIALS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => open(item.url)}
            accessibilityRole="link"
            accessibilityLabel={`Buka ${item.label}`}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
          >
            <Ionicons name={item.icon} size={20} color={colors.brand} />
          </Pressable>
        ))}
      </View>

      <Text
        className="mt-3 text-[11px] text-text-dim"
        style={{ fontFamily: "PlusJakartaSans_500Medium" }}
      >
        @radiogaulfm_smg
      </Text>
    </View>
  );
}
