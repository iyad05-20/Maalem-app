-- ============================================================
-- MAALEM — Search Intents : Créer la table + Injecter les données
-- Coller ce script entier dans le SQL Editor de Supabase
-- ============================================================

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.search_intents (
    id          text    PRIMARY KEY,
    query       text    NOT NULL,
    category_groups text,
    tags        text[]  DEFAULT '{}'::text[],
    price_max   integer
);

-- 2. Activer RLS
ALTER TABLE public.search_intents ENABLE ROW LEVEL SECURITY;

-- 3. Policies (ignorer les erreurs si elles existent déjà)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'search_intents' AND policyname = 'Allow public read access on search_intents'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read access on search_intents"
      ON public.search_intents FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'search_intents' AND policyname = 'Allow service role full access on search_intents'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow service role full access on search_intents"
      ON public.search_intents FOR ALL USING (true)';
  END IF;
END
$$;

-- 4. Injecter les intentions (upsert pour éviter les doublons)
INSERT INTO public.search_intents (id, query, category_groups, tags, price_max)
VALUES
  ('1', 'gift',              'bijouterie',   ARRAY['cadeau', 'femme', 'corail', 'accessoire'], 150),
  ('2', 'cadeau femme',      'maroquinerie', ARRAY['cadeau', 'femme', 'luxe'],                 100),
  ('3', 'decoration maison', 'dinanderie',   ARRAY['decoration', 'salon', 'dore'],             200),
  ('4', 'tapis berbere',     'tissage',      ARRAY['berbere', 'rustique', 'laine'],            700),
  ('5', 'poterie cuisine',   'ceramique',    ARRAY['traditionnel', 'marocain'],                 80)
ON CONFLICT (id) DO UPDATE SET
  query           = EXCLUDED.query,
  category_groups = EXCLUDED.category_groups,
  tags            = EXCLUDED.tags,
  price_max       = EXCLUDED.price_max;

-- 5. Vérification : doit afficher 5 lignes
SELECT * FROM public.search_intents;

