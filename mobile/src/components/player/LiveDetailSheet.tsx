import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Keyboard,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { MotionPressable as Pressable } from "../ui/MotionPressable";
import { ProgramHosts } from "../schedule/ProgramHosts";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LiveComment, NowPlaying, Program } from "../../types";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { useAuthStore } from "../../stores/authStore";
import { usePlayerControls } from "../../hooks/usePlayerControls";
import { stopLive } from "../../services/audio/trackPlayerService";
import { useIcecastStats } from "../../hooks/useIcecastStats";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { useLiveComments } from "../../hooks/useLiveComments";
import { LiveBadge } from "./LiveBadge";
import { MediaMtxVisualPlayer } from "./MediaMtxVisualPlayer";
import { DAY_FULL_ID, formatDistanceToNow } from "../../utils/datetime";
import { getOfficialLiveHost } from "../../utils/announcer";
import { getProgramArtwork, getProgramInfo } from "../../utils/programAssets";
import { getAppBottomInset } from "../../utils/safeArea";

interface LiveDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  nowPlaying: NowPlaying;
  matchedProgram?: Program | null;
  /** Mulai stream otomatis saat sheet dibuka (jika belum playing/buffering). */
  autoPlayOnOpen?: boolean;
  /** Buka langsung dalam mode visual radio studio vMix */
  initialVisual?: boolean;
  /** Buka langsung dalam mode fullscreen live chat */
  initialChatFullscreen?: boolean;
}

const MAX_LEN = 200;

function initials(name: string | null | undefined): string {
  if (!name) return "GF";
  return name
    .split(/[\s_]+/) // split by space or underscore (for dummy names like "Gita_Semarang")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function CommentRow({
  item,
  isMe,
  isDark,
}: {
  item: LiveComment;
  isMe: boolean;
  isDark: boolean;
}) {
  const isHighlighted = item.is_highlighted;
  const isStudio = item.is_broadcaster;

  return (
    <View
      className={`mb-3 flex-row gap-2.5 ${
        isHighlighted
          ? "rounded-card bg-orange/10 border border-orange/30 p-2.5"
          : isStudio
          ? "rounded-card bg-brand/10 border border-brand/25 p-2.5"
          : isMe
          ? "rounded-card bg-surface-2/60 p-2"
          : "pr-4"
      }`}
    >
      <View
        className={`h-9 w-9 items-center justify-center overflow-hidden rounded-full border ${
          isStudio
            ? "bg-brand/30 border-brand"
            : isHighlighted
            ? "bg-orange/25 border-orange"
            : isMe
            ? "bg-brand/20 border-brand/40"
            : "bg-surface-2 border-line/40"
        }`}
      >
        <Text
          className={`text-[11px] font-extrabold ${
            isStudio
              ? "text-brand"
              : isHighlighted
              ? "text-orange"
              : isMe
              ? "text-brand"
              : "text-text"
          }`}
          style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
        >
          {initials(item.user_name)}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text
            className={`text-xs font-bold ${isMe ? "text-brand" : "text-text"}`}
            numberOfLines={1}
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            {item.user_name}
          </Text>
          {isStudio ? (
            <View className="rounded-full bg-brand/20 px-1.5 py-0.5">
              <Text
                className="text-[9px] font-bold uppercase tracking-wider text-brand"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Studio
              </Text>
            </View>
          ) : null}
          {isHighlighted ? (
            <View className="rounded-full bg-orange/20 px-1.5 py-0.5">
              <Text
                className="text-[9px] font-bold uppercase tracking-wider text-orange"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                On Air
              </Text>
            </View>
          ) : null}
          <Text
            className="text-[10px] text-text-dim"
            style={{ fontFamily: "PlusJakartaSans_500Medium" }}
          >
            {item.id.startsWith("temp-") ? "Mengirim..." : formatDistanceToNow(item.created_at)}
          </Text>
        </View>
        <Text
          className="mt-0.5 text-sm leading-5 text-text"
          style={{ fontFamily: "PlusJakartaSans_400Regular" }}
        >
          {item.message}
        </Text>
      </View>
    </View>
  );
}

/**
 * Full-screen live (YouTube-style).
 * Keyboard: pad bottom by measured keyboard height — no KeyboardAvoidingView
 * (KAV + Modal + Android resize double-shifts and covers the composer).
 */
