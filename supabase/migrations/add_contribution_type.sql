-- Add type and target_episode_id columns to episode_contributions
ALTER TABLE public.episode_contributions
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'episode' CHECK (type IN ('episode', 'source')),
  ADD COLUMN IF NOT EXISTS target_episode_id text;
