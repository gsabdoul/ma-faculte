-- Migration: Add Playlists Feature
-- Created: 2025-11-30
-- Description: Creates tables and policies for user playlists functionality

-- Table for user playlists
CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  nom character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT playlists_pkey PRIMARY KEY (id),
  CONSTRAINT playlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Junction table for playlist questions
CREATE TABLE IF NOT EXISTS public.playlist_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  playlist_id uuid NOT NULL,
  question_id bigint NOT NULL,
  added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT playlist_questions_pkey PRIMARY KEY (id),
  CONSTRAINT playlist_questions_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE,
  CONSTRAINT playlist_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE,
  CONSTRAINT unique_playlist_question UNIQUE (playlist_id, question_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_questions_playlist_id ON public.playlist_questions(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_questions_question_id ON public.playlist_questions(question_id);

-- Enable Row Level Security
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playlists table
CREATE POLICY "Users can view their own playlists"
  ON public.playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own playlists"
  ON public.playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
  ON public.playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
  ON public.playlists FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for playlist_questions table
CREATE POLICY "Users can view playlist questions for their playlists"
  ON public.playlist_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_questions.playlist_id
    AND playlists.user_id = auth.uid()
  ));

CREATE POLICY "Users can add questions to their playlists"
  ON public.playlist_questions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_questions.playlist_id
    AND playlists.user_id = auth.uid()
  ));

CREATE POLICY "Users can remove questions from their playlists"
  ON public.playlist_questions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_questions.playlist_id
    AND playlists.user_id = auth.uid()
  ));
