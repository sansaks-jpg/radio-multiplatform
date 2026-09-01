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
import { AuthFormLayout } from "../../components/ui/AuthFormLayout";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";

const EMAIL_RE = /\S+@\S+\.\S+/;

interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
}

function AmbientGlow() {
  return (
    <View pointerEvents="none" className="absolute inset-0">
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
  const signIn = useAuthStore((s) => s.signIn);

  const passwordRef = useRef<RNTextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: FormErrors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = "Format email tidak valid";
    if (password.length === 0) next.password = "Password wajib diisi";
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      const failure = await signIn(email.trim(), password);
      if (failure) setErrors({ form: failure });
    } catch {
      setErrors({ form: "Gagal masuk. Terjadi kesalahan jaringan." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <AmbientGlow />
      <AuthFormLayout>
        <View className="items-center">
          <BrandLogo size="lg" />
          <Text className="mt-1 text-sm font-medium text-text-dim">
            Dengerin Semarang, di mana aja.
          </Text>
        </View>

        <View className="mt-6 gap-4 rounded-card border border-line/60 bg-surface p-5">
          <Text className="text-center text-lg font-extrabold tracking-tight text-text">
            Masuk ke akun kamu
          </Text>

          <TextInput
            label="Email"
            icon="mail-outline"
            placeholder="nama@email.com"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <View>
            <TextInput
              ref={passwordRef}
              label="Password"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
            />
            <Pressable
              onPress={() => navigation.navigate("ForgotPassword")}
              accessibilityRole="link"
              hitSlop={8}
              className="mt-1 min-h-11 items-end justify-center"
            >
              <Text className="text-xs font-semibold text-orange">
                Lupa password?
              </Text>
            </Pressable>
          </View>

          {errors.form ? (
            <View className="flex-row items-center gap-2 rounded-2xl border border-live/40 bg-live/10 px-4 py-3">
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
            title="Masuk"
            variant="cta"
            onPress={() => void submit()}
            loading={loading}
          />
        </View>

        <View className="mt-8 flex-row items-center justify-center gap-1 pb-4">
          <Text className="text-sm text-text-dim">Belum punya akun?</Text>
          <Pressable
            onPress={() => navigation.navigate("Register")}
            accessibilityRole="link"
            hitSlop={8}
            className="min-h-11 justify-center px-1"
          >
            <Text className="text-sm font-bold text-brand">Daftar sekarang</Text>
          </Pressable>
        </View>
      </AuthFormLayout>
    </View>
  );
}
