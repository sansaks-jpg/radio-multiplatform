import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "../services/supabase";
import { mockAnnouncers } from "../mocks/announcers";
import type { Announcer } from "../types";

function parseMobileAnnouncer(item: any): Announcer {
  let programs: string[] = [];
  let bio = item.bio || "";

  if (Array.isArray(item.programs)) {
    programs = item.programs;
  } else if (bio && typeof bio === "string" && bio.includes("<!--programs:")) {
    const match = bio.match(/<!--programs:(.*?)-->/);
    if (match && match[1]) {
      try {
        programs = JSON.parse(match[1]);
      } catch {
        programs = match[1].split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      bio = bio.replace(/<!--programs:.*?-->/, "").trim();
    }
  }

  // Fallback program dari mockAnnouncers jika belum terekam di remote
  if (programs.length === 0) {
    const matched = mockAnnouncers.find(
      (m) => m.name.toLowerCase() === (item.name || "").toLowerCase()
    );
    if (matched?.programs) {
      programs = matched.programs;
    }
  }

  let photoUrl = item.photo_url || "";
  if (
    photoUrl &&
    photoUrl.includes("/storage/v1/object/public/penyiar/") &&
    !photoUrl.includes("?")
  ) {
    photoUrl = `${photoUrl}?v=1789192301137`;
  }

  return {
    id: item.id,
    name: item.name,
    nickname: item.nickname ?? null,
    photo_url: photoUrl,
    bio: bio || null,
    instagram: item.instagram ?? null,
    is_active: item.is_active ?? true,
    sort_order: item.sort_order ?? 0,
    programs,
  };
}

async function fetchAnnouncers(): Promise<Announcer[]> {
  const supabase = getSupabase();
  if (!supabase) return mockAnnouncers;
  try {
    const { data, error } = await supabase
      .from("announcers")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    if (data && data.length > 0) return data.map(parseMobileAnnouncer);
    return mockAnnouncers;
  } catch (err) {
    console.warn("[useAnnouncers] Error fetching announcers, fallback to mock:", err);
    return mockAnnouncers;
  }
}

export function useAnnouncers() {
  const queryClient = useQueryClient();

  // Supabase Realtime: dengarkan perubahan tabel announcers dari panel admin secara langsung
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured) return;

    const channel = supabase
      .channel("announcers_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcers",
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["announcers"] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["announcers"],
    queryFn: fetchAnnouncers,
    staleTime: 10 * 1000,
    refetchOnMount: "always",
  });
}

