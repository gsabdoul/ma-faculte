ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS questions jsonb DEFAULT '[]'::jsonb;
