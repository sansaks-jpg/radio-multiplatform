/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://idnxegollxhdcoexvndx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkbnhlZ29sbHhoZGNvZXh2bmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk3MDAxMSwiZXhwIjoyMTA0NTQ2MDExfQ.qC8U4-VV1VkUDaHziPLy4v04jS118cG1sQC0EWUXutk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const dummyMessages = [
  {
    user_name: "Aditya Pratama",
    avatar_seed: "adit",
    message: "Pagi Gaul Squad! Lagu barunya Bernadya udah masuk playlist belum min? ☕",
    minutes_ago: 28,
  },
  {
    user_name: "Salsa Tembalang",
    avatar_seed: "salsa",
    message: "Halo Kak Yoga & Sinta! Nemenin banget nih sambil ngerjain skripsi di cafe Undip 🎧",
    minutes_ago: 26,
  },
  {
    user_name: "Studio Gaul FM",
    avatar_seed: "studio",
    message: "Halo Gaulista Semarang! Selamat datang di live chat Gaul FM 87.8 MHz! Drop request lagu & salam kalian yaa 🔥",
    is_broadcaster: true,
    minutes_ago: 25,
  },
  {
    user_name: "Rizky Wibowo",
    avatar_seed: "rizky",
    message: "Semarang hari ini cerah pol ya guys, salam buat anak-anak Pleburan!",
    minutes_ago: 23,
  },
  {
    user_name: "Dinda Lestari",
    avatar_seed: "dinda",
    message: "Visual radionya jernih parah kak! Studionya estetik bgt ✨",
    minutes_ago: 21,
  },
  {
    user_name: "Kevin Anggara",
    avatar_seed: "kevin",
    message: "Titip salam buat anak arsitektur 21 yg lagi begadang di studio yaa min",
    minutes_ago: 20,
  },
  {
    user_name: "Putri Ayu",
    avatar_seed: "putri",
    message: "Min request lagunya Nadin Amizah - Rayuan Perempuan Gila dong, dedikasi buat temen-temen kosan Sukun Banyumanik ❤️",
    is_highlighted: true,
    minutes_ago: 18,
  },
  {
    user_name: "Bima Perkasa",
    avatar_seed: "bima",
    message: "Mantap audionya nendang bgt, dengerin sambil nyetir di Tol Krapyak lancar jaya 🚗💨",
    minutes_ago: 17,
  },
  {
    user_name: "Nayla Zahra",
    avatar_seed: "nayla",
    message: "Kak penyiarnya lucu bgt sih pembawaannya haha seru banget!",
    minutes_ago: 15,
  },
  {
    user_name: "Fajar Kurniawan",
    avatar_seed: "fajar",
    message: "Kaligawe agak padat merayap ya lur, hati-hati buat yang arah Genuk / Demak ⚠️",
    minutes_ago: 14,
  },
  {
    user_name: "Studio Gaul FM",
    avatar_seed: "studio",
    message: "Noted Putri Ayu! Rayuan Perempuan Gila masuk antrean lagu berikutnya yaa, stay tuned! 🎶",
    is_broadcaster: true,
    minutes_ago: 13,
  },
  {
    user_name: "Citra Kirana",
    avatar_seed: "citra",
    message: "Lagu ini asik bgt parah! Auto goyang di kantor wkwk 💃",
    minutes_ago: 12,
  },
  {
    user_name: "Dimas Setiawan",
    avatar_seed: "dimas",
    message: "Absen dari Simpang Lima min! Cuaca mendukung buat ngopi ☕",
    minutes_ago: 11,
  },
  {
    user_name: "Anisa Rahma",
    avatar_seed: "anisa",
    message: "Request single terbarunya Hindia dong min yang 'Berdansalah, Karir Ini Tak Ada Artinya' 🙌",
    minutes_ago: 10,
  },
  {
    user_name: "Gilang Ramadhan",
    avatar_seed: "gilang",
    message: "Suara penyiarnya renyah bgt, cocok buat teman kerja siang",
    minutes_ago: 9,
  },
  {
    user_name: "Mega Puspita",
    avatar_seed: "mega",
    message: "Min kapan ada bagi-bagi merchandise Gaul FM lagi nih? Mau kaosnya dongg 👕",
    minutes_ago: 8,
  },
  {
    user_name: "Aris Wijaya",
    avatar_seed: "aris",
    message: "Streaming webrtc-nya beneran low latency ya, chat langsung dibaca gak delay 👍",
    minutes_ago: 7,
  },
  {
    user_name: "Bella Safira",
    avatar_seed: "bella",
    message: "Keren banget ada visual radionya! Jadi bisa liat keseruan di studio langsung 😍",
    minutes_ago: 6,
  },
  {
    user_name: "Raka Pratama",
    avatar_seed: "raka",
    message: "Salam buat pejuang rupiah Semarang atas! Semangat terusss 💪",
    minutes_ago: 5.5,
  },
  {
    user_name: "Tiara Andini Fans",
    avatar_seed: "tiara",
    message: "Kak puterin lagu Taylor Swift - Cruel Summer dong biar makin melek kerjanya! 🎤",
    minutes_ago: 5,
  },
  {
    user_name: "Studio Gaul FM",
    avatar_seed: "studio",
    message: "Buat Mega dan Gaulista lainnya, pantengin terus ya! Sebentar lagi kita bakal spill giveaway tiket konser eksklusif! 🎁📻",
    is_broadcaster: true,
    minutes_ago: 4,
  },
  {
    user_name: "Hendra Saputra",
    avatar_seed: "hendra",
    message: "Wah giveaway tiket apa min?? Info dong buruan gasik! 🤩🔥",
    minutes_ago: 3.5,
  },
  {
    user_name: "Siti Nurhaliza",
    avatar_seed: "siti",
    message: "Halo Kak Attaya & Kak Ega! Salam dari kampus Unnes Sekaran 🍃",
    minutes_ago: 3,
  },
  {
    user_name: "Bagus Panji",
    avatar_seed: "bagus",
    message: "Playlist Gaul FM emang gak pernah gagal, hits anak muda banget! 💯",
    minutes_ago: 2.5,
  },
  {
    user_name: "Vina Pandu",
    avatar_seed: "vina",
    message: "Lagu ini vibes-nya sore santai banget di Kota Lama Semarang ✨",
    minutes_ago: 2,
  },
  {
    user_name: "Yoga Kurnia",
    avatar_seed: "yoga",
    message: "Weekend besok ada acara off-air Gaul FM di Simpang Lima gak min?",
    minutes_ago: 1.5,
  },
  {
    user_name: "Devi Maharani",
    avatar_seed: "devi",
    message: "Wajib dengerin Gaul FM tiap hari biar gak ketinggalan lagu hits 💖",
    minutes_ago: 1.2,
  },
  {
    user_name: "Rian Kusuma",
    avatar_seed: "rian",
    message: "Salam buat komunitas lari Semarang yang biasa CFD di Pahlawan! 🏃‍♂️",
    minutes_ago: 1,
  },
  {
    user_name: "Studio Gaul FM",
    avatar_seed: "studio",
    message: "Yuk yang mau request lagi langsung ketik aja di live chat, Gaul Squad siap puterin! 🚀",
    is_broadcaster: true,
    minutes_ago: 0.7,
  },
  {
    user_name: "Nadya Putri",
    avatar_seed: "nadya",
    message: "Kak request lagunya Juicy Luicy - Tampar dong, relate banget nih 😭💔",
    minutes_ago: 0.5,
  },
  {
    user_name: "Ilham Syahputra",
    avatar_seed: "ilham",
    message: "Asik banget lagunya nemenin lembur! Semangat buat semua pendengar setia 87.8!",
    minutes_ago: 0.3,
  },
  {
    user_name: "Farhan Alfarizi",
    avatar_seed: "farhan",
    message: "Visual radio Gaul FM juara, gambar tajam suara jernih gak ada obat 🔥👏",
    minutes_ago: 0.1,
  },
];

async function seed() {
  console.log("Menghapus live_comments lama...");
  const { error: delError } = await supabase
    .from('live_comments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (delError) {
    console.error("Gagal menghapus komentar lama:", delError);
  } else {
    console.log("Berhasil membersihkan komentar lama.");
  }

  console.log(`Menyiapkan ${dummyMessages.length} komentar dummy...`);
  const now = Date.now();
  const records = dummyMessages.map((m) => {
    const createdAtMs = now - Math.round(m.minutes_ago * 60 * 1000);
    return {
      user_name: m.user_name,
      avatar_seed: m.avatar_seed,
      message: m.message,
      is_broadcaster: Boolean(m.is_broadcaster),
      is_highlighted: Boolean(m.is_highlighted),
      is_hidden: false,
      created_at: new Date(createdAtMs).toISOString(),
    };
  });

  const { data, error: insertError } = await supabase
    .from('live_comments')
    .insert(records)
    .select();

  if (insertError) {
    console.error("Gagal memasukkan komentar:", insertError);
  } else {
    console.log(`Sukses memasukkan ${data.length} komentar ke Supabase live_comments!`);
  }
}

seed().catch(console.error);
