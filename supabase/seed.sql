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
-- 2. Seed: programs (Official Schedule from Banner: Senin–Jumat)
-- -----------------------------------------------------------------------------
DELETE FROM public.programs;

-- Senin s/d Jumat (day_of_week: 1 to 5)
-- Di luar jam siaran program ini dan akhir pekan, Gaul FM memutarkan musik hits nonstop 24 jam.
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
        (1, 'Gaul Morning Show', 'Reno & Dita', '07:00', '10:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg', 'Mulai pagi kamu dengan hits terbaru, info lalu lintas Semarang, dan obrolan seru bareng Reno & Dita di Gaul Morning Show.'),
        (2, 'Gaul Waktu Setempat', 'Yoga & Sinta', '15:00', '18:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg', 'Nemenin sore perjalanan pulang kamu dengan musik hits, obrolan santai, dan info terkini waktu setempat di 87.8 MHz.'),
        (3, 'Asupan Gaul', 'Raka', '19:00', '22:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-12.15.45-1.jpeg', 'Asupan musik paling hits malam hari di 87.8 FM bareng Raka: playlist terbaik, request lagu, dan curhat anak muda.')
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
-- 4. Seed: banners
-- -----------------------------------------------------------------------------
DELETE FROM public.banners;
INSERT INTO public.banners (id, title, subtitle, image_url, cta_label, link_to, link_url, type, sort_order, is_active)
VALUES 
    ('banner-1', 'Drive Time Gaul Live', 'Temani sore pulang kantor bareng Yoga & Sinta', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg', 'Dengarkan', NULL, NULL, 'program', 1, true),
    ('banner-2', 'Festival Musik Kota Lama', 'Live report eksklusif hanya di Radio Gaul FM', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg', 'Info Acara', 'news', NULL, 'event', 2, true),
    ('banner-3', 'Visual Radio YouTube Live', 'Tonton siaran studio langsung di channel resmi kami', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-12.28.41.jpeg', 'Nonton Live', NULL, 'https://www.youtube.com/@radiogaulfm_smg/live', 'ad', 3, true);
