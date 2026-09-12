import { EventEmitter } from "events";
import { supabase, isSupabaseConfigured } from "./supabase";
import { getActiveCommentSession, getServerPrograms } from "./radio-bus";

export interface LiveComment {
  id: string;
  user_name: string;
  avatar_seed?: string | null;
  message: string;
  is_highlighted: boolean;
  is_hidden: boolean;
  is_broadcaster: boolean;
  created_at: string;
}

export interface CommentBusEvent {
  type: "new" | "update" | "delete" | "reset";
  comment?: LiveComment;
  session_start?: string | null;
  program_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

// Global in-memory cache and event emitter across hot-reloads in Next.js Node runtime
declare global {
  var __gaulfm_comments_bus: EventEmitter | undefined;
  var __gaulfm_comments_store: LiveComment[] | undefined;
  var __gaulfm_last_session_iso: string | null | undefined;
  var __gaulfm_session_timer: NodeJS.Timeout | undefined;
}

const bus = global.__gaulfm_comments_bus ?? new EventEmitter();
bus.setMaxListeners(1000);
if (!global.__gaulfm_comments_bus) {
  global.__gaulfm_comments_bus = bus;
}

function createInitialComments(): LiveComment[] {
  const now = Date.now();
  const rawList = [
    {
      id: "c-init-1",
      user_name: "Aditya Pratama",
      avatar_seed: "adit",
      message: "Pagi Gaul Squad! Lagu barunya Bernadya udah masuk playlist belum min? ☕",
      minutes_ago: 28,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-2",
      user_name: "Salsa Tembalang",
      avatar_seed: "salsa",
      message: "Halo Kak Yoga & Sinta! Nemenin banget nih sambil ngerjain skripsi di cafe Undip 🎧",
      minutes_ago: 26,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-3",
      user_name: "Studio Gaul FM",
      avatar_seed: "studio",
      message: "Halo Gaulista Semarang! Selamat datang di live chat Gaul FM 87.8 MHz! Drop request lagu & salam kalian yaa 🔥",
      minutes_ago: 25,
      is_broadcaster: true,
      is_highlighted: false,
    },
    {
      id: "c-init-4",
      user_name: "Rizky Wibowo",
      avatar_seed: "rizky",
      message: "Semarang hari ini cerah pol ya guys, salam buat anak-anak Pleburan!",
      minutes_ago: 23,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-5",
      user_name: "Dinda Lestari",
      avatar_seed: "dinda",
      message: "Visual radionya jernih parah kak! Studionya estetik bgt ✨",
      minutes_ago: 21,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-6",
      user_name: "Kevin Anggara",
      avatar_seed: "kevin",
      message: "Titip salam buat anak arsitektur 21 yg lagi begadang di studio yaa min",
      minutes_ago: 20,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-7",
      user_name: "Putri Ayu",
      avatar_seed: "putri",
      message: "Min request lagunya Nadin Amizah - Rayuan Perempuan Gila dong, dedikasi buat temen-temen kosan Sukun Banyumanik ❤️",
      minutes_ago: 18,
      is_broadcaster: false,
      is_highlighted: true,
    },
    {
      id: "c-init-8",
      user_name: "Bima Perkasa",
      avatar_seed: "bima",
      message: "Mantap audionya nendang bgt, dengerin sambil nyetir di Tol Krapyak lancar jaya 🚗💨",
      minutes_ago: 17,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-9",
      user_name: "Nayla Zahra",
      avatar_seed: "nayla",
      message: "Kak penyiarnya lucu bgt sih pembawaannya haha seru banget!",
      minutes_ago: 15,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-10",
      user_name: "Fajar Kurniawan",
      avatar_seed: "fajar",
      message: "Kaligawe agak padat merayap ya lur, hati-hati buat yang arah Genuk / Demak ⚠️",
      minutes_ago: 14,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-11",
      user_name: "Studio Gaul FM",
      avatar_seed: "studio",
      message: "Noted Putri Ayu! Rayuan Perempuan Gila masuk antrean lagu berikutnya yaa, stay tuned! 🎶",
      minutes_ago: 13,
      is_broadcaster: true,
      is_highlighted: false,
    },
    {
      id: "c-init-12",
      user_name: "Citra Kirana",
      avatar_seed: "citra",
      message: "Lagu ini asik bgt parah! Auto goyang di kantor wkwk 💃",
      minutes_ago: 12,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-13",
      user_name: "Dimas Setiawan",
      avatar_seed: "dimas",
      message: "Absen dari Simpang Lima min! Cuaca mendukung buat ngopi ☕",
      minutes_ago: 11,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-14",
      user_name: "Anisa Rahma",
      avatar_seed: "anisa",
      message: "Request single terbarunya Hindia dong min yang 'Berdansalah, Karir Ini Tak Ada Artinya' 🙌",
      minutes_ago: 10,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-15",
      user_name: "Gilang Ramadhan",
      avatar_seed: "gilang",
      message: "Suara penyiarnya renyah bgt, cocok buat teman kerja siang",
      minutes_ago: 9,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-16",
      user_name: "Mega Puspita",
      avatar_seed: "mega",
      message: "Min kapan ada bagi-bagi merchandise Gaul FM lagi nih? Mau kaosnya dongg 👕",
      minutes_ago: 8,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-17",
      user_name: "Aris Wijaya",
      avatar_seed: "aris",
      message: "Streaming webrtc-nya beneran low latency ya, chat langsung dibaca gak delay 👍",
      minutes_ago: 7,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-18",
      user_name: "Bella Safira",
      avatar_seed: "bella",
      message: "Keren banget ada visual radionya! Jadi bisa liat keseruan di studio langsung 😍",
      minutes_ago: 6,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-19",
      user_name: "Raka Pratama",
      avatar_seed: "raka",
      message: "Salam buat pejuang rupiah Semarang atas! Semangat terusss 💪",
      minutes_ago: 5.5,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-20",
      user_name: "Tiara Andini Fans",
      avatar_seed: "tiara",
      message: "Kak puterin lagu Taylor Swift - Cruel Summer dong biar makin melek kerjanya! 🎤",
      minutes_ago: 5,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-21",
      user_name: "Studio Gaul FM",
      avatar_seed: "studio",
      message: "Buat Mega dan Gaulista lainnya, pantengin terus ya! Sebentar lagi kita bakal spill giveaway tiket konser eksklusif! 🎁📻",
      minutes_ago: 4,
      is_broadcaster: true,
      is_highlighted: false,
    },
    {
      id: "c-init-22",
      user_name: "Hendra Saputra",
      avatar_seed: "hendra",
      message: "Wah giveaway tiket apa min?? Info dong buruan gasik! 🤩🔥",
      minutes_ago: 3.5,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-23",
      user_name: "Siti Nurhaliza",
      avatar_seed: "siti",
      message: "Halo Kak Attaya & Kak Ega! Salam dari kampus Unnes Sekaran 🍃",
      minutes_ago: 3,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-24",
      user_name: "Bagus Panji",
      avatar_seed: "bagus",
      message: "Playlist Gaul FM emang gak pernah gagal, hits anak muda banget! 💯",
      minutes_ago: 2.5,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-25",
      user_name: "Vina Pandu",
      avatar_seed: "vina",
      message: "Lagu ini vibes-nya sore santai banget di Kota Lama Semarang ✨",
      minutes_ago: 2,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-26",
      user_name: "Yoga Kurnia",
      avatar_seed: "yoga",
      message: "Weekend besok ada acara off-air Gaul FM di Simpang Lima gak min?",
      minutes_ago: 1.5,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-27",
      user_name: "Devi Maharani",
      avatar_seed: "devi",
      message: "Wajib dengerin Gaul FM tiap hari biar gak ketinggalan lagu hits 💖",
      minutes_ago: 1.2,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-28",
      user_name: "Rian Kusuma",
      avatar_seed: "rian",
      message: "Salam buat komunitas lari Semarang yang biasa CFD di Pahlawan! 🏃‍♂️",
      minutes_ago: 1,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-29",
      user_name: "Studio Gaul FM",
      avatar_seed: "studio",
      message: "Yuk yang mau request lagi langsung ketik aja di live chat, Gaul Squad siap puterin! 🚀",
      minutes_ago: 0.7,
      is_broadcaster: true,
      is_highlighted: false,
    },
    {
      id: "c-init-30",
      user_name: "Nadya Putri",
      avatar_seed: "nadya",
      message: "Kak request lagunya Juicy Luicy - Tampar dong, relate banget nih 😭💔",
      minutes_ago: 0.5,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-31",
      user_name: "Ilham Syahputra",
      avatar_seed: "ilham",
      message: "Asik banget lagunya nemenin lembur! Semangat buat semua pendengar setia 87.8!",
      minutes_ago: 0.3,
      is_broadcaster: false,
      is_highlighted: false,
    },
    {
      id: "c-init-32",
      user_name: "Farhan Alfarizi",
      avatar_seed: "farhan",
      message: "Visual radio Gaul FM juara, gambar tajam suara jernih gak ada obat 🔥👏",
      minutes_ago: 0.1,
      is_broadcaster: false,
      is_highlighted: false,
    },
  ];

  return rawList.map((c) => ({
    id: c.id,
    user_name: c.user_name,
    avatar_seed: c.avatar_seed,
    message: c.message,
    is_broadcaster: c.is_broadcaster,
    is_highlighted: c.is_highlighted,
    is_hidden: false,
    created_at: new Date(now - Math.round(c.minutes_ago * 60 * 1000)).toISOString(),
  }));
}

const memoryStore: LiveComment[] = global.__gaulfm_comments_store ?? createInitialComments();
global.__gaulfm_comments_store = memoryStore;

const MAX_HISTORY_COMMENTS = 50;

/**
 * Memeriksa batas program siaran dan membersihkan komentar lama secara otomatis.
 *
 * Aturan:
 * 1. Jika hari ini tidak ada program sama sekali -> komentar tidak dihapus.
 * 2. Jika hari ini ada program siaran:
 *    - Komentar Program A tetap ada dari awal siaran sampai detik sebelum Program B mulai.
 *    - Tepat saat Program B dimulai, komentar sebelum jam mulai Program B dihapus otomatis.
 *    - Event "reset" dipancarkan via bus untuk mengosongkan riwayat di sisi client.
 */
export async function checkAndPruneCommentSession(now: Date = new Date()): Promise<{
  prunedCount: number;
  sessionStartIso: string | null;
  programName: string | null;
}> {
  const programs = await getServerPrograms();
  const session = getActiveCommentSession(programs, now);

  if (!session.sessionStart || !session.sessionStartIso) {
    // Tidak ada batas waktu program hari ini (hari tanpa jadwal/sebelum jadwal pertama)
    return {
      prunedCount: 0,
      sessionStartIso: null,
      programName: null,
    };
  }

  const sessionStartMs = session.sessionStart.getTime();
  const isNewSession = global.__gaulfm_last_session_iso !== session.sessionStartIso;

  const initialLength = memoryStore.length;
  const retained = memoryStore.filter((c) => {
    const commentTime = new Date(c.created_at).getTime();
    return commentTime >= sessionStartMs;
  });

  const prunedCount = initialLength - retained.length;

  if (prunedCount > 0 || isNewSession) {
    memoryStore.length = 0;
    memoryStore.push(...retained);
    global.__gaulfm_last_session_iso = session.sessionStartIso;

    // Bersihkan dari Supabase agar kuota storage free-tier tetap terjaga
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from("live_comments")
          .delete()
          .lt("created_at", session.sessionStart.toISOString());
      } catch {
        // Safe fail
      }
    }

