import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import {
  BottomTabBar,
  createBottomTabNavigator,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { dock } from "../theme/tokens";
import { useThemeStore } from "../stores/themeStore";
import type {
  MainTabParamList,
  NewsStackParamList,
  ProfileStackParamList,
  ScheduleStackParamList,
} from "../types";
import { MiniPlayer } from "../components/player/MiniPlayer";
import { LiveDetailSheet } from "../components/player/LiveDetailSheet";
import { usePlayerStore } from "../stores/playerStore";
import { usePrograms } from "../hooks/usePrograms";
import { todayDow, isOnAirNow } from "../utils/datetime";
import { HomeScreen } from "../screens/home/HomeScreen";
import { ScheduleScreen } from "../screens/schedule/ScheduleScreen";
import { ProgramDetailScreen } from "../screens/schedule/ProgramDetailScreen";
import { NewsFeedScreen } from "../screens/news/NewsFeedScreen";
import { NewsDetailScreen } from "../screens/news/NewsDetailScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { AppSettingsScreen } from "../screens/profile/AppSettingsScreen";
import { EditProfileScreen } from "../screens/profile/EditProfileScreen";
import { AboutScreen } from "../screens/profile/AboutScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();
const ScheduleStack = createNativeStackNavigator<ScheduleStackParamList>();
const NewsStack = createNativeStackNavigator<NewsStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

function ScheduleNavigator() {
  return (
    <ScheduleStack.Navigator screenOptions={{ headerShown: false }}>
      <ScheduleStack.Screen name="ScheduleList" component={ScheduleScreen} />
      <ScheduleStack.Screen
        name="ProgramDetail"
        component={ProgramDetailScreen}
        getId={({ params }) => params?.id}
      />
    </ScheduleStack.Navigator>
  );
}

function NewsNavigator() {
  return (
    <NewsStack.Navigator screenOptions={{ headerShown: false }}>
      <NewsStack.Screen name="NewsFeed" component={NewsFeedScreen} />
      <NewsStack.Screen
        name="NewsDetail"
        component={NewsDetailScreen}
        // Distinct route identity per article so params always refresh
        getId={({ params }) => params?.id}
      />
    </NewsStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStackNav.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStackNav.Screen name="AppSettings" component={AppSettingsScreen} />
      <ProfileStackNav.Screen name="About" component={AboutScreen} />
    </ProfileStackNav.Navigator>
  );
}

const TAB_ICONS: Record<
  keyof MainTabParamList,
  keyof typeof Ionicons.glyphMap
> = {
  Home: "radio",
  Schedule: "calendar",
  News: "newspaper",
  Profile: "person",
};

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Home: "Beranda",
  Schedule: "Jadwal",
  News: "Berita",
  Profile: "Profil",
};

/** Mini di atas tab bar; tab bar selalu full-width. */
function TabBarWithMiniPlayer(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const activeRouteName = props.state.routes[props.state.index]?.name;
  const bottomInset = Math.max(insets.bottom, Platform.OS === "web" ? 8 : 0);

  return (
    <View className="w-full bg-bg">
      <MiniPlayer
        activeRouteName={activeRouteName}
        navigation={props.navigation}
      />

      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.line,
          backgroundColor: colors.surface2,
          paddingBottom: bottomInset,
        }}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            tint={mode === "light" ? "light" : "dark"}
            intensity={mode === "light" ? 60 : 80}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <BottomTabBar
          {...props}
          style={{
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            height: dock.tabBarHeight,
            paddingBottom: 0,
            paddingTop: 4,
          }}
        />
      </View>
    </View>
  );
}

export function MainTabs() {
  const colors = useThemeStore((s) => s.colors);
  const liveSheetOpen = usePlayerStore((s) => s.liveSheetOpen);
  const closeLiveSheet = usePlayerStore((s) => s.closeLiveSheet);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const todayPrograms = usePrograms(todayDow());
  const onAir = todayPrograms.data?.find((p) => isOnAirNow(p)) ?? null;

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <TabBarWithMiniPlayer {...props} />}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textDim,
          tabBarShowLabel: true,
          tabBarHideOnKeyboard: true,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
          },
          tabBarStyle: {
            backgroundColor: colors.surface2,
            borderTopWidth: 0,
            elevation: 0,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={TAB_ICONS[route.name]}
              size={22}
              color={color}
              accessibilityLabel={
                focused
                  ? `${TAB_LABELS[route.name]} aktif`
                  : TAB_LABELS[route.name]
              }
            />
          ),
          tabBarLabel: TAB_LABELS[route.name],
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen
          name="Schedule"
          component={ScheduleNavigator}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              const state = navigation.getState();
              const schedRoute = state.routes.find((r) => r.name === "Schedule");
              const nested = schedRoute?.state as
                | { index?: number; routes?: { name: string }[] }
                | undefined;
              if (!nested?.routes?.length) return;
              const active = nested.routes[nested.index ?? 0]?.name;
              if (active && active !== "ScheduleList") {
                e.preventDefault();
                navigation.navigate("Schedule", {
                  screen: "ScheduleList",
                });
              }
            },
          })}
        />
        <Tab.Screen
          name="News"
          component={NewsNavigator}
          listeners={({ navigation }) => ({
            // Tapping the News tab always lands on the feed — never a stale detail
            // (including when Home left only NewsDetail in the nested stack).
            tabPress: (e) => {
              const state = navigation.getState();
              const newsRoute = state.routes.find((r) => r.name === "News");
              const nested = newsRoute?.state as
                | { index?: number; routes?: { name: string }[] }
                | undefined;
              if (!nested?.routes?.length) return;
              const active = nested.routes[nested.index ?? 0]?.name;
              if (active && active !== "NewsFeed") {
                e.preventDefault();
                navigation.navigate("News", {
                  screen: "NewsFeed",
                });
              }
            },
          })}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileNavigator}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              const state = navigation.getState();
              const profRoute = state.routes.find((r) => r.name === "Profile");
              const nested = profRoute?.state as
                | { index?: number; routes?: { name: string }[] }
                | undefined;
              if (!nested?.routes?.length) return;
              const active = nested.routes[nested.index ?? 0]?.name;
              if (active && active !== "ProfileHome") {
                e.preventDefault();
                navigation.navigate("Profile", {
                  screen: "ProfileHome",
                });
              }
            },
          })}
        />
      </Tab.Navigator>

      <LiveDetailSheet
        visible={liveSheetOpen}
        onClose={closeLiveSheet}
        nowPlaying={nowPlaying}
        matchedProgram={onAir}
      />
    </>
  );
}
