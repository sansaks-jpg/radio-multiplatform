import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useThemeStore } from "../../stores/themeStore";
import { openExternalUrl } from "../../services/youtube";
import { Screen } from "../../components/ui/Screen";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { Card } from "../../components/ui/Card";

/**
 * About — copy & gallery from radiogaulfmsmg.com/about (prototype).
 * Studio contact kept for deep links (call / email / maps).
 */

const STUDIO = {
  address: "Jl. Pandanaran No. 90, Semarang, Jawa Tengah 50241",
  phone: "+62243550090",
  phoneDisplay: "(024) 355-0090",
  email: "komersial@gaulfm.id",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Jl.+Pandanaran+No.+90+Semarang",
  website: "https://radiogaulfmsmg.com/",
  youtube: "https://www.youtube.com/@radiogaulfm_smg",
  instagram: "https://www.instagram.com/radiogaulfm_smg/",
  tiktok: "https://www.tiktok.com/@radiogaulfm_smg",
};

/** Studio / gallery photos from radiogaulfmsmg.com media library. */
const GALLERY = [
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.33.37.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-12.28.41.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-22-at-13.34.42.jpeg",
  "https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-21-at-11.28.17.jpeg",
] as const;

const PILLARS = [
  {
    icon: "tv-outline" as const,
    title: "Radio Visual Pertama di Semarang",
    body: "Siaran audio yang bisa disaksikan real-time lewat YouTube — lihat studio, penyiar, dan energi siaran secara langsung.",
  },
  {
    icon: "phone-portrait-outline" as const,
    title: "Multiplatform & Always Connected",
    body: "87.8 FM + streaming visual YouTube, plus Instagram & TikTok untuk highlight, konten interaktif, dan update Gaulista.",
  },
  {
    icon: "people-outline" as const,
    title: "Kredibelitas & Kolaborasi",
    body: "Ruang ekspresi, info, dan hiburan anak muda Semarang. Buka peluang kerjasama, promosi, dan kolaborasi brand & komunitas.",
  },
] as const;

interface ContactRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  actionLabel: string;
}

function ContactRow({
  icon,
  label,
  value,
  onPress,
  actionLabel,
}: ContactRowProps) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${actionLabel}: ${value}`}
      className="flex-row items-center gap-3 py-3 active:opacity-70"
    >
      <View className="h-10 w-10 items-center justify-center rounded-md bg-brand/10">
        <Ionicons name={icon} size={18} color={colors.brand} />
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
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
  );
}

export function AboutScreen() {
  const colors = useThemeStore((s) => s.colors);
  const navigation = useNavigation();

  return (
    <Screen scroll dockInset="dock">
      <View className="mt-1 flex-row items-center gap-3">
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={10}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-2"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text
          className="text-[22px] font-extrabold tracking-tight text-text"
          style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
        >
          Tentang Gaul FM
        </Text>
      </View>

      {/* Brand block — web tagline */}
      <View className="mt-6 items-center rounded-card bg-surface p-5">
        <BrandLogo size="lg" />
        <Text
          className="mt-4 text-center text-lg font-extrabold text-text"
          style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
        >
          87.8 GAUL FM Semarang
        </Text>
        <Text
          className="mt-1 text-center text-xs font-bold uppercase tracking-widest text-brand"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          Radio Anak Muda · The Best Visual Radio Station
        </Text>
        <Text
          className="mt-3 text-center text-sm leading-6 text-text-dim"
          style={{ fontFamily: "PlusJakartaSans_400Regular" }}
        >
          Format Contemporary Hits Radio (CHR) untuk usia 15–29 tahun.
          Menghadirkan siaran FM dan visual streaming yang membuat pengalaman
          mendengar jadi lebih hidup dan interaktif.
        </Text>
        <Pressable
          onPress={() => void openExternalUrl(STUDIO.youtube)}
          accessibilityRole="link"
          accessibilityLabel="Buka YouTube Radio Gaul FM"
          className="mt-4 flex-row items-center gap-2 rounded-full bg-orange px-4 py-2.5 active:opacity-90"
        >
          <Ionicons name="logo-youtube" size={16} color="#FFFFFF" />
          <Text
            className="text-xs font-extrabold uppercase tracking-wide text-white"
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            Dengarkan di YouTube
          </Text>
        </Pressable>
      </View>

      {/* Pillars from web About */}
      <Text
        className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-widest text-text-dim"
        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
      >
        Kenapa Gaul FM
      </Text>
      <View className="gap-2.5">
        {PILLARS.map((p) => (
          <View
            key={p.title}
            className="flex-row gap-3 rounded-card bg-surface p-3.5"
          >
            <View className="h-10 w-10 items-center justify-center rounded-md bg-brand/10">
              <Ionicons name={p.icon} size={18} color={colors.brand} />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className="text-sm font-bold text-text"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                {p.title}
              </Text>
              <Text
                className="mt-1 text-xs leading-5 text-text-dim"
                style={{ fontFamily: "PlusJakartaSans_400Regular" }}
              >
                {p.body}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Gallery — real studio photos from web */}
      <Text
        className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-widest text-text-dim"
        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
      >
        Gallery 87.8 Gaul FM
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {GALLERY.map((uri) => (
          <View
            key={uri}
            className="overflow-hidden rounded-md bg-surface-3"
            style={{ width: "31.5%", aspectRatio: 1 }}
          >
            <Image
              source={{ uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          </View>
        ))}
      </View>

      {/* Contact */}
      <Text
        className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-widest text-text-dim"
        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
      >
        Hubungi Kami
      </Text>
      <Card>
        <ContactRow
          icon="globe-outline"
          label="Website"
          value="radiogaulfmsmg.com"
          actionLabel="Buka website"
          onPress={() => void Linking.openURL(STUDIO.website)}
        />
        <View className="h-px bg-line/40" />
        <ContactRow
          icon="location-outline"
          label="Studio"
          value={STUDIO.address}
          actionLabel="Buka peta"
          onPress={() => void Linking.openURL(STUDIO.mapsUrl)}
        />
        <View className="h-px bg-line/40" />
        <ContactRow
          icon="call-outline"
          label="Telepon Studio"
          value={STUDIO.phoneDisplay}
          actionLabel="Telepon"
          onPress={() => void Linking.openURL(`tel:${STUDIO.phone}`)}
        />
        <View className="h-px bg-line/40" />
        <ContactRow
          icon="mail-outline"
          label="Email Komersial"
          value={STUDIO.email}
          actionLabel="Kirim email"
          onPress={() => void Linking.openURL(`mailto:${STUDIO.email}`)}
        />
      </Card>

      <Text
        className="mt-8 text-center text-[11px] text-text-dim"
        style={{ fontFamily: "PlusJakartaSans_400Regular" }}
      >
        Gaul FM Semarang Mobile — v0.1.0 (MVP)
      </Text>
    </Screen>
  );
}