    // Pancarkan event reset ke seluruh listener SSE / Web / Mobile
    bus.emit("comment", {
      type: "reset",
      session_start: session.sessionStartIso,
      program_name: session.programName,
      start_time: session.startTime,
      end_time: session.endTime,
    });
  }

  return {
    prunedCount,
    sessionStartIso: session.sessionStartIso,
    programName: session.programName,
  };
}

export async function getRecentComments(limit = MAX_HISTORY_COMMENTS): Promise<LiveComment[]> {
  const safeLimit = Math.min(Math.max(1, limit), MAX_HISTORY_COMMENTS);
  const { sessionStartIso } = await checkAndPruneCommentSession();

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from("live_comments")
        .select("*")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(safeLimit);

      if (sessionStartIso) {
        query = query.gte("created_at", sessionStartIso);
      }

      const { data, error } = await query;
      if (!error && data) {
        return (data as LiveComment[]).reverse();
      }
    } catch {
      // Fallback to memoryStore on network error
    }
  }

  return memoryStore
    .filter((c) => !c.is_hidden && (!sessionStartIso || c.created_at >= sessionStartIso))
    .slice(-safeLimit);
}

export async function getAllCommentsForAdmin(limit = MAX_HISTORY_COMMENTS): Promise<LiveComment[]> {
  const safeLimit = Math.min(Math.max(1, limit), MAX_HISTORY_COMMENTS);
  const { sessionStartIso } = await checkAndPruneCommentSession();

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from("live_comments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(safeLimit);

      if (sessionStartIso) {
        query = query.gte("created_at", sessionStartIso);
      }

      const { data, error } = await query;
      if (!error && data) {
        return (data as LiveComment[]).reverse();
      }
    } catch {
      // Fallback
    }
  }

  return memoryStore
    .filter((c) => !sessionStartIso || c.created_at >= sessionStartIso)
    .slice(-safeLimit);
}

