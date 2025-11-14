-- # Schéma Supabase pour l'Application Ma Faculté (mis à jour)

-- Ce document définit le schéma de base de données et les règles de sécurité, en intégrant vos précisions backend:
-- - Rôles disponibles: `admin`, `writer`, `reader` (un seul rôle par utilisateur, modifiable par les admins)
-- - Table `profiles`: ajoute `code`, `active_code`, `is_premium` et simplifie en supprimant la filière (non requise)
-- - Les `drives` sont liés à `faculte` et `niveau`
-- - Suppression de la table `filieres`

-- ## Tables Principales

-- ### 1. users (table `auth.users` de Supabase)
-- Gérée automatiquement par Supabase Auth.
-- Les informations complémentaires sont stockées dans `profiles`.

-- ### 3. universites
CREATE TABLE public.universites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(255) NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ### 4. facultes
CREATE TABLE public.facultes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ### 5. niveaux
CREATE TABLE public.niveaux (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(50) NOT NULL,
  ordre INTEGER,
  faculte_id UUID REFERENCES public.facultes(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ### 6. modules
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  icone_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ### 2. profiles (Déplacé après ses dépendances)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255) NOT NULL,
  universite_id UUID REFERENCES public.universites(id) NOT NULL,
  faculte_id UUID REFERENCES public.facultes(id) NOT NULL,
  niveau_id UUID REFERENCES public.niveaux(id) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'writer', 'reader')),
  code VARCHAR(8) UNIQUE NOT NULL,
  active_code VARCHAR(8) UNIQUE NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ### 7. module_faculte_niveau
CREATE TABLE public.module_faculte_niveau (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES public.modules(id) NOT NULL,
  faculte_id UUID REFERENCES public.facultes(id) NOT NULL,
  niveau_id UUID REFERENCES public.niveaux(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(module_id, faculte_id, niveau_id)
);

-- ### 8. sujets
CREATE TABLE public.sujets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre VARCHAR(255) NOT NULL,
  module_id UUID REFERENCES public.modules(id) NOT NULL,
  universite_id UUID REFERENCES public.universites(id) NOT NULL,
  faculte_id UUID REFERENCES public.facultes(id) NOT NULL,
  niveau_id UUID REFERENCES public.niveaux(id) NOT NULL,
  fichier_url TEXT NOT NULL,
  taille_fichier INTEGER,
  annee VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ### 9. livres
CREATE TABLE public.livres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre VARCHAR(255) NOT NULL,
  auteur VARCHAR(255),
  module_id UUID REFERENCES public.modules(id) NOT NULL,
  couverture_url TEXT,
  fichier_url TEXT NOT NULL,
  taille_fichier INTEGER,
  nombre_pages INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ### 10. drives
CREATE TABLE public.drives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  faculte_id UUID REFERENCES public.facultes(id) NOT NULL,
  niveau_id UUID REFERENCES public.niveaux(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ### 11. notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  titre VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  lue BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ### 12. infos_carrousel
CREATE TABLE public.infos_carrousel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  lien TEXT,
  active BOOLEAN DEFAULT TRUE,
  ordre INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ### 13. signalements
CREATE TABLE public.signalements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('sujet', 'livre')),
  item_id UUID NOT NULL,
  description TEXT NOT NULL,
  statut VARCHAR(50) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'resolu', 'rejete')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ## Fonctions utilitaires et Triggers

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer un code alphanumérique de 8 caractères
CREATE OR REPLACE FUNCTION generate_code_8()
RETURNS TEXT AS $$
DECLARE
    v TEXT;
BEGIN
    -- Utilise MD5 sur une valeur aléatoire, tronquée à 8 caractères
    v := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    RETURN v;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour auto-remplir code et active_code à l'insertion sur profiles
CREATE OR REPLACE FUNCTION profiles_fill_codes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL THEN NEW.code := generate_code_8(); END IF;
    IF NEW.active_code IS NULL THEN NEW.active_code := generate_code_8(); END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_fill_codes
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE profiles_fill_codes();

