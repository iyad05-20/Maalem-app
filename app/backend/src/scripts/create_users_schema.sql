-- ============================================================
-- MAALEM — Schéma Complet Utilisateurs, Profils, Favoris & Commandes
-- Exécuter ce script dans le SQL Editor de votre projet Supabase
-- ============================================================

-- 1. Table des Profils Utilisateurs Publics (Informations Personnelles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   text,
    avatar_url  text,
    phone       text,
    city        text,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- 2. Table des Profils de Recommandation IA (Moteur V2 Tags)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_data jsonb      NOT NULL DEFAULT '{"profile":{}}'::jsonb,
    updated_at  timestamptz DEFAULT now()
);

-- 3. Table des Favoris (Coup de Cœur Produits)
CREATE TABLE IF NOT EXISTS public.favorites (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id  text        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at  timestamptz DEFAULT now(),
    CONSTRAINT unique_user_favorite UNIQUE (user_id, product_id)
);

-- 4. Tables des Commandes et Lignes de Commande
CREATE TABLE IF NOT EXISTS public.orders (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status           text        NOT NULL DEFAULT 'pending', -- pending, confirmed, shipping, delivered, cancelled
    total_amount     numeric     NOT NULL DEFAULT 0,
    shipping_address jsonb       DEFAULT '{}'::jsonb,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   uuid    NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id text    NOT NULL REFERENCES public.products(id),
    quantity   integer NOT NULL DEFAULT 1,
    unit_price numeric NOT NULL DEFAULT 0
);

-- ============================================================
-- AUTOMATISATION : Trigger d'Inscription Automatique
-- Crée automatiquement les entrées dans 'profiles' et 'user_profiles'
-- lors de la création d'un utilisateur dans auth.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger AS $$
BEGIN
  -- Insérer dans public.profiles
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insérer dans public.user_profiles pour la recommandation V2
  INSERT INTO public.user_profiles (id, profile_data)
  VALUES (
    NEW.id,
    '{"profile":{}}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attacher le trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- ============================================================
-- SÉCURITÉ : Row Level Security (RLS) & Politiques d'Accès
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Policies pour 'profiles'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
    CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Service role full access profiles') THEN
    CREATE POLICY "Service role full access profiles" ON public.profiles FOR ALL USING (true);
  END IF;
END $$;

-- Policies pour 'user_profiles' (Recommandations V2)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can view their recommendation profile') THEN
    CREATE POLICY "Users can view their recommendation profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Service role full access user_profiles') THEN
    CREATE POLICY "Service role full access user_profiles" ON public.user_profiles FOR ALL USING (true);
  END IF;
END $$;

-- Policies pour 'favorites'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'Users can manage their favorites') THEN
    CREATE POLICY "Users can manage their favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'Service role full access favorites') THEN
    CREATE POLICY "Service role full access favorites" ON public.favorites FOR ALL USING (true);
  END IF;
END $$;

-- Policies pour 'orders'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can view their own orders') THEN
    CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can create orders') THEN
    CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Service role full access orders') THEN
    CREATE POLICY "Service role full access orders" ON public.orders FOR ALL USING (true);
  END IF;
END $$;

-- Policies pour 'order_items'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can view order items of their orders') THEN
    CREATE POLICY "Users can view order items of their orders" ON public.order_items FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Service role full access order_items') THEN
    CREATE POLICY "Service role full access order_items" ON public.order_items FOR ALL USING (true);
  END IF;
END $$;
