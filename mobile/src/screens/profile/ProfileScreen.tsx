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

// Komponen Menu Item untuk list navigasi
function MenuItem({
  icon,
  label,
  iconColor,
  iconBg,
  textColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  iconColor: string;
  iconBg: string;
  textColor?: string;
  onPress: () => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center gap-4 px-4 py-4 active:opacity-70"
    >
      <View className={`h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text
        className="flex-1 text-[15px] font-semibold"
        style={{ fontFamily: "PlusJakartaSans_600SemiBold", color: textColor || colors.text }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
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
      {/* Header */}
      <View className="mt-1 mb-2 flex-row items-center justify-between">
        <Text
          className="text-[28px] font-extrabold tracking-tight text-text"
          style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
        >
          Profil
        </Text>
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
          {/* Identity Hero Card */}
          <View className="mt-4 items-center rounded-[28px] bg-surface p-8 shadow-sm">
            <View className="relative">
              <View className="h-[100px] w-[100px] items-center justify-center rounded-full bg-brand/20 border-4 border-surface shadow-sm">
                <Text
                  className="text-4xl font-extrabold text-brand"
                  style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                >
                  {initials(typedProfile?.full_name)}
                </Text>
              </View>
            </View>

            <Text
              className="mt-5 text-[22px] font-extrabold text-text text-center"
              style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
            >
              {typedProfile?.full_name ?? "Pendengar Gaul"}
            </Text>

            {typedProfile?.email && (
              <Text
                className="mt-1 text-[13px] text-text-dim text-center"
                style={{ fontFamily: "PlusJakartaSans_500Medium" }}
              >
                {typedProfile.email}
              </Text>
            )}

            <View className="mt-5 flex-row flex-wrap justify-center gap-2">
              {typedProfile?.city && (
                <View className="flex-row items-center gap-1.5 rounded-full bg-orange/15 px-3 py-1.5">
                  <Ionicons name="location" size={14} color={colors.orange} />
                  <Text
                    className="text-xs font-bold text-orange"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    {typedProfile.city}
                  </Text>
                </View>
              )}
              {typedProfile?.whatsapp && (
                <View className="flex-row items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1.5">
                  <Ionicons name="logo-whatsapp" size={14} color="#10b981" />
                  <Text
                    className="text-xs font-bold"
                    style={{ fontFamily: "PlusJakartaSans_700Bold", color: "#10b981" }}
                  >
                    {typedProfile.whatsapp}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <SectionHeader title="Akun & Aplikasi" />
          <Card className="p-0 overflow-hidden">
            <MenuItem
              icon="person-outline"
              label="Edit Profil"
              iconColor={colors.brand}
              iconBg="bg-brand/15"
              onPress={() => navigation.navigate("EditProfile")}
            />
            <View className="h-px bg-line/40 ml-[72px]" />
            <MenuItem
              icon="settings-outline"
              label="Pengaturan Aplikasi"
              iconColor={colors.brand}
              iconBg="bg-brand/15"
              onPress={() => navigation.navigate("AppSettings")}
            />
            <View className="h-px bg-line/40 ml-[72px]" />
            <MenuItem
              icon="information-circle-outline"
              label="Tentang Gaul FM"
              iconColor={colors.brand}
              iconBg="bg-brand/15"
              onPress={() => navigation.navigate("About")}
            />
          </Card>

          <SectionHeader title="Sesi" />
          <Card className="p-0 overflow-hidden">
            <MenuItem
              icon="log-out-outline"
              label="Keluar"
              iconColor={colors.live}
              iconBg="bg-live/15"
              textColor={colors.live}
              onPress={() => setLogoutOpen(true)}
            />
          </Card>

          {/* Media sosial */}
          <SocialLinks />

          <View className="h-6" />

          {/* Custom logout confirmation — dark themed */}
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
                className="w-full max-w-sm overflow-hidden rounded-[28px] bg-surface"
              >
                <View className="items-center px-6 pb-4 pt-8">
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-live/15 mb-2">
                    <Ionicons
                      name="log-out-outline"
                      size={28}
                      color={colors.live}
                    />
                  </View>
                  <Text
                    className="mt-3 text-center text-[20px] font-extrabold text-text"
                    style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                  >
                    Keluar dari akun?
                  </Text>
                  <Text
                    className="mt-2 text-center text-[13px] leading-5 text-text-dim px-2"
                    style={{ fontFamily: "PlusJakartaSans_500Medium" }}
                  >
                    Kamu perlu login ulang untuk mengakses profil dan pengingat
                    program.
                  </Text>
                </View>
                <View className="flex-row gap-3 px-6 pb-6 pt-2">
                  <Pressable
                    onPress={() => setLogoutOpen(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Batal"
                    className="min-h-[52px] flex-1 items-center justify-center rounded-xl bg-surface-2 active:opacity-80"
                  >
                    <Text
                      className="text-[14px] font-bold text-text"
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                    >
                      Batal
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleSignOut()}
                    accessibilityRole="button"
                    accessibilityLabel="Keluar"
                    className="min-h-[52px] flex-1 items-center justify-center rounded-xl bg-live active:opacity-90 shadow-sm shadow-live/30"
                  >
                    <Text
                      className="text-[14px] font-extrabold text-white"
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
    <View className="mt-10 items-center pb-6">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-brand/15">
        <Ionicons name="radio" size={24} color={colors.brand} />
      </View>
      <Text
        className="text-[14px] font-extrabold tracking-tight text-text"
        style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
      >
        Gaul FM Semarang
      </Text>
      <Text
        className="mt-1 text-[12px] text-text-dim"
        style={{ fontFamily: "PlusJakartaSans_500Medium" }}
      >
        Ikuti kami di media sosial
      </Text>

      <View className="mt-5 flex-row items-center gap-4">
        {SOCIALS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => open(item.url)}
            accessibilityRole="link"
            accessibilityLabel={`Buka ${item.label}`}
            hitSlop={8}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface-2 active:opacity-70 shadow-sm"
          >
            <Ionicons name={item.icon} size={22} color={colors.brand} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
