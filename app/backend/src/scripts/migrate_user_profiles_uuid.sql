-- ============================================================
-- MAALEM — Migration : Conversion de user_profiles.id en UUID
-- Exécuter ce script dans le SQL Editor de Supabase
-- ============================================================

-- 1. Supprimer l'ancienne politique RLS
DROP POLICY IF EXISTS "Users can view their recommendation profile" ON public.user_profiles;

-- 2. Convertir la colonne 'id' du type text au type UUID (avec casting des valeurs existantes)
ALTER TABLE public.user_profiles 
  ALTER COLUMN id TYPE uuid USING id::uuid;

-- 3. Ajouter la contrainte de clé étrangère vers auth.users(id)
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey,
  ADD CONSTRAINT user_profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Re-créer la politique RLS avec comparaison UUID
CREATE POLICY "Users can view their recommendation profile" 
  ON public.user_profiles FOR SELECT 
  USING (auth.uid() = id);
