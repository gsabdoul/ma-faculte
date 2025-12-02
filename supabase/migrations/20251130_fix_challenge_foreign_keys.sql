-- Fix foreign key relationship to use profiles table instead of auth.users
-- This allows Supabase PostgREST to perform joins

-- Drop existing foreign key constraints that reference auth.users
ALTER TABLE public.challenge_participants 
DROP CONSTRAINT IF EXISTS challenge_participants_user_id_fkey;

ALTER TABLE public.challenges 
DROP CONSTRAINT IF EXISTS challenges_creator_id_fkey;

-- Add new foreign key constraints that reference profiles table
ALTER TABLE public.challenge_participants 
ADD CONSTRAINT challenge_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.challenges 
ADD CONSTRAINT challenges_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