export async function addComment(payload: {
  user_name: string;
  message: string;
  avatar_seed?: string | null;
  is_broadcaster?: boolean;
}): Promise<LiveComment> {
  await checkAndPruneCommentSession();

  const newComment: LiveComment = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_name: payload.user_name.trim().slice(0, 50),
    avatar_seed: payload.avatar_seed ?? payload.user_name.slice(0, 4),
    message: payload.message.trim().slice(0, 300),
    is_highlighted: false,
    is_hidden: false,
    is_broadcaster: Boolean(payload.is_broadcaster),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("live_comments")
        .insert({
          user_name: newComment.user_name,
          avatar_seed: newComment.avatar_seed,
          message: newComment.message,
          is_broadcaster: newComment.is_broadcaster,
          is_highlighted: false,
          is_hidden: false,
        })
        .select()
        .single();

      if (!error && data) {
        newComment.id = data.id;
      }
    } catch {
      // Keep memory version
    }
  }

  memoryStore.push(newComment);
  if (memoryStore.length > MAX_HISTORY_COMMENTS) {
    memoryStore.shift();
  }

  bus.emit("comment", { type: "new", comment: newComment });
  return newComment;
}

export async function toggleHighlight(id: string): Promise<LiveComment | null> {
  let target = memoryStore.find((c) => c.id === id);
  if (target) {
    target.is_highlighted = !target.is_highlighted;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from("live_comments")
        .select("is_highlighted")
        .eq("id", id)
        .single();
      if (data) {
        const nextVal = !data.is_highlighted;
        const { data: updated } = await supabase
          .from("live_comments")
          .update({ is_highlighted: nextVal })
          .eq("id", id)
          .select()
          .single();
        if (updated) target = updated as LiveComment;
      }
    } catch {
      // Fallback to memory
    }
  }

  if (target) {
    bus.emit("comment", { type: "update", comment: target });
  }
  return target ?? null;
}

export async function toggleHidden(id: string): Promise<LiveComment | null> {
  let target = memoryStore.find((c) => c.id === id);
  if (target) {
    target.is_hidden = !target.is_hidden;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from("live_comments")
        .select("is_hidden")
        .eq("id", id)
        .single();
      if (data) {
        const nextVal = !data.is_hidden;
        const { data: updated } = await supabase
          .from("live_comments")
          .update({ is_hidden: nextVal })
          .eq("id", id)
          .select()
          .single();
        if (updated) target = updated as LiveComment;
      }
    } catch {
      // Fallback
    }
  }

  if (target) {
    bus.emit("comment", {
      type: target.is_hidden ? "delete" : "update",
      comment: target,
    });
  }
  return target ?? null;
}

export function subscribeComments(
  listener: (event: CommentBusEvent) => void
): () => void {
  bus.on("comment", listener);
  return () => {
    bus.off("comment", listener);
  };
}

// Background periodic session checker in Node runtime
if (typeof setInterval !== "undefined" && !global.__gaulfm_session_timer) {
  global.__gaulfm_session_timer = setInterval(() => {
    void checkAndPruneCommentSession();
  }, 30_000);
}
