/**
 * Dummy live comments untuk siaran Gaul FM.
 * Nanti diganti realtime via Supabase Realtime / WebSocket.
 */

export interface LiveComment {
  id: string;
  user_name: string;
  avatar_seed: string; // seed untuk picsum/dicebear avatar
  message: string;
  created_at: string;
  is_highlighted?: boolean; // request lagu / sapaan dari penyiar
}

const NOW = Date.now();

export const mockComments: LiveComment[] = [
  {
    id: "c1",
    user_name: "Aditya_Smg",
    avatar_seed: "aditya",
    message: "Mantap pagi ini! Request dong Fifty Fifty - Cupid 🎵",
    created_at: new Date(NOW - 1 * 60_000).toISOString(),
    is_highlighted: true,
  },
  {
    id: "c2",
    user_name: "NadyaRatnasari",
    avatar_seed: "nadya",
    message: "Udah dengerin dari tadi pagi, suara Dita hari ini merdu banget hehe",
    created_at: new Date(NOW - 2 * 60_000).toISOString(),
  },
  {
    id: "c3",
    user_name: "BoyolaliFC",
    avatar_seed: "boyolali",
    message: "Salam dari Boyolali guys! dengerin sambil nge-gym 💪",
    created_at: new Date(NOW - 3 * 60_000).toISOString(),
  },
  {
    id: "c4",
    user_name: "reno_gaulFM",
    avatar_seed: "reno",
    message: "Yang request Dewa 19 sabar ya, next track! 😄",
    created_at: new Date(NOW - 4 * 60_000).toISOString(),
    is_highlighted: true,
  },
  {
    id: "c5",
    user_name: "SemarangKeren",
    avatar_seed: "smg",
    message: "Info macet di Tol Banyumanik parah banget pagi ini 🚗",
    created_at: new Date(NOW - 5 * 60_000).toISOString(),
  },
  {
    id: "c6",
    user_name: "Putri_Tembalang",
    avatar_seed: "putri",
    message: "Request Raisa - Kali Kedua dong kak 🙏",
    created_at: new Date(NOW - 6 * 60_000).toISOString(),
  },
  {
    id: "c7",
    user_name: "ArdiWibowo99",
    avatar_seed: "ardi",
    message: "Dengerin dari kantor di Simpang Lima, semangat kerja jadinya! 🏢",
    created_at: new Date(NOW - 7 * 60_000).toISOString(),
  },
  {
    id: "c8",
    user_name: "KopiBengiSMG",
    avatar_seed: "kopi",
    message: "Gaul FM terbaik! udah 5 tahun dengerin tiap pagi",
    created_at: new Date(NOW - 9 * 60_000).toISOString(),
  },
  {
    id: "c9",
    user_name: "YessiaMaulida",
    avatar_seed: "yessia",
    message: "Salam buat Reno dari pendengar setia Ungaran 👋",
    created_at: new Date(NOW - 11 * 60_000).toISOString(),
  },
  {
    id: "c10",
    user_name: "Mas_Joko_SMG",
    avatar_seed: "joko",
    message: "Request lagu jadul dong, Peterpan - Sahabat",
    created_at: new Date(NOW - 14 * 60_000).toISOString(),
  },
];
