-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.challenge_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  challenge_id uuid NOT NULL,
  user_id uuid NOT NULL,
  score integer DEFAULT 0,
  status character varying DEFAULT 'joined'::character varying,
  joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT challenge_participants_pkey PRIMARY KEY (id),
  CONSTRAINT challenge_participants_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id),
  CONSTRAINT challenge_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.challenges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  creator_id uuid NOT NULL,
  subject_id uuid,
  code character varying NOT NULL UNIQUE,
  status character varying NOT NULL DEFAULT 'waiting'::character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  questions jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT challenges_pkey PRIMARY KEY (id),
  CONSTRAINT challenges_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES auth.users(id),
  CONSTRAINT challenges_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.sujets(id)
);
CREATE TABLE public.conversations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  title text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sujet_id uuid,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT conversations_sujet_id_fkey FOREIGN KEY (sujet_id) REFERENCES public.sujets(id)
);
CREATE TABLE public.document_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sujet_id uuid,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  source_id uuid,
  embedding USER-DEFINED,
  livre_id uuid,
  CONSTRAINT document_chunks_pkey PRIMARY KEY (id),
  CONSTRAINT document_chunks_sujet_id_fkey FOREIGN KEY (sujet_id) REFERENCES public.sujets(id),
  CONSTRAINT document_chunks_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.knowledge_sources(id),
  CONSTRAINT document_chunks_livre_id_fkey FOREIGN KEY (livre_id) REFERENCES public.livres(id)
);
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
CREATE TABLE public.knowledge_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type = ANY (ARRAY['text'::text, 'pdf'::text, 'url'::text, 'markdown'::text])),
  content text,
  file_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_sources_pkey PRIMARY KEY (id)
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
CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  content text CHECK (char_length(content) > 0),
  is_ai boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  conversation_id bigint,
  attachments jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
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
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.options (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  content text,
  is_correct boolean DEFAULT false,
  question_id bigint,
  CONSTRAINT options_pkey PRIMARY KEY (id),
  CONSTRAINT options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.playlist_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  playlist_id uuid NOT NULL,
  question_id bigint NOT NULL,
  added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT playlist_questions_pkey PRIMARY KEY (id),
  CONSTRAINT playlist_questions_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id),
  CONSTRAINT playlist_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.playlists (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  nom character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT playlists_pkey PRIMARY KEY (id),
  CONSTRAINT playlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
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
  profil_url text DEFAULT 'https://qbrpefuxlzgtrntxdtwk.supabase.co/storage/v1/object/public/images/user/utilisateur.png'::text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_universite_id_fkey FOREIGN KEY (universite_id) REFERENCES public.universites(id),
  CONSTRAINT profiles_faculte_id_fkey FOREIGN KEY (faculte_id) REFERENCES public.facultes(id),
  CONSTRAINT profiles_niveau_id_fkey FOREIGN KEY (niveau_id) REFERENCES public.niveaux(id)
);
CREATE TABLE public.questions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  sujet_id uuid,
  content text,
  type text CHECK (type = ANY (ARRAY['qcm'::text, 'qroc'::text, 'cas_clinique'::text])),
  points numeric DEFAULT 1,
  parent_id bigint,
  explanation text,
  image_url text,
  numero numeric,
  expected_answer text,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT questions_sujet_id_fkey FOREIGN KEY (sujet_id) REFERENCES public.sujets(id),
  CONSTRAINT questions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.questions(id)
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
  CONSTRAINT signalements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.sujets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  titre character varying NOT NULL,
  module_id uuid NOT NULL,
  universite_id uuid NOT NULL,
  annee numeric,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  correction text,
  faculte_id uuid,
  niveau_id uuid,
  CONSTRAINT sujets_pkey PRIMARY KEY (id),
  CONSTRAINT sujets_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id),
  CONSTRAINT sujets_universite_id_fkey FOREIGN KEY (universite_id) REFERENCES public.universites(id),
  CONSTRAINT sujets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT sujets_faculte_id_fkey FOREIGN KEY (faculte_id) REFERENCES public.facultes(id),
  CONSTRAINT sujets_niveau_id_fkey FOREIGN KEY (niveau_id) REFERENCES public.niveaux(id)
);
CREATE TABLE public.universites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nom character varying NOT NULL,
  logo_url text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT universites_pkey PRIMARY KEY (id)
);