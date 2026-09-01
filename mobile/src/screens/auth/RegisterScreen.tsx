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

const EMAIL_RE = /\S+@\S+\.\S+/;

interface FormErrors {
  fullName?: string;
  email?: string;
  whatsapp?: string;
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
  const passwordRef = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: FormErrors = {};
    if (fullName.trim().length < 2) next.fullName = "Nama lengkap wajib diisi";
    if (!EMAIL_RE.test(email.trim())) next.email = "Format email tidak valid";
    if (whatsapp.trim().length < 8)
      next.whatsapp = "Nomor WhatsApp tidak valid";
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
        <Text className="text-2xl font-extrabold tracking-tight text-text">
          Buat Akun
        </Text>
        <Text className="mt-1 text-sm text-text-dim">
          Gabung komunitas pendengar Gaul FM Semarang.
        </Text>

        <View className="mt-6 gap-4 rounded-card border border-line/60 bg-surface p-5">
          <TextInput
            label="Nama Lengkap"
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
            label="Email"
            placeholder="nama@email.com"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            returnKeyType="next"
            onSubmitEditing={() => whatsappRef.current?.focus()}
          />
          <TextInput
            ref={whatsappRef}
            label="Nomor WhatsApp"
            placeholder="08xxxxxxxxxx"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={whatsapp}
            onChangeText={setWhatsapp}
            error={errors.whatsapp}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TextInput
            ref={passwordRef}
            label="Password"
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
            label="Konfirmasi Password"
            placeholder="Ulangi password"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />

          <Card className="flex-row items-start gap-3 bg-surface-2">
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={colors.brand}
            />
            <Text className="flex-1 text-xs leading-5 text-text-dim">
              Dengan mendaftar, kamu setuju aplikasi mengumpulkan tipe
              perangkat, versi OS, dan lokasi satu kali (GPS) untuk kebutuhan
              pemasaran dan personalisasi konten lokal. Detailnya selalu bisa
              kamu lihat di halaman Profil.
            </Text>
          </Card>

          {errors.form ? (
            <Text className="text-center text-sm font-medium text-live">
              {errors.form}
            </Text>
          ) : null}

          <Button
            title="Daftar"
            variant="cta"
            onPress={() => void submit()}
            loading={loading}
          />
        </View>

        <View className="mt-6 flex-row items-center justify-center gap-1 pb-4">
          <Text className="text-sm text-text-dim">Sudah punya akun?</Text>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="link"
            hitSlop={8}
            className="min-h-11 justify-center px-1"
          >
            <Text className="text-sm font-bold text-orange">Masuk</Text>
          </Pressable>
        </View>
      </AuthFormLayout>
    </View>
  );
}
