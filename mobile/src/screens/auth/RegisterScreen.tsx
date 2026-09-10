import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
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
      <View className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-brand/10" />
    </View>
  );
}

function GoogleIcon() {
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
      <Ionicons name="logo-google" size={18} color="#EA4335" />
    </View>
  );
}

export function RegisterScreen() {
  const colors = useThemeStore((s) => s.colors);
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleRegister = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        if (!result.error.toLowerCase().includes("batal")) {
          setErrorMessage(result.error);
        }
      } else {
        // Pendaftaran baru selalu diarahkan ke pengisian biodata
        navigation.navigate("CompleteProfile");
      }
    } catch {
      setErrorMessage("Gagal mendaftar dengan Google. Periksa koneksi kamu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <AmbientGlow />
      <AuthFormLayout>
        <View className="items-center mt-8">
          <BrandLogo size="lg" />
        </View>

        <View className="mt-8 mb-6 items-center">
          <Text
            className="text-[28px] font-extrabold tracking-tight text-text text-center"
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            Buat Akun Baru
          </Text>
          <Text
            className="mt-2 text-sm text-text-dim text-center px-6"
            style={{ fontFamily: "PlusJakartaSans_500Medium" }}
          >
            Daftarkan diri kamu sebagai bagian dari pendengar hits Radio Gaul FM 87.8 Semarang.
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

        <View className="mt-2 gap-4">
          <Pressable
            onPress={() => void handleGoogleRegister()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Daftar dengan Akun Google"
            className="flex-row items-center justify-center gap-3.5 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm active:opacity-80"
            style={{ minHeight: 56 }}
          >
            {loading ? (
              <ActivityIndicator color={colors.brand} size="small" />
            ) : (
              <>
                <GoogleIcon />
                <Text
                  className="text-[15px] font-bold text-text tracking-wide"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Daftar dengan Akun Google
                </Text>
              </>
            )}
          </Pressable>

          <View className="mt-2 flex-row items-start gap-2.5 rounded-2xl bg-surface-2/60 p-4 border border-line/40">
            <Ionicons
              name="sparkles-outline"
              size={18}
              color={colors.orange}
              style={{ marginTop: 1 }}
            />
            <Text
              className="flex-1 text-xs leading-5 text-text-dim"
              style={{ fontFamily: "PlusJakartaSans_500Medium" }}
            >
              Setelah menghubungkan akun Google, kamu cukup melengkapi biodata singkat (Nama, Gender, WA, & Kota) tanpa perlu password.
            </Text>
          </View>
        </View>

        <View className="mt-12 flex-row items-center justify-center gap-1.5 pb-6">
          <Text
            className="text-sm text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_500Medium" }}
          >
            Sudah punya akun?
          </Text>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            accessibilityRole="link"
            hitSlop={8}
            className="min-h-11 justify-center px-1"
          >
            <Text
              className="text-sm font-bold text-orange"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Masuk di sini
            </Text>
          </Pressable>
        </View>
      </AuthFormLayout>
    </View>
  );
}
