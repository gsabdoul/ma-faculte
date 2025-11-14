-- Consolidated Supabase setup script for Ma Faculté
-- Run this in Supabase Dashboard → SQL editor
-- Includes: robust profile trigger, trigger binding, RPC fallback, RLS policies,
-- and optional sample data plus public read policies for reference tables.

-- 1) Robust trigger function: create profile on new auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta JSONB;
  v_nom TEXT;
  v_prenom TEXT;
  v_universite UUID;
  v_faculte UUID;
  v_niveau UUID;
  v_code TEXT;
  v_active_code TEXT;
BEGIN
  meta := NEW.raw_user_meta_data;

  -- Fallback values when metadata is missing (e.g., email confirmation enabled)
  v_nom := COALESCE(meta->>'last_name', 'Nom');
  v_prenom := COALESCE(meta->>'first_name', 'Prénom');

  -- Safe casts from metadata (handle empty strings)
  IF COALESCE(meta->>'university_id','') <> '' THEN
    v_universite := (meta->>'university_id')::UUID;
  END IF;
  IF COALESCE(meta->>'faculte_id','') <> '' THEN
    v_faculte := (meta->>'faculte_id')::UUID;
  END IF;
  IF COALESCE(meta->>'niveau_id','') <> '' THEN
    v_niveau := (meta->>'niveau_id')::UUID;
  END IF;

  -- Generate simple codes (8 hex chars)
  v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FOR 8));
  v_active_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FOR 8));

  INSERT INTO public.profiles (
    id, nom, prenom, universite_id, faculte_id, niveau_id,
    role, code, active_code, is_premium, created_at, updated_at
  ) VALUES (
    NEW.id, v_nom, v_prenom, v_universite, v_faculte, v_niveau,
    'reader', v_code, v_active_code, FALSE, NOW(), NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Bind trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) RPC: update_profile_after_signup (client-side fallback)
CREATE OR REPLACE FUNCTION public.update_profile_after_signup(
  p_user_id UUID,
  p_nom TEXT,
  p_prenom TEXT,
  p_universite_id UUID,
  p_faculte_id UUID,
  p_niveau_id UUID
)
RETURNS JSONB AS $$
BEGIN
  -- Ensure caller updates their own profile only
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET
    nom = COALESCE(p_nom, nom),
    prenom = COALESCE(p_prenom, prenom),
    universite_id = COALESCE(p_universite_id, universite_id),
    faculte_id = COALESCE(p_faculte_id, faculte_id),
    niveau_id = COALESCE(p_niveau_id, niveau_id),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Profil mis à jour');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Profil introuvable');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) RLS policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Grant RPC execution to authenticated users
GRANT EXECUTE ON FUNCTION public.update_profile_after_signup(UUID, TEXT, TEXT, UUID, UUID, UUID) TO authenticated;

-- 5) Optional: allow authenticated reads on reference tables
-- Adjust if you want anon access instead (replace authenticated with anon)
DO $$ BEGIN
  -- Universites
  BEGIN
    ALTER TABLE public.universites ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  DROP POLICY IF EXISTS "universites_read_all" ON public.universites;
  CREATE POLICY "universites_read_all" ON public.universites
  FOR SELECT TO authenticated USING (true);

  -- Facultes
  BEGIN
    ALTER TABLE public.facultes ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  DROP POLICY IF EXISTS "facultes_read_all" ON public.facultes;
  CREATE POLICY "facultes_read_all" ON public.facultes
  FOR SELECT TO authenticated USING (true);

  -- Niveaux
  BEGIN
    ALTER TABLE public.niveaux ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  DROP POLICY IF EXISTS "niveaux_read_all" ON public.niveaux;
  CREATE POLICY "niveaux_read_all" ON public.niveaux
  FOR SELECT TO authenticated USING (true);
END $$;

-- 6) Optional sample data for quick testing (run once)
-- Fonction pour obtenir le nombre d'inscriptions par mois pour les 6 derniers mois
CREATE OR REPLACE FUNCTION get_monthly_signups()
RETURNS TABLE(month_name TEXT, user_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT
      date_trunc('month', p.created_at) as month_start,
      COUNT(p.id) as count
    FROM
      public.profiles p
    WHERE
      p.created_at >= date_trunc('month', NOW() - INTERVAL '5 months')
    GROUP BY
      month_start
  )
  SELECT
    to_char(md.month_start, 'TMMonth') AS month_name,
    md.count AS user_count
  FROM
    monthly_data md
  ORDER BY
    md.month_start;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir la répartition des sujets par module
CREATE OR REPLACE FUNCTION get_subjects_distribution()
RETURNS TABLE(module_name TEXT, subject_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.nom AS module_name,
    COUNT(s.id) AS subject_count
  FROM
    public.modules m
  JOIN
    public.sujets s ON s.module_id = m.id
  GROUP BY
    m.nom
  ORDER BY
    m.nom;
END;
$$ LANGUAGE plpgsql;

-- End of script