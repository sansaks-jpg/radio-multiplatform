import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useThemeStore } from "../../stores/themeStore";
import { getSupabase, isSupabaseConfigured } from "../../services/supabase";
import { AuthFormLayout } from "../../components/ui/AuthFormLayout";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";

const EMAIL_RE = /\S+@\S+\.\S+/;

export function ForgotPasswordScreen() {
  const colors = useThemeStore((s) => s.colors);
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError("Format email tidak valid");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: "gaulfm://reset-password" },
        );
        if (resetError) throw resetError;
      } else if (!isSupabaseConfigured) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      setSent(true);
    } catch {
      setError("Gagal mengirim link reset. Periksa koneksi kamu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <AuthFormLayout>
        <Text className="text-2xl font-extrabold tracking-tight text-text">
          Lupa Password
        </Text>
        <Text className="mt-1 text-sm leading-5 text-text-dim">
          Masukkan email akun kamu. Kami akan mengirim link untuk mengatur ulang
          password.
        </Text>

        {sent ? (
          <View className="mt-10 items-center rounded-card border border-line/60 bg-surface p-6">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-brand/10">
              <Ionicons
                name="mail-open-outline"
                size={40}
                color={colors.brand}
              />
            </View>
            <Text className="mt-4 text-center text-lg font-bold text-text">
              Cek inbox kamu
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-text-dim">
              Link reset password sudah dikirim ke {email.trim()}. Ikuti
              instruksinya lalu masuk kembali.
            </Text>
            <Button
              title="Kembali ke Masuk"
              onPress={() => navigation.goBack()}
              variant="secondary"
              className="mt-6 self-stretch"
            />
          </View>
        ) : (
          <View className="mt-8 gap-4 rounded-card border border-line/60 bg-surface p-5">
            <TextInput
              label="Email"
              placeholder="nama@email.com"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              error={error}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
            />
            <Button
              title="Kirim link reset"
              onPress={() => void submit()}
              loading={loading}
            />
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="link"
              hitSlop={8}
              className="min-h-11 items-center justify-center"
            >
              <Text className="text-sm font-semibold text-text-dim">
                Kembali ke Masuk
              </Text>
            </Pressable>
          </View>
        )}
      </AuthFormLayout>
    </View>
  );
}
