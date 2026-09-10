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
    'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg',
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
        (1, 'Gaul Morning Show', 'Reno & Dita', '07:00', '10:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-28-at-11.36.02.jpeg', 'Mulai pagi dengan hits terbaru, info lalu lintas Semarang, dan obrolan seru bareng Reno & Dita.'),
        (2, 'Gaul Waktu Setempat', 'Yoga & Sinta', '15:00', '18:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-15.19.18.jpeg', 'Nemenin sore pulang: musik hits, obrolan santai, dan update waktu setempat di 87.8 MHz.'),
        (3, 'Asupan Gaul', 'Raka', '19:00', '22:00', 'https://radiogaulfmsmg.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-25-at-12.15.45-1.jpeg', 'Asupan musik gaul malam hari di 87.8 FM: playlist pilihan, curhat, dan obrolan hangat anak muda.')
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
    ('b-1', 'Gaul FM 87.8 Semarang', 'The Best Visual Radio Station — Hits Music & Lifestyle', 'https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/banners/banner-1.png', 'Tonton live', NULL, 'https://www.youtube.com/@radiogaulfm_smg', 'program', 0, true),
    ('b-2', 'Jadwal Siaran Gaul FM', 'Gaul Morning Show, Gaul Waktu Setempat & Asupan Gaul', 'https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/banners/banner-2.png', 'Lihat Jadwal', 'schedule', NULL, 'program', 1, true),
    ('b-3', 'Gaulista Community', 'Radio anak muda hits 15-29 tahun di Semarang', 'https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/banners/banner-3.png', 'Instagram', NULL, 'https://www.instagram.com/radiogaulfm_smg/', 'event', 2, true),
    ('b-4', 'radiogaulfmsmg.com', 'Kunjungi portal web resmi Radio Gaul FM Semarang', 'https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/banners/banner-4.png', 'Kunjungi Web', NULL, 'https://radiogaulfmsmg.com', 'ad', 3, true);

-- -----------------------------------------------------------------------------
-- 5. Seed: announcers (Official Gaul Squad Master Profiles)
-- -----------------------------------------------------------------------------
DELETE FROM public.announcers;
INSERT INTO public.announcers (id, name, nickname, photo_url, bio, instagram, sort_order, is_active)
VALUES 
    ('ann-1', 'Attaya', 'Attaya', 'https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/attaya.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 1, true),
    ('ann-2', 'Ega Ratu', 'Ega', 'https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/ega-ratu.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 2, true),
    ('ann-3', 'Kara Ferina', 'Kara', 'https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/kara-ferina.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 3, true),
    ('ann-4', 'Nafa', 'Nafa', 'https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/nafa.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 4, true),
    ('ann-5', 'Nanda', 'Nanda', 'https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/nanda.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 5, true),
    ('ann-6', 'Rizky', 'Rizky', 'https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/rizky.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 6, true),
    ('ann-7', 'Tyas', 'Tyas', 'https://idnxegollxhdcoexvndx.supabase.co/storage/v1/object/public/penyiar/tyas.png', 'Gaul FM Announcer', '@radiogaulfm_smg', 7, true);