-- Appliquer update_updated_at sur les tables clés (exemples)
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_sujets_updated_at BEFORE UPDATE ON public.sujets
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_drives_updated_at BEFORE UPDATE ON public.drives
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Fonction pour activer l'abonnement premium d'un an
CREATE OR REPLACE FUNCTION activate_premium_subscription(p_active_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
BEGIN
    -- 1. Trouver l'utilisateur correspondant au code d'activation
    SELECT id INTO v_user_id FROM public.profiles WHERE active_code = p_active_code;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code d''activation invalide.');
    END IF;

    -- 2. Mettre à jour le profil de l'utilisateur
    UPDATE public.profiles
    SET 
        is_premium = TRUE,
        subscription_start_date = CURRENT_TIMESTAMP,
        subscription_end_date = CURRENT_TIMESTAMP + interval '1 year',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id
    RETURNING * INTO v_profile;

    -- 3. Retourner une confirmation
    RETURN jsonb_build_object('success', true, 'message', 'Abonnement activé avec succès!', 'profile', to_jsonb(v_profile));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer un profil lors de l'inscription d'un nouvel utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nom, prenom, universite_id, faculte_id, niveau_id, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'first_name',
    (new.raw_user_meta_data->>'university_id')::UUID,
    (new.raw_user_meta_data->>'faculte_id')::UUID,
    (new.raw_user_meta_data->>'niveau_id')::UUID,
    'reader' -- Rôle par défaut pour tout nouvel utilisateur
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ## Règles de Sécurité (RLS)

-- Profiles: visibles par tous, modifiables par le propriétaire ou par un admin
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_all ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Sujets
ALTER TABLE public.sujets ENABLE ROW LEVEL SECURITY;

CREATE POLICY sujets_select_all ON public.sujets
  FOR SELECT USING (true);

CREATE POLICY sujets_write_admin_writer ON public.sujets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','writer'))
  );

CREATE POLICY sujets_update_admin_writer ON public.sujets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','writer'))
  );

CREATE POLICY sujets_delete_admin ON public.sujets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Drives
ALTER TABLE public.drives ENABLE ROW LEVEL SECURITY;

CREATE POLICY drives_select_all ON public.drives
  FOR SELECT USING (true);

CREATE POLICY drives_write_admin_writer ON public.drives
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','writer'))
  );

CREATE POLICY drives_update_admin_writer ON public.drives
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','writer'))
  );

CREATE POLICY drives_delete_admin ON public.drives
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ## Données Test

