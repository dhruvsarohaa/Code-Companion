
CREATE TYPE public.solution_platform AS ENUM ('codechef','leetcode','geeksforgeeks','code360','codeforces');
CREATE TYPE public.solution_status AS ENUM ('draft','submitted','accepted','manually_verified');
CREATE TYPE public.verification_state AS ENUM ('not_required','manual_required','pending','verified','failed');
CREATE TYPE public.export_state AS ENUM ('not_exported','queued','in_progress','exported','failed');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  github_username text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, github_username)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.github_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installation_id bigint NOT NULL,
  account_login text,
  selected_repository_id bigint,
  selected_repository_full_name text,
  default_branch text NOT NULL DEFAULT 'main',
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_installations TO authenticated;
GRANT ALL ON public.github_installations TO service_role;
ALTER TABLE public.github_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own installation" ON public.github_installations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER gh_inst_updated_at BEFORE UPDATE ON public.github_installations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.solutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.solution_platform NOT NULL,
  problem_title text NOT NULL,
  problem_slug text NOT NULL,
  problem_url text,
  language text NOT NULL DEFAULT 'cpp',
  tags text[] NOT NULL DEFAULT '{}',
  code text NOT NULL DEFAULT '',
  submission_url text,
  status public.solution_status NOT NULL DEFAULT 'draft',
  verification public.verification_state NOT NULL DEFAULT 'manual_required',
  verification_note text,
  verified_at timestamptz,
  export_status public.export_state NOT NULL DEFAULT 'not_exported',
  last_exported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solutions TO authenticated;
GRANT ALL ON public.solutions TO service_role;
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own solutions" ON public.solutions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER solutions_updated_at BEFORE UPDATE ON public.solutions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX solutions_user_created_idx ON public.solutions (user_id, created_at DESC);

CREATE TABLE public.exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  solution_id uuid NOT NULL REFERENCES public.solutions(id) ON DELETE CASCADE,
  repository_full_name text,
  branch text NOT NULL DEFAULT 'main',
  commit_sha text,
  commit_url text,
  code_path text,
  readme_path text,
  state public.export_state NOT NULL DEFAULT 'queued',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exports TO authenticated;
GRANT ALL ON public.exports TO service_role;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exports" ON public.exports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER exports_updated_at BEFORE UPDATE ON public.exports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX exports_solution_idx ON public.exports (solution_id, created_at DESC);
