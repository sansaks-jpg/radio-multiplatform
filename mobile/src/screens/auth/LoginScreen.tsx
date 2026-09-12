import React, { useState } from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeStore } from "../../stores/themeStore";
import type { AuthStackParamList } from "../../types";
import { useAuthStore } from "../../stores/authStore";
import { AuthFormLayout } from "../../components/ui/AuthFormLayout";
import { BrandLogo } from "../../components/ui/BrandLogo";

const googleLogo = require("../../../assets/google-logo.png");

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

export function LoginScreen() {
  const colors = useThemeStore((s) => s.colors);
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInDemo = useAuthStore((s) => s.signInDemo);

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
                  source={googleLogo}
                  style={{ width: 22, height: 22 }}
                  resizeMode="contain"
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

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => void signInDemo()}
            accessibilityRole="button"
            accessibilityLabel="Masuk Cepat Mode Uji Coba"
            style={{
              minHeight: 50,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.brand,
              backgroundColor: colors.brand + "18",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 12,
              paddingHorizontal: 20,
            }}
          >
            <Ionicons name="flash-outline" size={18} color={colors.brand} />
            <Text
              className="text-[14px] font-bold tracking-wide"
              style={{ fontFamily: "PlusJakartaSans_700Bold", color: colors.brand }}
            >
              Masuk Cepat (Mode Uji Coba)
            </Text>
          </TouchableOpacity>
        </View>
      </AuthFormLayout>
    </View>
  );
}
