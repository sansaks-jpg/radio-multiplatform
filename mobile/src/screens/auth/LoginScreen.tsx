import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeStore } from "../../stores/themeStore";
import type { AuthStackParamList } from "../../types";
import { useAuthStore } from "../../stores/authStore";
import { AuthFormLayout } from "../../components/ui/AuthFormLayout";
import { BrandLogo } from "../../components/ui/BrandLogo";

function AmbientGlow() {
  return (
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
      <View className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange/10" />
      <View className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-orange/10" />
      <View className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-brand/10" />
      <View className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-brand/10" />
    </View>
  );
}

/** Official 4-Color Google 'G' Logo (SVG Data URI) */
const GOOGLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  <path fill="none" d="M0 0h48v48H0z"/>
</svg>`;

const GOOGLE_ICON_URI = `data:image/svg+xml;utf8,${encodeURIComponent(GOOGLE_SVG)}`;

export function LoginScreen() {
  const colors = useThemeStore((s) => s.colors);
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        if (!result.error.toLowerCase().includes("batal")) {
          setErrorMessage(result.error);
        }
      } else if (result.isNewUser) {
        navigation.navigate("CompleteProfile");
      }
    } catch {
      setErrorMessage("Gagal masuk dengan Google. Periksa koneksi kamu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <AmbientGlow />
      <AuthFormLayout>
        <View className="items-center mt-12">
          <BrandLogo size="lg" />
        </View>

        <View className="mt-8 mb-8 items-center">
          <Text
            className="text-[28px] font-extrabold tracking-tight text-text text-center"
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            Selamat Datang
          </Text>
          <Text
            className="mt-2 text-sm text-text-dim text-center px-6 leading-6"
            style={{ fontFamily: "PlusJakartaSans_500Medium" }}
          >
            Masuk atau daftar untuk mendengarkan siaran live dan berinteraksi di Gaul FM Semarang.
          </Text>
        </View>

        {errorMessage ? (
          <View className="mb-4 flex-row items-center gap-2 rounded-xl border border-live/40 bg-live/10 px-4 py-3">
            <Ionicons name="alert-circle-outline" size={18} color={colors.live} />
            <Text className="flex-1 text-sm font-medium text-live">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Tombol Masuk / Daftar dengan Google */}
        <View className="mt-2">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => void handleGoogleLogin()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Masuk atau Daftar dengan Google"
            style={{
              minHeight: 56,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: colors.line,
              backgroundColor: colors.surface,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              paddingHorizontal: 20,
              paddingVertical: 14,
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.brand} size="small" />
            ) : (
              <>
                <Image
                  source={{ uri: GOOGLE_ICON_URI }}
                  style={{ width: 22, height: 22 }}
                  contentFit="contain"
                />
                <Text
                  className="text-[15px] font-bold text-text tracking-wide"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Masuk / Daftar dengan Google
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </AuthFormLayout>
    </View>
  );
}
