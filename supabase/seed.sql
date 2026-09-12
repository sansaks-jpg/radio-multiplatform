-- =============================================================================
-- Gaul FM Semarang — Initial Seed Data
-- File: supabase/seed.sql
-- Description: Official schedule and banners synchronized with Admin Panel & Mobile App.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Seed: now_playing
-- -----------------------------------------------------------------------------
DELETE FROM public.now_playing;
INSERT INTO public.now_playing (id, current_program, current_host, current_cover_url, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Gaul Waktu Setempat',
    'Yoga & Sinta',
    '/programs/gaul-waktu-setempat.png',
    NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Seed: programs (Official Schedule from Admin & Poster: Senin–Jumat)
-- -----------------------------------------------------------------------------
DELETE FROM public.programs;

-- Senin s/d Jumat (day_of_week: 1 to 5)
-- Di luar jam siaran program ini dan akhir pekan, Gaul FM memutarkan musik hits nonstop 24 jam.
INSERT INTO public.programs (id, name, host, day_of_week, start_time, end_time, cover_url, description)
SELECT 
    'p-' || d || '-' || slot.id,
    slot.name,
    slot.host,
    d::smallint,
    slot.start_time,
    slot.end_time,
    slot.cover_url,
    slot.description
FROM generate_series(1, 5) AS d
CROSS JOIN (
    VALUES 
        (1, 'Gaul Morning Show', 'Reno & Dita', '07:00', '10:00', '/programs/gaul-morning-show.png', 'Mulai pagi dengan hits terbaru, info lalu lintas Semarang, dan obrolan seru bareng Reno & Dita.'),
        (2, 'Gaul Waktu Setempat', 'Yoga & Sinta', '15:00', '18:00', '/programs/gaul-waktu-setempat.png', 'Nemenin sore pulang: musik hits, obrolan santai, dan update waktu setempat di 87.8 MHz.'),
        (3, 'Asupan Gaul', 'Raka', '19:00', '22:00', '/programs/asupan-gaul.png', 'Asupan musik gaul malam hari di 87.8 FM: playlist pilihan, curhat, dan obrolan hangat anak muda.')
) AS slot(id, name, host, start_time, end_time, cover_url, description);

-- -----------------------------------------------------------------------------
-- 3. Seed: news
-- -----------------------------------------------------------------------------
DELETE FROM public.news;
INSERT INTO public.news (id, wp_post_id, title, content, image_url, category, published_at, synced_at)
VALUES 
    ('news-1', 101, 'Festival Musik Kota Lama Semarang Siap Digelar Akhir Pekan Ini', '<p>Festival musik tahunan Kota Lama Semarang kembali menyapa penikmat musik dengan deretan musisi nasional dan lokal.</p>', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg', 'Event', NOW() - INTERVAL '2 hours', NOW()),
    ('news-2', 102, 'Band Indie Asal Semarang Rilis Single Terbaru Bernuansa Citypop', '<p>Musisi lokal Semarang terus berinovasi menembus industri musik tanah air lewat single terbarunya yang mengangkat kisah cinta urban.</p>', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-12.28.41.jpeg', 'Musik', NOW() - INTERVAL '5 hours', NOW()),
    ('news-3', 103, 'Gaul FM Buka Audisi Penyiar Muda Semarang 2026', '<p>Kamu punya suara khas dan suka ngobrol seru? Ini saatnya gabung jadi bagian dari keluarga besar Radio Gaul 87.8 FM.</p>', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg', 'Station', NOW() - INTERVAL '1 day', NOW()),
    ('news-4', 104, 'Rekomendasi Spot Kuliner Malam Hits Sekitar Simpang Lima', '<p>Menikmati malam di Semarang tak lengkap tanpa mencicipi aneka kuliner legendaris dan kafe kekinian di pusat kota.</p>', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-21-at-11.28.17.jpeg', 'Lifestyle', NOW() - INTERVAL '2 days', NOW());

-- -----------------------------------------------------------------------------
-- 4. Seed: banners (Active Carousel Banners hosted on Supabase Storage CDN)
-- -----------------------------------------------------------------------------
DELETE FROM public.banners;
INSERT INTO public.banners (id, title, subtitle, image_url, cta_label, link_to, link_url, type, sort_order, is_active)
VALUES 
    ('b-1', 'Gaul FM 87.8 Semarang', 'The Best Visual Radio Station — Hits Music & Lifestyle', '/banners/banner-1.png', 'Tonton live', NULL, 'https://www.youtube.com/@radiogaulfm_smg', 'program', 0, true),
    ('b-2', 'Jadwal Siaran Gaul FM', 'Gaul Morning Show, Gaul Waktu Setempat & Asupan Gaul', '/banners/banner-2.png', 'Lihat Jadwal', 'schedule', NULL, 'program', 1, true),
    ('b-3', 'Gaulista Community', 'Radio anak muda hits 15-29 tahun di Semarang', '/banners/banner-3.png', 'Instagram', NULL, 'https://www.instagram.com/radiogaulfm_smg/', 'event', 2, true),
    ('b-4', 'radiogaulfmsmg.com', 'Kunjungi portal web resmi Radio Gaul FM Semarang', '/banners/banner-4.png', 'Kunjungi Web', NULL, 'https://radiogaulfmsmg.com', 'ad', 3, true);

-- -----------------------------------------------------------------------------
-- 5. Seed: announcers (Official Gaul Squad Master Profiles)
-- -----------------------------------------------------------------------------
DELETE FROM public.announcers;
INSERT INTO public.announcers (id, name, nickname, photo_url, bio, instagram, sort_order, is_active)
VALUES 
    ('ann-1', 'Attaya', 'Attaya', '/penyiar/attaya.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 1, true),
    ('ann-2', 'Ega Ratu', 'Ega', '/penyiar/ega-ratu.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 2, true),
    ('ann-3', 'Kara Ferina', 'Kara', '/penyiar/kara-ferina.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 3, true),
    ('ann-4', 'Nafa', 'Nafa', '/penyiar/nafa.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 4, true),
    ('ann-5', 'Nanda', 'Nanda', '/penyiar/nanda.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 5, true),
    ('ann-6', 'Rizky', 'Rizky', '/penyiar/rizky.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 6, true),
    ('ann-7', 'Tyas', 'Tyas', '/penyiar/tyas.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 7, true);

-- -----------------------------------------------------------------------------
-- 6. Seed: live_comments (Vibrant Realistic Chat Stream for Live Demo)
-- -----------------------------------------------------------------------------
DELETE FROM public.live_comments;
INSERT INTO public.live_comments (id, user_name, avatar_seed, message, is_broadcaster, is_highlighted, is_hidden, created_at)
VALUES 
    (gen_random_uuid(), 'Aditya Pratama', 'adit', 'Pagi Gaul Squad! Lagu barunya Bernadya udah masuk playlist belum min? ☕', false, false, false, NOW() - INTERVAL '28 minutes'),
    (gen_random_uuid(), 'Salsa Tembalang', 'salsa', 'Halo Kak Yoga & Sinta! Nemenin banget nih sambil ngerjain skripsi di cafe Undip 🎧', false, false, false, NOW() - INTERVAL '26 minutes'),
    (gen_random_uuid(), 'Studio Gaul FM', 'studio', 'Halo Gaulista Semarang! Selamat datang di live chat Gaul FM 87.8 MHz! Drop request lagu & salam kalian yaa 🔥', true, false, false, NOW() - INTERVAL '25 minutes'),
    (gen_random_uuid(), 'Rizky Wibowo', 'rizky', 'Semarang hari ini cerah pol ya guys, salam buat anak-anak Pleburan!', false, false, false, NOW() - INTERVAL '23 minutes'),
    (gen_random_uuid(), 'Dinda Lestari', 'dinda', 'Visual radionya jernih parah kak! Studionya estetik bgt ✨', false, false, false, NOW() - INTERVAL '21 minutes'),
    (gen_random_uuid(), 'Kevin Anggara', 'kevin', 'Titip salam buat anak arsitektur 21 yg lagi begadang di studio yaa min', false, false, false, NOW() - INTERVAL '20 minutes'),
    (gen_random_uuid(), 'Putri Ayu', 'putri', 'Min request lagunya Nadin Amizah - Rayuan Perempuan Gila dong, dedikasi buat temen-temen kosan Sukun Banyumanik ❤️', false, true, false, NOW() - INTERVAL '18 minutes'),
    (gen_random_uuid(), 'Bima Perkasa', 'bima', 'Mantap audionya nendang bgt, dengerin sambil nyetir di Tol Krapyak lancar jaya 🚗💨', false, false, false, NOW() - INTERVAL '17 minutes'),
    (gen_random_uuid(), 'Nayla Zahra', 'nayla', 'Kak penyiarnya lucu bgt sih pembawaannya haha seru banget!', false, false, false, NOW() - INTERVAL '15 minutes'),
    (gen_random_uuid(), 'Fajar Kurniawan', 'fajar', 'Kaligawe agak padat merayap ya lur, hati-hati buat yang arah Genuk / Demak ⚠️', false, false, false, NOW() - INTERVAL '14 minutes'),
    (gen_random_uuid(), 'Studio Gaul FM', 'studio', 'Noted Putri Ayu! Rayuan Perempuan Gila masuk antrean lagu berikutnya yaa, stay tuned! 🎶', true, false, false, NOW() - INTERVAL '13 minutes'),
    (gen_random_uuid(), 'Citra Kirana', 'citra', 'Lagu ini asik bgt parah! Auto goyang di kantor wkwk 💃', false, false, false, NOW() - INTERVAL '12 minutes'),
    (gen_random_uuid(), 'Dimas Setiawan', 'dimas', 'Absen dari Simpang Lima min! Cuaca mendukung buat ngopi ☕', false, false, false, NOW() - INTERVAL '11 minutes'),
    (gen_random_uuid(), 'Anisa Rahma', 'anisa', 'Request single terbarunya Hindia dong min yang ''Berdansalah, Karir Ini Tak Ada Artinya'' 🙌', false, false, false, NOW() - INTERVAL '10 minutes'),
    (gen_random_uuid(), 'Gilang Ramadhan', 'gilang', 'Suara penyiarnya renyah bgt, cocok buat teman kerja siang', false, false, false, NOW() - INTERVAL '9 minutes'),
    (gen_random_uuid(), 'Mega Puspita', 'mega', 'Min kapan ada bagi-bagi merchandise Gaul FM lagi nih? Mau kaosnya dongg 👕', false, false, false, NOW() - INTERVAL '8 minutes'),
    (gen_random_uuid(), 'Aris Wijaya', 'aris', 'Streaming webrtc-nya beneran low latency ya, chat langsung dibaca gak delay 👍', false, false, false, NOW() - INTERVAL '7 minutes'),
    (gen_random_uuid(), 'Bella Safira', 'bella', 'Keren banget ada visual radionya! Jadi bisa liat keseruan di studio langsung 😍', false, false, false, NOW() - INTERVAL '6 minutes'),
    (gen_random_uuid(), 'Raka Pratama', 'raka', 'Salam buat pejuang rupiah Semarang atas! Semangat terusss 💪', false, false, false, NOW() - INTERVAL '5 minutes 30 seconds'),
    (gen_random_uuid(), 'Tiara Andini Fans', 'tiara', 'Kak puterin lagu Taylor Swift - Cruel Summer dong biar makin melek kerjanya! 🎤', false, false, false, NOW() - INTERVAL '5 minutes'),
    (gen_random_uuid(), 'Studio Gaul FM', 'studio', 'Buat Mega dan Gaulista lainnya, pantengin terus ya! Sebentar lagi kita bakal spill giveaway tiket konser eksklusif! 🎁📻', true, false, false, NOW() - INTERVAL '4 minutes'),
    (gen_random_uuid(), 'Hendra Saputra', 'hendra', 'Wah giveaway tiket apa min?? Info dong buruan gasik! 🤩🔥', false, false, false, NOW() - INTERVAL '3 minutes 30 seconds'),
    (gen_random_uuid(), 'Siti Nurhaliza', 'siti', 'Halo Kak Attaya & Kak Ega! Salam dari kampus Unnes Sekaran 🍃', false, false, false, NOW() - INTERVAL '3 minutes'),
    (gen_random_uuid(), 'Bagus Panji', 'bagus', 'Playlist Gaul FM emang gak pernah gagal, hits anak muda banget! 💯', false, false, false, NOW() - INTERVAL '2 minutes 30 seconds'),
    (gen_random_uuid(), 'Vina Pandu', 'vina', 'Lagu ini vibes-nya sore santai banget di Kota Lama Semarang ✨', false, false, false, NOW() - INTERVAL '2 minutes'),
    (gen_random_uuid(), 'Yoga Kurnia', 'yoga', 'Weekend besok ada acara off-air Gaul FM di Simpang Lima gak min?', false, false, false, NOW() - INTERVAL '1 minute 30 seconds'),
    (gen_random_uuid(), 'Devi Maharani', 'devi', 'Wajib dengerin Gaul FM tiap hari biar gak ketinggalan lagu hits 💖', false, false, false, NOW() - INTERVAL '1 minute 10 seconds'),
    (gen_random_uuid(), 'Rian Kusuma', 'rian', 'Salam buat komunitas lari Semarang yang biasa CFD di Pahlawan! 🏃‍♂️', false, false, false, NOW() - INTERVAL '1 minute'),
    (gen_random_uuid(), 'Studio Gaul FM', 'studio', 'Yuk yang mau request lagi langsung ketik aja di live chat, Gaul Squad siap puterin! 🚀', true, false, false, NOW() - INTERVAL '40 seconds'),
    (gen_random_uuid(), 'Nadya Putri', 'nadya', 'Kak request lagunya Juicy Luicy - Tampar dong, relate banget nih 😭💔', false, false, false, NOW() - INTERVAL '30 seconds'),
    (gen_random_uuid(), 'Ilham Syahputra', 'ilham', 'Asik banget lagunya nemenin lembur! Semangat buat semua pendengar setia 87.8!', false, false, false, NOW() - INTERVAL '18 seconds'),
    (gen_random_uuid(), 'Farhan Alfarizi', 'farhan', 'Visual radio Gaul FM juara, gambar tajam suara jernih gak ada obat 🔥👏', false, false, false, NOW() - INTERVAL '6 seconds');


