-- =============================================================================
-- Gaul FM Semarang — Initial Seed Data
-- File: supabase/seed.sql
-- Description: Rich dummy data for initial database setup (Now Playing, Programs, News, Banners).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Seed: now_playing
-- -----------------------------------------------------------------------------
DELETE FROM public.now_playing;
INSERT INTO public.now_playing (id, current_program, current_host, current_cover_url, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Drive Time Gaul',
    'Yoga & Sinta',
    'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg',
    NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Seed: programs (Full Weekly Schedule: Monday–Sunday)
-- -----------------------------------------------------------------------------
DELETE FROM public.programs;

-- Senin s/d Jumat (day_of_week: 1 to 5)
INSERT INTO public.programs (id, name, host, day_of_week, start_time, end_time, cover_url, description)
SELECT 
    'prog-' || d || '-' || slot.id,
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
        (1, 'Gaul Pagi', 'Reno & Dita', '06:00', '10:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg', 'Bangunin pagi kamu dengan hits terbaru, info lalu lintas Semarang, dan obrolan receh.'),
        (2, 'Cek Sound', 'Bara', '10:00', '13:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.33.37.jpeg', 'Seputar musik lokal, band indie Semarang, dan cerita di balik lagu.'),
        (3, 'Gaul Siang', 'Nadia', '13:00', '16:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-12.28.41.jpeg', 'Temenin jam kerja dan kuliah kamu dengan playlist paling gaul.'),
        (4, 'Drive Time Gaul', 'Yoga & Sinta', '16:00', '19:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg', 'Nemenin macet pulang: request lagu, games, dan update sore Semarang.'),
        (5, 'Gaul Malam', 'Raka', '19:00', '22:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-12.15.45-1.jpeg', 'Curhat malam, lagu galau, dan topik hangat anak muda.'),
        (6, 'Nonstop Hits', 'Gaul FM Autopilot', '22:00', '00:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-22-at-13.34.42.jpeg', 'Musik nonstop sampai tengah malam.')
) AS slot(id, name, host, start_time, end_time, cover_url, description);

-- Sabtu (day_of_week: 6)
INSERT INTO public.programs (id, name, host, day_of_week, start_time, end_time, cover_url, description)
VALUES 
    ('prog-6-1', 'Weekend Warm-Up', 'Dita', 6, '06:00', '09:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg', 'Awali akhir pekan dengan musik ceria dan ide liburan di Semarang.'),
    ('prog-6-2', 'Top 20 Gaul Chart', 'Bara & Nadia', 6, '09:00', '12:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.33.37.jpeg', 'Hitung mundur 20 lagu terpopuler minggu ini pilihan pendengar.'),
    ('prog-6-3', 'Komunitas Semarang', 'Reno', 6, '12:00', '15:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-12.28.41.jpeg', 'Ngobrol seru bareng komunitas kreatif, hobi, dan olahraga Kota Atlas.'),
    ('prog-6-4', 'Gaul Sore Weekend', 'Yoga', 6, '15:00', '18:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg', 'Nongkrong sore, rekomendasi kuliner, dan event akhir pekan.'),
    ('prog-6-5', 'Saturday Night Party', 'DJ Mix & Sinta', 6, '18:00', '22:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-12.15.45-1.jpeg', 'EDM, remix hits, dan playlist pemanasan malam minggu.'),
    ('prog-6-6', 'After Hours', 'Gaul FM Autopilot', 6, '22:00', '00:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-22-at-13.34.42.jpeg', 'Chill beats dan lo-fi menemani istirahat malam.');

-- Minggu (day_of_week: 0)
INSERT INTO public.programs (id, name, host, day_of_week, start_time, end_time, cover_url, description)
VALUES 
    ('prog-0-1', 'Sunday Morning Vibes', 'Reno', 0, '06:00', '09:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg', 'Musik santai untuk car free day dan sarapan pagi di Simpang Lima.'),
    ('prog-0-2', 'Nostalgia Gaul', 'Dita', 0, '09:00', '12:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.33.37.jpeg', 'Kilas balik lagu-lagu 2000-an dan 2010-an yang bikin kangen masa sekolah.'),
    ('prog-0-3', 'Indie Corner', 'Bara', 0, '12:00', '15:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-12.28.41.jpeg', 'Panggung musisi independen Jawa Tengah: rilis lagu baru dan wawancara eksklusif.'),
    ('prog-0-4', 'Gaul Santai', 'Nadia', 0, '15:00', '18:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg', 'Refleksi akhir pekan sebelum memulai rutinitas hari Senin.'),
    ('prog-0-5', 'Sunday Acoustic', 'Raka', 0, '18:00', '21:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-12.15.45-1.jpeg', 'Sesi live akustik dan lagu-lagu hangat penutup akhir pekan.'),
    ('prog-0-6', 'Nightcap', 'Gaul FM Autopilot', 0, '21:00', '00:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-22-at-13.34.42.jpeg', 'Lagu pengantar tidur bersiap menyambut minggu yang baru.');

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
-- 4. Seed: banners
-- -----------------------------------------------------------------------------
DELETE FROM public.banners;
INSERT INTO public.banners (id, title, subtitle, image_url, cta_label, link_to, link_url, type, sort_order, is_active)
VALUES 
    ('banner-1', 'Drive Time Gaul Live', 'Temani sore pulang kantor bareng Yoga & Sinta', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg', 'Dengarkan', NULL, NULL, 'program', 1, true),
    ('banner-2', 'Festival Musik Kota Lama', 'Live report eksklusif hanya di Radio Gaul FM', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg', 'Info Acara', 'news', NULL, 'event', 2, true),
    ('banner-3', 'Visual Radio YouTube Live', 'Tonton siaran studio langsung di channel resmi kami', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-12.28.41.jpeg', 'Nonton Live', NULL, 'https://www.youtube.com/@radiogaulfm_smg/live', 'ad', 3, true);
