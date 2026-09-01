import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getSupabase, isSupabaseConfigured } from "../../services/supabase";
import { AuthFormLayout } from "../../components/ui/AuthFormLayout";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";
import { showToast } from "../../stores/toastStore";

export function ResetPasswordScreen() {
  const navigation = useNavigation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });
        if (updateError) throw updateError;
      } else if (!isSupabaseConfigured) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      showToast("Password berhasil diperbarui. Silakan masuk.", "success");
      navigation.navigate("Login" as never);
    } catch {
      setError("Gagal memperbarui password. Pastikan link reset masih berlaku.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <AuthFormLayout>
        <Text className="text-2xl font-extrabold tracking-tight text-text">
          Password Baru
        </Text>
        <Text className="mt-1 text-sm leading-5 text-text-dim">
          Masukkan password baru untuk akun Gaul FM kamu.
        </Text>

        <View className="mt-8 gap-4 rounded-card border border-line/60 bg-surface p-5">
          <TextInput
            label="Password Baru"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            label="Konfirmasi Password Baru"
            placeholder="••••••••"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={error}
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
          <Button
            title="Simpan Password Baru"
            onPress={() => void submit()}
            loading={loading}
          />
          <Pressable
            onPress={() => navigation.navigate("Login" as never)}
            accessibilityRole="link"
            hitSlop={8}
            className="min-h-11 items-center justify-center"
          >
            <Text className="text-sm font-semibold text-text-dim">
              Batal
            </Text>
          </Pressable>
        </View>
      </AuthFormLayout>
    </View>
  );
}
