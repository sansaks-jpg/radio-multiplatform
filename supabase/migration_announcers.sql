-- =============================================================================
-- Migration: Announcers (Gaul Squad) & Storage Bucket
-- =============================================================================

-- 1. Storage bucket 'penyiar'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('penyiar', 'penyiar', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Penyiar Select" ON storage.objects;
CREATE POLICY "Public Penyiar Select" ON storage.objects FOR SELECT USING (bucket_id = 'penyiar');

DROP POLICY IF EXISTS "Public Penyiar Insert" ON storage.objects;
CREATE POLICY "Public Penyiar Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'penyiar');

DROP POLICY IF EXISTS "Public Penyiar Update" ON storage.objects;
CREATE POLICY "Public Penyiar Update" ON storage.objects FOR UPDATE USING (bucket_id = 'penyiar');

DROP POLICY IF EXISTS "Public Penyiar Delete" ON storage.objects;
CREATE POLICY "Public Penyiar Delete" ON storage.objects FOR DELETE USING (bucket_id = 'penyiar');

-- 2. Master Table: announcers
CREATE TABLE IF NOT EXISTS public.announcers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    photo_url TEXT NOT NULL,
    bio TEXT,
    instagram VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.announcers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on announcers" ON public.announcers;
CREATE POLICY "Allow public read on announcers" ON public.announcers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin and service role full control on announcers" ON public.announcers;
CREATE POLICY "Allow admin and service role full control on announcers" ON public.announcers FOR ALL 
USING (true);

-- Ensure table is part of realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'announcers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.announcers;
    END IF;
END $$;

-- 3. Seed the 7 Announcers
INSERT INTO public.announcers (id, name, nickname, photo_url, bio, instagram, is_active, sort_order)
VALUES
    ('ann-1', 'Attaya', 'Attaya', '/penyiar/attaya.png', 'Gaul FM Announcer', '@radiogaulfm_smg', true, 1),
    ('ann-2', 'Ega Ratu', 'Ega', '/penyiar/ega-ratu.png', 'Gaul FM Announcer', '@radiogaulfm_smg', true, 2),
    ('ann-3', 'Kara Ferina', 'Kara', '/penyiar/kara-ferina.png', 'Gaul FM Announcer', '@radiogaulfm_smg', true, 3),
    ('ann-4', 'Nafa', 'Nafa', '/penyiar/nafa.png', 'Gaul FM Announcer', '@radiogaulfm_smg', true, 4),
    ('ann-5', 'Nanda', 'Nanda', '/penyiar/nanda.png', 'Gaul FM Announcer', '@radiogaulfm_smg', true, 5),
    ('ann-6', 'Rizky', 'Rizky', '/penyiar/rizky.png', 'Gaul FM Announcer', '@radiogaulfm_smg', true, 6),
    ('ann-7', 'Tyas', 'Tyas', '/penyiar/tyas.png', 'Gaul FM Announcer', '@radiogaulfm_smg', true, 7)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    nickname = EXCLUDED.nickname,
    photo_url = EXCLUDED.photo_url,
    sort_order = EXCLUDED.sort_order;

-- 4. Update programs table to remove rigid host names and default to 'Gaul Squad'
UPDATE public.programs 
SET host = 'Gaul Squad'
WHERE host IN ('Reno & Dita', 'Yoga & Sinta', 'Raka', 'Indra', 'Vina', 'Gaul FM DJ') 
   OR host IS NULL 
   OR host = '';
