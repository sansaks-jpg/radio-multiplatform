-- =============================================================================
-- Gaul FM Semarang — Supabase PostgreSQL Database Schema
-- File: supabase/schema.sql
-- Description: DDL tables, indexes, RLS security policies, triggers & realtime.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Table: now_playing (Single-row active broadcast status)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.now_playing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    current_program VARCHAR(255) NOT NULL,
    current_host VARCHAR(255) NOT NULL,
    current_cover_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. Table: programs (Weekly broadcast master schedule)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.programs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Minggu, 1=Senin..6=Sabtu
    start_time VARCHAR(10) NOT NULL, -- Format: "HH:mm" e.g. "06:00"
    end_time VARCHAR(10) NOT NULL,   -- Format: "HH:mm" e.g. "10:00"
    cover_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. Table: news (WordPress Synced Articles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    wp_post_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    category VARCHAR(100),
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. Table: profiles (Listener demographics & tracking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(30),
    device_os VARCHAR(50),          -- 'Android', 'iOS', 'web'
    device_model TEXT,              -- e.g. 'Samsung Galaxy S24'
    location_city VARCHAR(100),     -- e.g. 'Semarang'
    location_lat DECIMAL(9,6),      -- Last captured latitude
    location_lng DECIMAL(9,6),      -- Last captured longitude
    push_token TEXT,                -- Expo Push Notification Token
    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. Table: banners (Home Promotional Carousel)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banners (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    cta_label VARCHAR(100),
    link_to VARCHAR(50),           -- 'schedule', 'news', 'profile'
    link_url TEXT,                 -- External URL (e.g. YouTube stream)
    type VARCHAR(30) NOT NULL DEFAULT 'program', -- 'program', 'event', 'ad'
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES FOR QUERY OPTIMIZATION
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_programs_day_time ON public.programs (day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_news_published ON public.news (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_wp_id ON public.news (wp_post_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles (location_city);
CREATE INDEX IF NOT EXISTS idx_banners_sort ON public.banners (sort_order, is_active);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.now_playing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- 1. now_playing: Public read, admin/service role write
CREATE POLICY "Allow public read on now_playing"
    ON public.now_playing FOR SELECT USING (true);
CREATE POLICY "Allow admin and service role full control on now_playing"
    ON public.now_playing FOR ALL 
    USING (
        auth.jwt()->'app_metadata'->>'role' = 'admin' 
        OR auth.jwt()->>'role' = 'service_role'
    );

-- 2. programs: Public read, admin/service role write
CREATE POLICY "Allow public read on programs"
    ON public.programs FOR SELECT USING (true);
CREATE POLICY "Allow admin and service role full control on programs"
    ON public.programs FOR ALL 
    USING (
        auth.jwt()->'app_metadata'->>'role' = 'admin' 
        OR auth.jwt()->>'role' = 'service_role'
    );

-- 3. news: Public read, admin/service role write
CREATE POLICY "Allow public read on news"
    ON public.news FOR SELECT USING (true);
CREATE POLICY "Allow admin and service role full control on news"
    ON public.news FOR ALL 
    USING (
        auth.jwt()->'app_metadata'->>'role' = 'admin' 
        OR auth.jwt()->>'role' = 'service_role'
    );

-- 4. banners: Public read, admin/service role write
CREATE POLICY "Allow public read on banners"
    ON public.banners FOR SELECT USING (true);
CREATE POLICY "Allow admin and service role full control on banners"
    ON public.banners FOR ALL 
    USING (
        auth.jwt()->'app_metadata'->>'role' = 'admin' 
        OR auth.jwt()->>'role' = 'service_role'
    );

-- 5. profiles: User can view/update own profile; admins & service role can view/manage all
CREATE POLICY "Users and admins can view profiles"
    ON public.profiles FOR SELECT 
    USING (
        auth.uid() = id 
        OR auth.jwt()->'app_metadata'->>'role' = 'admin' 
        OR auth.jwt()->>'role' = 'service_role'
    );
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE 
    USING (
        auth.uid() = id 
        OR auth.jwt()->'app_metadata'->>'role' = 'admin' 
        OR auth.jwt()->>'role' = 'service_role'
    );
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT 
    WITH CHECK (
        auth.uid() = id 
        OR auth.jwt()->>'role' = 'service_role'
    );
CREATE POLICY "Admin and service role can delete profile"
    ON public.profiles FOR DELETE 
    USING (
        auth.jwt()->'app_metadata'->>'role' = 'admin' 
        OR auth.jwt()->>'role' = 'service_role'
    );

-- =============================================================================
-- TRIGGERS: AUTO-SYNC AUTH.USERS -> PROFILES
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        whatsapp_number,
        device_os,
        created_at,
        last_login
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Pendengar Gaul'),
        new.raw_user_meta_data->>'whatsapp',
        new.raw_user_meta_data->>'device_os',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, profiles.whatsapp_number),
        last_login = NOW();

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- REALTIME SUBSCRIPTIONS
-- =============================================================================
-- Enable realtime stream updates for now_playing so listeners receive live updates instantly
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'now_playing'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.now_playing;
    END IF;
END $$;
