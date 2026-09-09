import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "../services/supabase";
import { mockAnnouncers } from "../mocks/announcers";
import type { Announcer } from "../types";

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
    if (data && data.length > 0) return data as Announcer[];
    return mockAnnouncers;
  } catch (err) {
    console.warn("[useAnnouncers] Error fetching announcers, fallback to mock:", err);
    return mockAnnouncers;
  }
}

export function useAnnouncers() {
  return useQuery({
    queryKey: ["announcers"],
    queryFn: fetchAnnouncers,
    staleTime: 5 * 60 * 1000,
  });
}
