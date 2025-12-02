-- Challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  creator_id uuid NOT NULL REFERENCES auth.users(id),
  subject_id bigint REFERENCES public.sujets(id),
  code character varying(6) NOT NULL UNIQUE,
  status character varying NOT NULL DEFAULT 'waiting', -- waiting, active, completed
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT challenges_pkey PRIMARY KEY (id)
);

-- Participants table
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  score integer DEFAULT 0,
  status character varying DEFAULT 'joined', -- joined, playing, finished
  joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT challenge_participants_pkey PRIMARY KEY (id),
  CONSTRAINT unique_challenge_participant UNIQUE (challenge_id, user_id)
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenges_code ON public.challenges(code);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON public.challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id ON public.challenge_participants(user_id);

-- RLS Policies
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Challenges Policies
CREATE POLICY "Anyone can view challenges" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator can update challenge status" ON public.challenges FOR UPDATE USING (auth.uid() = creator_id);

-- Participants Policies
CREATE POLICY "Anyone can view participants" ON public.challenge_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join challenges" ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own status/score" ON public.challenge_participants FOR UPDATE USING (auth.uid() = user_id);
