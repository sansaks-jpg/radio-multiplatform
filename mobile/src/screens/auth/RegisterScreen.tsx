import React, { useRef, useState } from "react";
import {
  Pressable,
  Text,
  TextInput as RNTextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeStore } from "../../stores/themeStore";
import type { AuthStackParamList } from "../../types";
import { useAuthStore } from "../../stores/authStore";
import { showToast } from "../../stores/toastStore";
import { AuthFormLayout } from "../../components/ui/AuthFormLayout";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { BrandLogo } from "../../components/ui/BrandLogo";

const EMAIL_RE = /\S+@\S+\.\S+/;

interface FormErrors {
  fullName?: string;
  email?: string;
  whatsapp?: string;
  city?: string;
  password?: string;
  confirm?: string;
  form?: string;
}

export function RegisterScreen() {
  const colors = useThemeStore((s) => s.colors);
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const signUp = useAuthStore((s) => s.signUp);

  const emailRef = useRef<RNTextInput>(null);
  const whatsappRef = useRef<RNTextInput>(null);
  const cityRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: FormErrors = {};
    if (fullName.trim().length < 2) next.fullName = "Nama lengkap wajib diisi";
    if (!EMAIL_RE.test(email.trim())) next.email = "Format email tidak valid";
    if (whatsapp.trim().length < 8) next.whatsapp = "Nomor WhatsApp tidak valid";
    if (password.length < 6) next.password = "Password minimal 6 karakter";
    if (confirm !== password) next.confirm = "Konfirmasi password tidak sama";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const failure = await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        city: city.trim(),
        password,
      });
      if (failure === "PLEASE_CHECK_EMAIL") {
        showToast("Pendaftaran berhasil! Periksa email kamu untuk konfirmasi.", "success");
        navigation.navigate("Login");
      } else if (failure) {
        setErrors({ form: failure });
      }
    } catch {
      setErrors({ form: "Pendaftaran gagal. Terjadi kesalahan jaringan." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <AuthFormLayout>
        <View className="mb-4 items-center">
          <BrandLogo size="md" />
        </View>

        <Text className="text-[28px] font-extrabold tracking-tight text-text text-center" style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}>
          Buat Akun Baru
        </Text>
        <Text className="mt-2 text-sm text-text-dim text-center" style={{ fontFamily: "PlusJakartaSans_500Medium" }}>
          Gabung komunitas pendengar Gaul FM Semarang.
        </Text>

        <View className="mt-8 gap-5">
          <TextInput
            label="Nama Lengkap *"
            icon="person-outline"
            placeholder="Nama kamu"
            autoComplete="name"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <TextInput
            ref={emailRef}
            label="Email *"
            icon="mail-outline"
            placeholder="nama@email.com"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            returnKeyType="next"
            onSubmitEditing={() => whatsappRef.current?.focus()}
          />
          
          <View className="flex-row gap-4">
            <View className="flex-1">
              <TextInput
                ref={whatsappRef}
                label="WhatsApp *"
                icon="logo-whatsapp"
                placeholder="08xx..."
                keyboardType="phone-pad"
                autoComplete="tel"
                value={whatsapp}
                onChangeText={setWhatsapp}
                error={errors.whatsapp}
                returnKeyType="next"
                onSubmitEditing={() => cityRef.current?.focus()}
              />
            </View>
            <View className="flex-1">
              <TextInput
                ref={cityRef}
                label="Kota (Opsional)"
                icon="location-outline"
                placeholder="Semarang"
                value={city}
                onChangeText={setCity}
                error={errors.city}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          <TextInput
            ref={passwordRef}
            label="Password *"
            icon="lock-closed-outline"
            placeholder="Minimal 6 karakter"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <TextInput
            ref={confirmRef}
            label="Konfirmasi Password *"
            icon="checkmark-circle-outline"
            placeholder="Ulangi password"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />

          <View className="mt-2 flex-row items-start gap-3 rounded-2xl bg-surface p-4 border border-line/50">
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={colors.brand}
              style={{ marginTop: 2 }}
            />
            <Text className="flex-1 text-[11px] leading-4 text-text-dim" style={{ fontFamily: "PlusJakartaSans_500Medium" }}>
              Dengan mendaftar, kamu setuju aplikasi menyimpan preferensi
              lokasi dan jenis perangkat untuk personalisasi. Detail dapat diubah
              melalui halaman Profil.
            </Text>
          </View>

          {errors.form ? (
            <View className="flex-row items-center gap-2 rounded-xl border border-live/40 bg-live/10 px-4 py-3 mt-2">
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={colors.live}
              />
              <Text className="flex-1 text-sm font-medium text-live">
                {errors.form}
              </Text>
            </View>
          ) : null}

          <Button
            title="Daftar Sekarang"
            variant="cta"
            onPress={() => void submit()}
            loading={loading}
          />
        </View>

        <View className="mt-8 flex-row items-center justify-center gap-1 pb-4">
          <Text className="text-sm text-text-dim" style={{ fontFamily: "PlusJakartaSans_500Medium" }}>Sudah punya akun?</Text>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="link"
            hitSlop={8}
            className="min-h-11 justify-center px-1"
          >
            <Text className="text-sm font-bold text-orange" style={{ fontFamily: "PlusJakartaSans_700Bold" }}>Masuk di sini</Text>
          </Pressable>
        </View>
      </AuthFormLayout>
    </View>
  );
}
