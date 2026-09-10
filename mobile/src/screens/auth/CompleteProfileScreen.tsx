import React, { useState } from "react";
import { Keyboard, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeStore } from "../../stores/themeStore";
import type { RootStackParamList } from "../../types";
import { useAuthStore } from "../../stores/authStore";
import { showToast } from "../../stores/toastStore";
import { AuthFormLayout } from "../../components/ui/AuthFormLayout";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";

interface FormErrors {
  fullName?: string;
  gender?: string;
  whatsapp?: string;
  city?: string;
  form?: string;
}

export function CompleteProfileScreen() {
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const completeBiodata = useAuthStore((s) => s.completeBiodata);

  const defaultName =
    profile?.full_name ||
    (session?.user?.user_metadata?.full_name as string) ||
    (session?.user?.user_metadata?.name as string) ||
    "";

  const [fullName, setFullName] = useState(defaultName);
  const [gender, setGender] = useState<"Laki-laki" | "Perempuan" | "">(
    profile?.gender === "Laki-laki" || profile?.gender === "Perempuan"
      ? profile.gender
      : ""
  );
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || "");
  const [city, setCity] = useState(profile?.city || "Semarang");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSelectGender = (val: "Laki-laki" | "Perempuan") => {
    Keyboard.dismiss();
    setGender(val);
    setErrors((prev) => {
      if (!prev.gender) return prev;
      const next = { ...prev };
      delete next.gender;
      return next;
    });
  };

  const submit = async () => {
    const next: FormErrors = {};
    if (fullName.trim().length < 2) next.fullName = "Nama lengkap wajib diisi";
    if (!gender) next.gender = "Pilih jenis kelamin";
    if (whatsapp.trim().length < 8) next.whatsapp = "Nomor WhatsApp wajib diisi (min 8 digit)";
    if (city.trim().length < 2) next.city = "Kota tempat tinggal wajib diisi";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const errorMsg = await completeBiodata({
        fullName: fullName.trim(),
        gender,
        whatsapp: whatsapp.trim(),
        city: city.trim(),
      });

      if (errorMsg) {
        setErrors({ form: errorMsg });
      } else {
        showToast("Biodata berhasil disimpan! Selamat datang di Gaul FM 🎉", "success");
        // Navigasi ke halaman utama
        navigation.reset({
          index: 0,
          routes: [{ name: "Main" }],
        });
      }
    } catch {
      setErrors({ form: "Gagal menyimpan biodata. Periksa koneksi internet kamu." });
    } finally {
      setLoading(false);
    }
  };

  const isLaki = gender === "Laki-laki";
  const isPerempuan = gender === "Perempuan";

  return (
    <View className="flex-1 bg-bg">
      <AuthFormLayout>
        <View className="items-center mt-4">
          <BrandLogo size="md" />
        </View>

        <View className="mt-6 mb-6 items-center">
          <Text
            className="text-[26px] font-extrabold tracking-tight text-text text-center"
            style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
          >
            Satu Langkah Lagi! 🎉
          </Text>
          <Text
            className="mt-2 text-sm text-text-dim text-center px-4"
            style={{ fontFamily: "PlusJakartaSans_500Medium" }}
          >
            Lengkapi biodata diri kamu untuk bergabung dengan komunitas Gaul FM Semarang.
          </Text>
        </View>

        <View className="gap-5">
          <TextInput
            label="Nama Lengkap *"
            icon="person-outline"
            placeholder="Nama kamu"
            autoComplete="name"
            autoCapitalize="words"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (errors.fullName) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.fullName;
                  return next;
                });
              }
            }}
            error={errors.fullName}
          />

          {/* Gender Selector Chips */}
          <View>
            <Text
              className="text-xs font-semibold uppercase tracking-wider text-text-dim mb-2 px-1"
              style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
            >
              Jenis Kelamin *
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectGender("Laki-laki")}
                accessibilityRole="button"
                accessibilityState={{ selected: isLaki }}
                accessibilityLabel="Pilih Jenis Kelamin Laki-laki"
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 14,
                  borderWidth: isLaki ? 2 : 1,
                  borderColor: isLaki ? colors.brand : colors.line,
                  backgroundColor: isLaki
                    ? (mode === "dark" ? "rgba(148, 248, 174, 0.15)" : "rgba(0, 122, 62, 0.08)")
                    : colors.surface2,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                }}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name="male"
                    size={19}
                    color={isLaki ? colors.brand : colors.textDim}
                  />
                  <Text
                    className="text-sm font-bold"
                    style={{
                      fontFamily: "PlusJakartaSans_700Bold",
                      color: isLaki
                        ? (mode === "dark" ? colors.brand : "#006633")
                        : colors.text,
                    }}
                  >
                    Laki-laki
                  </Text>
                </View>
                <Ionicons
                  name={isLaki ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={isLaki ? colors.brand : colors.textDim}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectGender("Perempuan")}
                accessibilityRole="button"
                accessibilityState={{ selected: isPerempuan }}
                accessibilityLabel="Pilih Jenis Kelamin Perempuan"
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 14,
                  borderWidth: isPerempuan ? 2 : 1,
                  borderColor: isPerempuan ? colors.orange : colors.line,
                  backgroundColor: isPerempuan
                    ? (mode === "dark" ? "rgba(255, 154, 61, 0.15)" : "rgba(220, 117, 33, 0.08)")
                    : colors.surface2,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                }}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name="female"
                    size={19}
                    color={isPerempuan ? colors.orange : colors.textDim}
                  />
                  <Text
                    className="text-sm font-bold"
                    style={{
                      fontFamily: "PlusJakartaSans_700Bold",
                      color: isPerempuan ? colors.orange : colors.text,
                    }}
                  >
                    Perempuan
                  </Text>
                </View>
                <Ionicons
                  name={isPerempuan ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={isPerempuan ? colors.orange : colors.textDim}
                />
              </TouchableOpacity>
            </View>
            {errors.gender && (
              <Text className="mt-1.5 text-xs text-live px-1" style={{ fontFamily: "PlusJakartaSans_500Medium" }}>
                {errors.gender}
              </Text>
            )}
          </View>

          <TextInput
            label="Nomor WhatsApp *"
            icon="logo-whatsapp"
            placeholder="08123456789"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={whatsapp}
            onChangeText={setWhatsapp}
            error={errors.whatsapp}
          />

          <TextInput
            label="Asal Kota *"
            icon="location-outline"
            placeholder="Semarang"
            value={city}
            onChangeText={setCity}
            error={errors.city}
          />

          {errors.form ? (
            <View className="flex-row items-center gap-2 rounded-xl border border-live/40 bg-live/10 px-4 py-3 mt-1">
              <Ionicons name="alert-circle-outline" size={18} color={colors.live} />
              <Text className="flex-1 text-sm font-medium text-live">
                {errors.form}
              </Text>
            </View>
          ) : null}

          <View className="mt-4">
            <Button
              title="Simpan & Lanjutkan"
              variant="cta"
              onPress={() => void submit()}
              loading={loading}
            />
          </View>
        </View>
      </AuthFormLayout>
    </View>
  );
}
