-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.drives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  titre character varying NOT NULL,
  url text NOT NULL,
  faculte_id uuid NOT NULL,
  niveau_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  description text,
  CONSTRAINT drives_pkey PRIMARY KEY (id),
  CONSTRAINT drives_faculte_id_fkey FOREIGN KEY (faculte_id) REFERENCES public.facultes(id),
  CONSTRAINT drives_niveau_id_fkey FOREIGN KEY (niveau_id) REFERENCES public.niveaux(id),
  CONSTRAINT drives_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.equipe (
  user_id uuid NOT NULL,
  role text CHECK (role = ANY (ARRAY['developpeur'::text, 'designer'::text, 'testeur'::text, 'redacteur'::text])),
  profil_url text DEFAULT 'https://qbrpefuxlzgtrntxdtwk.supabase.co/storage/v1/object/public/images/user/utilisateur.png'::text,
  facebook_url text,
  CONSTRAINT equipe_pkey PRIMARY KEY (user_id),
  CONSTRAINT equipe_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.facultes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nom character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT facultes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.infos_carrousel (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  titre character varying NOT NULL,
  description text,
  image_url text NOT NULL,
  lien text,
  active boolean DEFAULT true,
  ordre integer,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT infos_carrousel_pkey PRIMARY KEY (id)
);
CREATE TABLE public.livres (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  titre character varying NOT NULL,
  module_id uuid NOT NULL,
  couverture_url text,
  fichier_url text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  CONSTRAINT livres_pkey PRIMARY KEY (id),
  CONSTRAINT livres_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id),
  CONSTRAINT livres_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.module_faculte_niveau (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  module_id uuid NOT NULL,
  faculte_id uuid NOT NULL,
  niveau_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT module_faculte_niveau_pkey PRIMARY KEY (id),
  CONSTRAINT module_faculte_niveau_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id),
  CONSTRAINT module_faculte_niveau_faculte_id_fkey FOREIGN KEY (faculte_id) REFERENCES public.facultes(id),
  CONSTRAINT module_faculte_niveau_niveau_id_fkey FOREIGN KEY (niveau_id) REFERENCES public.niveaux(id)
);
CREATE TABLE public.modules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nom character varying NOT NULL,
  description text,
  icone_url text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_free boolean DEFAULT false,
  CONSTRAINT modules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.niveaux (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nom character varying NOT NULL,
  ordre integer,
  faculte_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT niveaux_pkey PRIMARY KEY (id),
  CONSTRAINT niveaux_faculte_id_fkey FOREIGN KEY (faculte_id) REFERENCES public.facultes(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message text NOT NULL,
  lue boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  user_id uuid,
  titre text,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  nom character varying NOT NULL,
  prenom character varying NOT NULL,
  universite_id uuid NOT NULL,
  faculte_id uuid NOT NULL,
  niveau_id uuid NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['admin'::character varying, 'writer'::character varying, 'reader'::character varying]::text[])),
  code character varying NOT NULL UNIQUE,
  active_code character varying NOT NULL UNIQUE,
  is_premium boolean DEFAULT false,
  subscription_start_date timestamp with time zone,
  subscription_end_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_universite_id_fkey FOREIGN KEY (universite_id) REFERENCES public.universites(id),
  CONSTRAINT profiles_faculte_id_fkey FOREIGN KEY (faculte_id) REFERENCES public.facultes(id),
  CONSTRAINT profiles_niveau_id_fkey FOREIGN KEY (niveau_id) REFERENCES public.niveaux(id)
);
CREATE TABLE public.signalements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['sujet'::character varying, 'livre'::character varying]::text[])),
  item_id uuid NOT NULL,
  description text NOT NULL,
  statut character varying DEFAULT 'en_attente'::character varying CHECK (statut::text = ANY (ARRAY['en_attente'::character varying, 'en_cours'::character varying, 'resolu'::character varying, 'rejete'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  admin_comment text,
  CONSTRAINT signalements_pkey PRIMARY KEY (id),
  CONSTRAINT signalements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.sujets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  titre character varying NOT NULL,
  module_id uuid NOT NULL,
  universite_id uuid NOT NULL,
  fichier_url text NOT NULL,
  annee numeric,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  correction text,
  CONSTRAINT sujets_pkey PRIMARY KEY (id),
  CONSTRAINT sujets_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id),
  CONSTRAINT sujets_universite_id_fkey FOREIGN KEY (universite_id) REFERENCES public.universites(id),
  CONSTRAINT sujets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.universites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nom character varying NOT NULL,
  logo_url text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT universites_pkey PRIMARY KEY (id)
);