export function LiveDetailSheet({
  visible,
  onClose,
  nowPlaying,
  matchedProgram,
  autoPlayOnOpen = false,
  initialVisual,
  initialChatFullscreen = false,
}: LiveDetailSheetProps) {
  const colors = useThemeStore((s) => s.colors);
  const glow = useThemeStore((s) => s.glow);
  const mode = useThemeStore((s) => s.mode);
  const insets = useSafeAreaInsets();
  const bottomInset = getAppBottomInset(insets);
  const keyboardHeight = useKeyboardInset();
  const status = usePlayerStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const { toggle, play, pause } = usePlayerControls();
  const { stats } = useIcecastStats();
  const reducedMotion = useReducedMotion();
  const chatList = useRef<FlatList<LiveComment>>(null);
  const nearBottom = useRef(true);
  const newestId = useRef<string | null>(null);
  const [newMessages, setNewMessages] = useState(false);

  const { comments, isLoading, isSending, error: sendError, offline, send: sendLiveCommentMessage } =
    useLiveComments(visible);
  const [draftMessage, setDraftMessage] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [programInfoOpen, setProgramInfoOpen] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const isVisualActive = usePlayerStore((s) => s.isVisualActive);
  const setIsVisualActive = usePlayerStore((s) => s.setIsVisualActive);
  const prevVisibleRef = useRef(visible);

  // Simpan play dan pause ke ref stabil agar pergantian callback tidak memicu re-eksekusi efek
  const playRef = useRef(play);
  playRef.current = play;
  const pauseRef = useRef(pause);
  pauseRef.current = pause;

  // Efek transisi saat modal DIBUKA (false -> true) atau DITUTUP / DIMINIMIZE (true -> false)
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    // 1. Modal BARU DIBUKA (false -> true)
    if (!wasVisible && visible) {
      setIsChatFullscreen(initialChatFullscreen);
      nearBottom.current = true;
      setNewMessages(false);
      if (initialVisual !== undefined) {
        setIsVisualActive(initialVisual);
      }
      const currentVisual =
        initialVisual !== undefined
          ? initialVisual
          : usePlayerStore.getState().isVisualActive;

      if (currentVisual) {
        void pauseRef.current();
        void stopLive();
      } else if (autoPlayOnOpen) {
        const current = usePlayerStore.getState().status;
        if (current !== "playing" && current !== "buffering") {
          void playRef.current();
        }
      }
    }

    // 2. Modal BARU DITUTUP / DIMINIMIZE (true -> false)
    if (wasVisible && !visible) {
      Keyboard.dismiss();
      setInputFocused(false);
      setProgramInfoOpen(false);
      setIsChatFullscreen(false);

      if (isVisualActive) {
        // Tetap simpan preferensi di playerStore agar saat dibuka kembali tetap visual,
        // dan putar siaran audio Icecast di MiniPlayer & latar belakang
        void playRef.current();
      }
    }
  }, [
    visible,
    initialVisual,
    initialChatFullscreen,
    autoPlayOnOpen,
    isVisualActive,
    setIsVisualActive,
  ]);

  const isPlaying = status === "playing";
  const isBuffering = status === "buffering";
  const isServerLive = stats.isLive || Boolean(matchedProgram);
  const streamHealthy = isServerLive && status !== "error";
  const isDark = mode === "dark";
  const canSend = draftMessage.trim().length > 0 && !isSending;
  const displayName = profile?.full_name?.trim() || "Kamu";
  const liveHost = getOfficialLiveHost(nowPlaying.current_host);
  const cover =
    matchedProgram?.cover_url ?? nowPlaying.current_cover_url ?? null;
  const title = matchedProgram?.name ?? nowPlaying.current_program;
  const programArtwork = getProgramArtwork(title, cover);
  const programMeta = getProgramInfo(title);
  const displayTitle = matchedProgram?.name || title || programMeta.name;
  const displayHost =
    liveHost || matchedProgram?.host || programMeta.host;
  const displayDays = matchedProgram
    ? (DAY_FULL_ID[matchedProgram.day_of_week] || "Hari Ini")
    : programMeta.days;
  const displaySchedule = matchedProgram
    ? `${matchedProgram.start_time} – ${matchedProgram.end_time} WIB`
    : programMeta.schedule;
  const displayDescription =
    matchedProgram?.description || programMeta.description;
  const host = displayHost || "87.8 FM Semarang";
  const keyboardOpen = keyboardHeight > 0;

  const bottomLift = keyboardHeight;

  const handleToggleVisual = useCallback(() => {
    if (!isVisualActive) {
      void pauseRef.current();
      void stopLive();
      setIsVisualActive(true);
    } else {
      setIsVisualActive(false);
      void playRef.current();
    }
  }, [isVisualActive, setIsVisualActive]);

  const sendComment = useCallback(async () => {
    const text = draftMessage.trim();
    if (!text || isSending) return;
    const sent = await sendLiveCommentMessage(text.slice(0, MAX_LEN), displayName, profile?.id ?? "me");
    if (sent) {
      setDraftMessage((current) => current.trim() === text ? "" : current);
      nearBottom.current = true;
      setNewMessages(false);
      chatList.current?.scrollToOffset({ offset: 0, animated: !reducedMotion });
    }
  }, [draftMessage, isSending, sendLiveCommentMessage, displayName, profile?.id, reducedMotion]);

  useEffect(() => {
    const id = comments[0]?.id ?? null;
    if (id && id !== newestId.current && newestId.current && !nearBottom.current) setNewMessages(true);
    if (!comments.length) setNewMessages(false);
    newestId.current = id;
  }, [comments]);

  const listenerLabel = useMemo(() => {
    if (!stats.isLive) return "—";
    return stats.listeners.toLocaleString("id-ID");
  }, [stats.isLive, stats.listeners]);

  const isMine = useCallback(
    (item: LiveComment) =>
      item.user_name === "Kamu" ||
      item.user_name === displayName ||
      item.avatar_seed === "me" ||
      item.avatar_seed === (profile?.id ?? ""),
    [displayName, profile?.id],
  );

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType={reducedMotion ? "none" : "slide"}
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <StatusBar
        barStyle={mode === "light" ? "dark-content" : "light-content"}
        backgroundColor="transparent"
        translucent
      />
      <View
        className="flex-1 bg-bg"
        style={{
          paddingTop: insets.top,
          // Lift whole sheet content above keyboard (iOS). Android resize handles it.
          paddingBottom: bottomLift,
        }}
      >
        {/* ── Visual Radio Player (persistent WebRTC/WHEP agar audio & video tidak terputus saat fullscreen chat) ── */}
        {isVisualActive ? (
          <View
            style={
              isChatFullscreen
                ? {
                    position: "absolute",
                    width: 1,
                    height: 1,
                    opacity: 0,
                    overflow: "hidden",
                  }
                : undefined
            }
            pointerEvents={isChatFullscreen ? "none" : "auto"}
            className={isChatFullscreen ? undefined : "w-full overflow-hidden bg-surface"}
          >
            <MediaMtxVisualPlayer onCloseVisual={handleToggleVisual} />
          </View>
        ) : null}

        {/* ── MODE 1: FULLSCREEN CHAT (Compact Header dengan Logo Program Kecil) ── */}
        {isChatFullscreen || keyboardOpen ? (
          <View className="flex-row items-center justify-between border-b border-line/30 bg-surface-2 px-3 py-2">
            <Pressable onPress={() => { Keyboard.dismiss(); onClose(); }} accessibilityRole="button" accessibilityLabel="Tutup live chat" className="mr-1 h-11 w-11 items-center justify-center"><Ionicons name="chevron-down" size={22} color={colors.text} /></Pressable>
            {/* Kiri: Logo Program Kecil + Judul Program Ringkas (Ketuk untuk lihat detail program & penyiar) */}
            <Pressable
              onPress={() => setProgramInfoOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Buka detail program dan penyiar"
              className="min-w-0 flex-1 flex-row items-center gap-2.5 active:opacity-75"
            >
              {/* Logo Program Kecil Resmi */}
              <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-brand/35 bg-surface-3 p-0.5">
                <Image
                  source={programArtwork}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="contain"
                  contentPosition="center"
                  transition={150}
                />
              </View>

              {/* Teks Judul & Status On Air */}
              <View className="min-w-0 flex-1">
                <Text
                  className="text-xs font-bold text-text"
                  numberOfLines={1}
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  {displayTitle}
                </Text>
                <View className="mt-0.5 flex-row items-center gap-1.5">
                  <View className="flex-row items-center gap-1">
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: colors.live,
                      }}
                    />
                    <Text
                      className="text-[9px] font-bold uppercase tracking-wider text-live"
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                    >
                      Live
                    </Text>
                  </View>
                  <Text className="text-[9px] text-text-dim">·</Text>
                  <Text
                    className="text-[10px] font-medium text-brand"
                    numberOfLines={1}
                    style={{ fontFamily: "PlusJakartaSans_500Medium" }}
                  >
                    {isVisualActive ? "Visual Studio" : host}
                  </Text>
                  <Ionicons name="information-circle" size={11} color={colors.textDim} />
                </View>
              </View>
            </Pressable>

            {/* Kanan: Mini Play/Stop + SATU-SATUNYA Tombol Kecilkan */}
            <View className="flex-row items-center gap-2 pl-2">
              <Pressable
                onPress={() => {
                  if (isVisualActive) {
                    handleToggleVisual();
                    return;
                  }
                  void toggle();
                }}
                disabled={isBuffering}
                accessibilityRole="button"
                accessibilityLabel={
                  isVisualActive
                    ? "Tutup visual radio, lanjutkan audio"
                    : isPlaying
                    ? "Stop siaran"
                    : "Putar siaran"
                }
                className={`h-11 w-11 items-center justify-center rounded-full active:opacity-90 ${
                  isVisualActive ? "bg-surface-3" : "bg-orange"
                }`}
                style={isVisualActive ? undefined : glow.orange}
              >
                {isBuffering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name={isVisualActive ? "videocam" : isPlaying ? "stop" : "play"}
                    size={15}
                    color={isVisualActive ? colors.brand : "#FFFFFF"}
                    style={{ marginLeft: !isVisualActive && !isPlaying ? 1.5 : 0 }}
                  />
                )}
              </Pressable>

              {/* Satu-satunya tombol Kecilkan di layar */}
              <Pressable
                onPress={() => { Keyboard.dismiss(); setIsChatFullscreen(false); }}
                accessibilityRole="button"
                accessibilityLabel="Kecilkan live chat"
                hitSlop={8}
                className="min-h-11 flex-row items-center gap-1 rounded-full bg-surface-3 px-2 py-1.5 border border-line/40 active:opacity-80"
              >
                <Ionicons name="contract-outline" size={14} color={colors.text} />
                <Text
                  className="text-[11px] font-semibold text-text"
                  style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                >
                  Siaran
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* ── MODE 2: SPLIT VIEW NORMAL (Top Chrome + Banner + Program Info) ── */
          <>
            {/* ── Top chrome ── */}
            <View className="flex-row items-center justify-between px-3 py-1">
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                hitSlop={10}
                className="min-h-11 min-w-11 items-center justify-center rounded-full bg-surface-2"
              >
                <Ionicons name="chevron-down" size={22} color={colors.text} />
              </Pressable>
              <Text
                className="text-[11px] font-bold uppercase tracking-widest text-text-dim"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Siaran live
              </Text>
              <View className="min-h-11 min-w-11" />
            </View>

            {/* ── Audio Banner Mode (jika visual tidak aktif) ── */}
            {!isVisualActive ? (
              <View className="w-full overflow-hidden bg-surface">
                {!keyboardOpen ? (
                  <View className="relative aspect-[16/9] w-full items-center justify-center overflow-hidden bg-surface-2">
                    <Image
                      source={programArtwork}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      contentPosition="center"
                      transition={200}
                    />
                    <View className="absolute left-2.5 top-2.5">
                      <LiveBadge active={streamHealthy} size="sm" />
                    </View>

                    {/* ── Visual Radio Toggle Button ── */}
                    <Pressable
                      onPress={handleToggleVisual}
                      accessibilityRole="button"
                      accessibilityLabel="Beralih ke Visual Radio"
                      className="absolute right-2.5 top-2.5 flex-row items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 active:opacity-85"
                    >
                      <Ionicons name="videocam" size={14} color={colors.onBrand} />
                      <Text
                        className="text-xs font-bold text-onbrand"
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        Visual Radio
                      </Text>
                    </Pressable>

                    <View className="absolute bottom-2.5 right-2.5 flex-row items-center gap-1 rounded-full bg-black/55 px-2 py-1">
                      <Ionicons
                        name={isVisualActive ? "eye" : "headset"}
                        size={12}
                        color="#FFFFFF"
                      />
                      <Text
                        className="text-[11px] font-bold text-white"
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        {listenerLabel}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {!keyboardOpen ? (
                  <View className="flex-row items-center gap-3 px-4 py-3">
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-base font-extrabold text-text"
                        numberOfLines={2}
                        style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                      >
                        {title}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-1">
                        <Ionicons name="mic" size={12} color={colors.brand} />
                        <Text
                          className="text-xs font-semibold text-brand"
                          numberOfLines={1}
                          style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                        >
                          {host}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => void toggle()}
                      disabled={isBuffering}
                      accessibilityRole="button"
                      accessibilityLabel={isPlaying ? "Stop siaran" : "Putar siaran"}
                      className="h-12 w-12 items-center justify-center rounded-full bg-orange active:opacity-90"
                      style={glow.orange}
                    >
                      {isBuffering ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons
                          name={isPlaying ? "stop" : "play"}
                          size={20}
                          color="#FFFFFF"
                          style={{ marginLeft: isPlaying ? 0 : 2 }}
                        />
                      )}
                    </Pressable>
                  </View>
                ) : null}

                {!keyboardOpen ? (
                  <View className="border-t border-line/30 px-4 py-2.5">
                    <Pressable
                      onPress={() => setProgramInfoOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Lihat detail program dan penyiar"
                      className="min-h-10 w-full flex-row items-center justify-center gap-1.5 rounded-md bg-surface-2 active:opacity-85"
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color={colors.brand}
                      />
                      <Text
                        className="text-xs font-bold text-brand"
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        Detail program & penyiar
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              /* ── Visual Info Bar (di bawah video visual radio saat mode normal) ── */
              <View className="w-full bg-surface">
                {!keyboardOpen ? (
                  <View className="flex-row items-center gap-3 px-4 py-3">
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-base font-extrabold text-text"
                        numberOfLines={2}
                        style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                      >
                        {title}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-1">
                        <Ionicons name="mic" size={12} color={colors.brand} />
                        <Text
                          className="text-xs font-semibold text-brand"
                          numberOfLines={1}
                          style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                        >
                          {host}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={handleToggleVisual}
                      accessibilityRole="button"
                      accessibilityLabel="Tutup visual radio, lanjutkan audio"
                      className="h-12 w-12 items-center justify-center rounded-full bg-surface-3 active:opacity-90"
                    >
                      <Ionicons name="close" size={20} color={colors.textDim} />
                    </Pressable>
                  </View>
                ) : null}

                {!keyboardOpen ? (
                  <View className="border-t border-line/30 px-4 py-2.5">
                    <Pressable
                      onPress={() => setProgramInfoOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Lihat detail program dan penyiar"
                      className="min-h-10 w-full flex-row items-center justify-center gap-1.5 rounded-md bg-surface-2 active:opacity-85"
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color={colors.brand}
                      />
                      <Text
                        className="text-xs font-bold text-brand"
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        Detail program & penyiar
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}
          </>
        )}

        {/* ── Chat Header & Fullscreen Toggle ── */}
        {isChatFullscreen || keyboardOpen ? (
          <View className="mt-2 mb-1 flex-row items-center justify-between px-4">
            <View className="flex-row items-center gap-2">
              <Text
                className="text-xs font-extrabold uppercase tracking-wider text-text"
                style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
              >
                Live Chat
              </Text>
              <View className="rounded-full bg-surface-2 px-2 py-0.5 border border-line/30">
                <Text
                  className="text-[10px] font-semibold text-text-dim"
                  style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                >
                  {comments.length} pesan
                </Text>
              </View>
            </View>
          </View>
        ) : !keyboardOpen ? (
          <View className="mt-3 mb-1 flex-row items-center justify-between px-4">
            <View className="flex-row items-center gap-2">
              <Text
                className="text-sm font-extrabold text-text"
                style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
              >
                Live chat
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-live/15 px-2 py-0.5">
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: colors.live,
                  }}
                />
                <Text
                  className="text-[10px] font-bold uppercase tracking-wider text-live"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Live
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2.5">
              <Text
                className="text-[11px] font-semibold text-text-dim"
                style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
              >
                {comments.length} pesan
              </Text>

              {/* Tombol Fullscreen Chat */}
              <Pressable
                onPress={() => setIsChatFullscreen(true)}
                accessibilityRole="button"
                accessibilityLabel="Buka layar penuh live chat"
                hitSlop={8}
                className="flex-row items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 active:opacity-75"
              >
                <Ionicons name="expand-outline" size={13} color={colors.brand} />
                <Text
                  className="text-[11px] font-bold text-brand"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Layar penuh
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="mt-2 mb-1 flex-row items-center justify-between px-4">
            <Text
              className="text-xs font-bold uppercase tracking-widest text-text-dim"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Live chat · {comments.length}
            </Text>

            {/* Tombol Fullscreen Chat saat Keyboard Terbuka */}
            <Pressable
              onPress={() => setIsChatFullscreen(true)}
              accessibilityRole="button"
              accessibilityLabel="Buka layar penuh live chat"
              hitSlop={8}
              className="flex-row items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 active:opacity-75"
            >
              <Ionicons name="expand-outline" size={12} color={colors.brand} />
              <Text
                className="text-[10px] font-bold text-brand"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Layar penuh
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── Chat list ── */}
        <FlatList
          ref={chatList}
          data={comments}
          maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 60 }}
          onScroll={(event) => { nearBottom.current = event.nativeEvent.contentOffset.y < 60; if (nearBottom.current) setNewMessages(false); }}
          scrollEventThrottle={32}
          keyExtractor={(item) => item.id}
          inverted={comments.length > 0}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexGrow: 1,
            justifyContent: comments.length === 0 ? "center" : undefined,
          }}
          ListEmptyComponent={
            <View className="items-center px-4 py-6">
              <Ionicons
                name="chatbubbles-outline"
                size={36}
                color={colors.textDim}
              />
              <Text
                className="mt-3 text-sm font-semibold text-text-dim"
                style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
              >
                {isLoading ? "Memuat obrolan..." : offline ? "Koneksi chat terputus" : "Sapa penyiar atau request lagu"}
              </Text>
              <Text className="mt-2 text-center text-xs leading-5 text-text-dim" style={{ fontFamily: "PlusJakartaSans_400Regular" }}>{offline ? "Mencoba menyambungkan kembali. Draf kamu tetap tersimpan." : "Tulis pesanmu di bawah untuk ikut ngobrol."}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CommentRow item={item} isMe={isMine(item)} isDark={isDark} />
          )}
        />

        {newMessages ? <Pressable onPress={() => { chatList.current?.scrollToOffset({ offset: 0, animated: !reducedMotion }); nearBottom.current = true; setNewMessages(false); }} accessibilityRole="button" className="mb-2 min-h-11 flex-row items-center justify-center gap-2 self-center rounded-full bg-brand px-4"><Ionicons name="arrow-down" size={16} color={colors.onBrand} /><Text style={{ color: colors.onBrand, fontFamily: "PlusJakartaSans_700Bold" }}>Pesan baru</Text></Pressable> : null}
        {sendError ? <Text accessibilityLiveRegion="polite" className="px-4 py-2 text-xs text-live">{sendError}</Text> : null}
        {offline && comments.length > 0 ? <Text accessibilityLiveRegion="polite" className="px-4 py-2 text-xs text-text-dim">Offline · Menunggu koneksi chat</Text> : null}
        {/* ── Composer — always above keyboard via parent paddingBottom ── */}
        <View
          className="border-t border-line/30 px-4 pt-2.5"
          style={{
            paddingBottom: keyboardOpen ? 8 : Math.max(bottomInset, 12),
          }}
        >
          <View
            className={`flex-row items-end gap-2 rounded-md border bg-surface-2 px-2.5 py-2 ${
              inputFocused ? "border-orange/70" : "border-line/50"
            }`}
          >
            <TextInput
              className="min-h-10 flex-1 text-sm text-text"
              placeholder="Tulis komentar atau request lagu…"
              placeholderTextColor={colors.textDim}
              value={draftMessage}
              onChangeText={setDraftMessage}
              onSubmitEditing={() => void sendComment()}
              accessibilityLabel="Pesan untuk penyiar"
              editable={!isSending}
              multiline
              submitBehavior="submit"
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              returnKeyType="send"
              maxLength={MAX_LEN}
              style={{
                maxHeight: 112,
                paddingVertical: Platform.OS === "ios" ? 8 : 4,
                fontFamily: "PlusJakartaSans_400Regular",
              }}
            />
            <Pressable
              onPress={() => void sendComment()}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Kirim komentar"
              className={`mb-0.5 h-11 w-11 items-center justify-center rounded-md ${
                canSend ? "bg-brand" : "bg-surface-3"
              }`}
              style={canSend ? undefined : { opacity: 0.55 }}
            >
              {isSending ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons
                name="send"
                size={15}
                color={canSend ? colors.onBrand : colors.textDim}
              />}
            </Pressable>
          </View>
          {inputFocused || draftMessage.length > 0 ? (
            <Text
              className="mt-1.5 text-right text-[10px] text-text-dim"
              style={{ fontFamily: "PlusJakartaSans_500Medium" }}
            >
              {draftMessage.length}/{MAX_LEN}
            </Text>
          ) : null}
        </View>

        {/* ── Program detail panel ── */}
        <Modal
          visible={programInfoOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setProgramInfoOpen(false)}
        >
          <View className="flex-1 justify-end bg-black/65">
            <Pressable
              className="absolute inset-0"
              onPress={() => setProgramInfoOpen(false)}
              accessibilityLabel="Tutup detail"
            />
            <View
              className="max-h-[80%] rounded-t-3xl bg-bg"
              style={{ paddingBottom: Math.max(bottomInset, 16) }}
            >
              <View className="items-center pt-2.5">
                <View className="h-1 w-10 rounded-full bg-line" />
              </View>
              <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
                <Text
                  className="text-[11px] font-bold uppercase tracking-widest text-text-dim"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Detail program
                </Text>
                <Pressable
                  onPress={() => setProgramInfoOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup"
                  hitSlop={10}
                  className="min-h-10 min-w-10 items-center justify-center rounded-full bg-surface-2"
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 12,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View className="flex-row gap-3">
                  <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-brand/30 bg-surface-2 p-1.5">
                    <Image
                      source={programArtwork}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="contain"
                      contentPosition="center"
                      transition={150}
                    />
                  </View>
                  <View className="min-w-0 flex-1 justify-center">
                    <Text
                      className="text-lg font-extrabold text-text"
                      numberOfLines={2}
                      style={{ fontFamily: "PlusJakartaSans_800ExtraBold" }}
                    >
                      {displayTitle}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1.5 self-start rounded-full bg-brand/12 px-2.5 py-1">
                      <Ionicons name="mic" size={12} color={colors.brand} />
                      <Text
                        className="text-xs font-semibold text-brand"
                        style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                      >
                        {displayHost}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Jam Siaran (Selalu muncul) */}
                <View className="mt-4 flex-row items-center gap-3 rounded-card bg-surface p-3.5 border border-line/20">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-orange/12">
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={colors.orange}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-[10px] font-bold uppercase tracking-widest text-text-dim"
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                    >
                      {displayDays} · Jam siaran
                    </Text>
                    <Text
                      className="mt-0.5 text-sm font-semibold text-text"
                      style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                    >
                      {displaySchedule}
                    </Text>
                  </View>
                </View>

                {/* Deskripsi Program (Selalu muncul) */}
                <View className="mt-3 rounded-card bg-surface p-4 border border-line/20">
                  <Text
                    className="text-[11px] font-bold uppercase tracking-widest text-text-dim"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    Tentang program
                  </Text>
                  <Text
                    className="mt-2 text-sm leading-6 text-text"
                    style={{ fontFamily: "PlusJakartaSans_400Regular" }}
                  >
                    {displayDescription}
                  </Text>
                </View>

                <ProgramHosts name={displayTitle} liveHost={nowPlaying.current_host} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}
