import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../components/ui/Screen";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { getSupabase, isSupabaseConfigured } from "../../services/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function EditProfileScreen() {
  const navigation = useNavigation();
  const colors = useThemeStore((s) => s.colors);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Gagal", "Nama lengkap tidak boleh kosong");
      return;
    }

    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Mode Demo
        const updatedProfile = { 
          ...profile!, 
          full_name: fullName.trim(), 
          whatsapp: whatsapp.trim() || null,
          city: city.trim() || null
        };
        setProfile(updatedProfile);
        
        // Simpan ke AsyncStorage
        const stored = await AsyncStorage.getItem("demo_auth");
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.profile = updatedProfile;
          await AsyncStorage.setItem("demo_auth", JSON.stringify(parsed));
        }
        
        navigation.goBack();
        return;
      }

      // Mode Supabase
      const supabase = getSupabase();
      if (!supabase || !profile) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          whatsapp_number: whatsapp.trim() || null,
          location_city: city.trim() || null,
        })
        .eq("id", profile.id);

      if (error) {
        throw new Error(error.message);
      }

      // Update state lokal
      setProfile({
        ...profile,
        full_name: fullName.trim(),
        whatsapp: whatsapp.trim() || null,
        city: city.trim() || null,
      });

      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Gagal menyimpan profil");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding>
      {/* Header */}
      <View className="mt-2 mb-6 flex-row items-center justify-between">
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text
          className="text-lg font-bold text-text"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          Edit Profil
        </Text>
        <View className="w-11" />
      </View>

      <View className="space-y-6">
        {/* Full Name */}
        <View>
          <Text
            className="mb-2 text-sm font-semibold text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
          >
            Nama Lengkap
          </Text>
          <View className="flex-row items-center rounded-xl bg-surface-2 px-4 h-14">
            <Ionicons name="person-outline" size={20} color={colors.textDim} />
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nama kamu"
              placeholderTextColor={colors.line}
              className="ml-3 flex-1 text-base text-text"
              style={{ fontFamily: "PlusJakartaSans_500Medium" }}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Email (Readonly) */}
        <View className="mt-5">
          <Text
            className="mb-2 text-sm font-semibold text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
          >
            Email (Tidak dapat diubah)
          </Text>
          <View className="flex-row items-center rounded-xl bg-surface px-4 h-14 opacity-50">
            <Ionicons name="mail-outline" size={20} color={colors.textDim} />
            <TextInput
              value={profile?.email || ""}
              editable={false}
              className="ml-3 flex-1 text-base text-text-dim"
              style={{ fontFamily: "PlusJakartaSans_500Medium" }}
            />
          </View>
        </View>

        {/* WhatsApp */}
        <View className="mt-5">
          <Text
            className="mb-2 text-sm font-semibold text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
          >
            WhatsApp (Opsional)
          </Text>
          <View className="flex-row items-center rounded-xl bg-surface-2 px-4 h-14">
            <Ionicons name="logo-whatsapp" size={20} color={colors.textDim} />
            <TextInput
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={colors.line}
              keyboardType="phone-pad"
              className="ml-3 flex-1 text-base text-text"
              style={{ fontFamily: "PlusJakartaSans_500Medium" }}
            />
          </View>
        </View>

        {/* City */}
        <View className="mt-5">
          <Text
            className="mb-2 text-sm font-semibold text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
          >
            Kota (Opsional)
          </Text>
          <View className="flex-row items-center rounded-xl bg-surface-2 px-4 h-14">
            <Ionicons name="location-outline" size={20} color={colors.textDim} />
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Semarang"
              placeholderTextColor={colors.line}
              className="ml-3 flex-1 text-base text-text"
              style={{ fontFamily: "PlusJakartaSans_500Medium" }}
            />
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={isLoading}
          className={`mt-10 h-[52px] items-center justify-center rounded-xl bg-brand shadow-sm shadow-brand/30 active:opacity-90 ${
            isLoading ? "opacity-70" : ""
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text
              className="text-[15px] font-extrabold text-onbrand"
              style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
            >
              Simpan Perubahan
            </Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}
