-- Update foreign key constraint to set subject_id to NULL when a subject is deleted
-- This allows challenges to persist even if their associated subject is removed

-- Drop existing foreign key constraint
ALTER TABLE public.challenges 
DROP CONSTRAINT IF EXISTS challenges_subject_id_fkey;

-- Add new foreign key constraint with ON DELETE SET NULL
ALTER TABLE public.challenges 
ADD CONSTRAINT challenges_subject_id_fkey 
FOREIGN KEY (subject_id) REFERENCES public.sujets(id) ON DELETE SET NULL;
