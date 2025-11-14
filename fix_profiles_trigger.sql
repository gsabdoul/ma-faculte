-- Script pour corriger le problème de profils null
-- À exécuter dans Supabase SQL Editor

-- 1. Améliorer le trigger pour gérer les métadonnées null
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si les métadonnées existent
  IF new.raw_user_meta_data IS NOT NULL THEN
    INSERT INTO public.profiles (id, nom, prenom, universite_id, faculte_id, niveau_id, role)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'first_name',
      (new.raw_user_meta_data->>'university_id')::UUID,
      (new.raw_user_meta_data->>'faculte_id')::UUID,
      (new.raw_user_meta_data->>'niveau_id')::UUID,
      'reader'
    );
  ELSE
    -- Créer un profil minimal si pas de métadonnées (confirmation email activée)
    INSERT INTO public.profiles (id, nom, prenom, role)
    VALUES (
      new.id,
      'Nom temporaire',
      'Prénom temporaire', 
      'reader'
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fonction pour mettre à jour un profil après inscription
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
  UPDATE public.profiles
  SET 
    nom = p_nom,
    prenom = p_prenom,
    universite_id = p_universite_id,
    faculte_id = p_faculte_id,
    niveau_id = p_niveau_id,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_user_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Profil mis à jour avec succès');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Profil non trouvé');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Politique RLS pour permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- 4. Nettoyer les profils existants avec des données null
DELETE FROM public.profiles WHERE nom IS NULL;