-- ### Universités
-- INSERT INTO universites (id, nom, logo_url) VALUES
-- ('d290f1ee-6c54-4b01-90e6-d701748f0851', 'Université Joseph Ki-Zerbo', 'https://example.com/ujkz_logo.png'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0852', 'Université Nazi Boni', 'https://example.com/unb_logo.png'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0853', 'Université Norbert Zongo', 'https://example.com/unz_logo.png');

-- ### Facultés
-- INSERT INTO facultes (id, nom) VALUES
-- ('d290f1ee-6c54-4b01-90e6-d701748f0861', 'Faculté des Sciences et Techniques'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0862', 'Faculté des Sciences Économiques et de Gestion'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0863', 'Faculté des Sciences de la Santé');

-- ### Niveaux (liés à la faculté)
-- INSERT INTO niveaux (id, nom, ordre, faculte_id) VALUES
-- ('d290f1ee-6c54-4b01-90e6-d701748f0881', 'Licence 1', 1, 'd290f1ee-6c54-4b01-90e6-d701748f0861'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0882', 'Licence 2', 2, 'd290f1ee-6c54-4b01-90e6-d701748f0861'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0883', 'Licence 3', 3, 'd290f1ee-6c54-4b01-90e6-d701748f0861'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0884', 'Master 1', 4, 'd290f1ee-6c54-4b01-90e6-d701748f0861'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0885', 'Master 2', 5, 'd290f1ee-6c54-4b01-90e6-d701748f0861');

-- ### Modules
-- INSERT INTO modules (id, nom, description, icone_url) VALUES
-- ('d290f1ee-6c54-4b01-90e6-d701748f0891', 'Programmation', 'Cours de programmation', 'https://example.com/icons/programming.png'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0892', 'Bases de données', 'Cours de bases de données', 'https://example.com/icons/database.png'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0893', 'Analyse économique', 'Cours d''analyse économique', 'https://example.com/icons/economics.png'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0894', 'Anatomie', 'Cours d''anatomie', 'https://example.com/icons/anatomy.png');

-- ### Module-Faculté-Niveau
-- INSERT INTO module_faculte_niveau (module_id, faculte_id, niveau_id) VALUES
-- ('d290f1ee-6c54-4b01-90e6-d701748f0891', 'd290f1ee-6c54-4b01-90e6-d701748f0861', 'd290f1ee-6c54-4b01-90e6-d701748f0881'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0892', 'd290f1ee-6c54-4b01-90e6-d701748f0861', 'd290f1ee-6c54-4b01-90e6-d701748f0882'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0893', 'd290f1ee-6c54-4b01-90e6-d701748f0862', 'd290f1ee-6c54-4b01-90e6-d701748f0881'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0894', 'd290f1ee-6c54-4b01-90e6-d701748f0863', 'd290f1ee-6c54-4b01-90e6-d701748f0881');

-- ### Sujets
-- INSERT INTO sujets (id, titre, module_id, universite_id, faculte_id, niveau_id, fichier_url, taille_fichier, annee) VALUES
-- ('d290f1ee-6c54-4b01-90e6-d701748f0901', 'Examen Programmation 2022', 'd290f1ee-6c54-4b01-90e6-d701748f0891', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'd290f1ee-6c54-4b01-90e6-d701748f0861', 'd290f1ee-6c54-4b01-90e6-d701748f0881', 'https://drive.google.com/file/d/1234567890/view', 1024, '2022'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0902', 'Examen Bases de données 2022', 'd290f1ee-6c54-4b01-90e6-d701748f0892', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'd290f1ee-6c54-4b01-90e6-d701748f0861', 'd290f1ee-6c54-4b01-90e6-d701748f0882', 'https://drive.google.com/file/d/1234567891/view', 1536, '2022'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0903', 'Examen Analyse économique 2022', 'd290f1ee-6c54-4b01-90e6-d701748f0893', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'd290f1ee-6c54-4b01-90e6-d701748f0862', 'd290f1ee-6c54-4b01-90e6-d701748f0881', 'https://drive.google.com/file/d/1234567892/view', 2048, '2022');

-- ### Livres
-- INSERT INTO livres (id, titre, auteur, module_id, couverture_url, fichier_url, taille_fichier, nombre_pages) VALUES
-- ('d290f1ee-6c54-4b01-90e6-d701748f0911', 'Introduction à la Programmation en Python', 'John Doe', 'd290f1ee-6c54-4b01-90e6-d701748f0891', 'https://example.com/covers/python_book.jpg', 'https://drive.google.com/file/d/1234567893/view', 5120, 250),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0912', 'SQL pour les débutants', 'Jane Smith', 'd290f1ee-6c54-4b01-90e6-d701748f0892', 'https://example.com/covers/sql_book.jpg', 'https://drive.google.com/file/d/1234567894/view', 4096, 200),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0913', 'Principes d''économie', 'Paul Krugman', 'd290f1ee-6c54-4b01-90e6-d701748f0893', 'https://example.com/covers/economics_book.jpg', 'https://drive.google.com/file/d/1234567895/view', 8192, 400);

-- ### Drives (liés à faculte et niveau)
-- INSERT INTO drives (id, titre, description, url, faculte_id, niveau_id) VALUES
-- ('d290f1ee-6c54-4b01-90e6-d701748f0921', 'Drive Informatique L1', 'Ressources pour les étudiants en FAST L1', 'https://drive.google.com/drive/folders/1234567896', 'd290f1ee-6c54-4b01-90e6-d701748f0861', 'd290f1ee-6c54-4b01-90e6-d701748f0881'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0922', 'Drive Économie L1', 'Ressources pour les étudiants en FASEG L1', 'https://drive.google.com/drive/folders/1234567897', 'd290f1ee-6c54-4b01-90e6-d701748f0862', 'd290f1ee-6c54-4b01-90e6-d701748f0881'),
-- ('d290f1ee-6c54-4b01-90e6-d701748f0923', 'Drive Médecine L1', 'Ressources pour les étudiants en FSS L1', 'https://drive.google.com/drive/folders/1234567898', 'd290f1ee-6c54-4b01-90e6-d701748f0863', 'd290f1ee-6c54-4b01-90e6-d701748f0881');

-- ### Utilisateurs et Profils (à exécuter après création via Supabase Auth)
-- INSERT INTO profiles (id, nom, prenom, universite_id, faculte_id, niveau_id, role, code, active_code, is_premium, subscription_start_date, subscription_end_date) VALUES
-- ('86b3c520-9461-4a38-a28a-3d1354c40211', 'Ouedraogo', 'Issa', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'd290f1ee-6c54-4b01-90e6-d701748f0861', 'd290f1ee-6c54-4b01-90e6-d701748f0881', 'reader', 'AB12CD34', 'EF56GH78', FALSE, NULL, NULL),
-- ('92b9f3a8-1251-45a3-9c83-3d1365d50322', 'Kaboré', 'Aminata', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'd290f1ee-6c54-4b01-90e6-d701748f0862', 'd290f1ee-6c54-4b01-90e6-d701748f0881', 'writer', 'ZX98YU76', 'PO54MN32', FALSE, NULL, NULL),
-- ('a3c0a4e9-2362-46b4-ad94-4e1476e60433', 'Admin', 'Super', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'd290f1ee-6c54-4b01-90e6-d701748f0861', 'd290f1ee-6c54-4b01-90e6-d701748f0881', 'admin', 'AA11BB22', 'CC33DD44', TRUE, '2024-01-01T00:00:00Z', '2025-01-01T00:00:00Z');

-- ## Indexes pour Optimisation

-- Requêtes fréquentes
CREATE INDEX idx_sujets_module ON sujets(module_id);
CREATE INDEX idx_sujets_universite ON sujets(universite_id);
CREATE INDEX idx_sujets_faculte_niveau ON sujets(faculte_id, niveau_id);

CREATE INDEX idx_livres_module ON livres(module_id);
CREATE INDEX idx_drives_faculte_niveau ON drives(faculte_id, niveau_id);

CREATE INDEX idx_module_faculte_niveau_composite ON module_faculte_niveau(module_id, faculte_id, niveau_id);

CREATE INDEX idx_profiles_ufs ON profiles(universite_id, faculte_id, niveau_id);