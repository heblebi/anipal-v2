CREATE TABLE IF NOT EXISTS public.episode_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id text NOT NULL,
  episode_number integer NOT NULL,
  episode_title text NOT NULL DEFAULT '',
  thumbnail text DEFAULT '',
  fansub_name text NOT NULL DEFAULT '',
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  pending_action text CHECK (pending_action IN ('edit', 'delete')),
  pending_data jsonb,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.episode_contributions ENABLE ROW LEVEL SECURITY;

-- Contributors see only their own rows
CREATE POLICY "contributors_select_own" ON public.episode_contributions
  FOR SELECT USING (submitted_by = auth.uid());

-- Admins and mods see all rows
CREATE POLICY "admins_select_all" ON public.episode_contributions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Authenticated users can insert their own rows
CREATE POLICY "contributors_insert" ON public.episode_contributions
  FOR INSERT WITH CHECK (submitted_by = auth.uid() AND auth.uid() IS NOT NULL);

-- Contributors can update their own rows (to submit edit/delete requests)
CREATE POLICY "contributors_update_own" ON public.episode_contributions
  FOR UPDATE USING (submitted_by = auth.uid());

-- Admins can update any row (approve/reject)
CREATE POLICY "admins_update_all" ON public.episode_contributions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Admins can delete any row
CREATE POLICY "admins_delete" ON public.episode_contributions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );
