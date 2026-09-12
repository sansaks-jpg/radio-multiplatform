-- =============================================================================
-- Migration: Add programs column to public.announcers
-- =============================================================================

-- 1. Tambahkan kolom array string programs untuk menampung daftar program siaran penyiar
ALTER TABLE public.announcers 
ADD COLUMN IF NOT EXISTS programs TEXT[] DEFAULT '{}';

-- 2. Update data awal program siaran untuk 7 penyiar resmi Gaul FM
UPDATE public.announcers 
SET programs = ARRAY['Gaul Morning Show', 'Gaul Waktu Setempat']
WHERE id = 'ann-1' OR name ILIKE '%Attaya%';

UPDATE public.announcers 
SET programs = ARRAY['Gaul Waktu Setempat', 'Asupan Gaul']
WHERE id = 'ann-2' OR name ILIKE '%Ega Ratu%';

UPDATE public.announcers 
SET programs = ARRAY['Gaul Morning Show']
WHERE id = 'ann-3' OR name ILIKE '%Kara Ferina%';

UPDATE public.announcers 
SET programs = ARRAY['Asupan Gaul']
WHERE id = 'ann-4' OR name ILIKE '%Nafa%';

UPDATE public.announcers 
SET programs = ARRAY['Gaul Morning Show', 'Asupan Gaul']
WHERE id = 'ann-5' OR name ILIKE '%Nanda%';

UPDATE public.announcers 
SET programs = ARRAY['Gaul Waktu Setempat']
WHERE id = 'ann-6' OR name ILIKE '%Rizky%';

UPDATE public.announcers 
SET programs = ARRAY['Gaul Morning Show', 'Gaul Waktu Setempat']
WHERE id = 'ann-7' OR name ILIKE '%Tyas%';
