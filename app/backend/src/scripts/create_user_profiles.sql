-- ============================================================
-- MAALEM — User Tag Profiles : Table Supabase pour le stockage persistant
-- Coller ce script dans le SQL Editor de Supabase
-- ============================================================

-- 1. Créer la table user_profiles si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id          text        PRIMARY KEY, -- userId
    profile_data jsonb      NOT NULL DEFAULT '{}'::jsonb, -- { profile: { tag: { score, lastUpdated } } }
    updated_at  timestamptz DEFAULT now()
);

-- 2. Activer RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Allow public read access on user_profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read access on user_profiles"
      ON public.user_profiles FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Allow service role full access on user_profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow service role full access on user_profiles"
      ON public.user_profiles FOR ALL USING (true)';
  END IF;
END
$$;
