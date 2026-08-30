-- GitHub OAuth credentials are encrypted before storage and have no browser role grants.
CREATE TABLE public.github_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_user_id bigint NOT NULL,
  github_login text NOT NULL,
  encrypted_access_token text NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.github_connections TO service_role;
CREATE TRIGGER github_connections_updated_at BEFORE UPDATE ON public.github_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Opaque short-lived state is tied to the signed-in Solution Vault user.
CREATE TABLE public.github_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('oauth', 'installation')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.github_oauth_states ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.github_oauth_states TO authenticated;
GRANT ALL ON public.github_oauth_states TO service_role;
CREATE POLICY "own github oauth state" ON public.github_oauth_states FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.solutions
  ADD COLUMN difficulty text,
  ADD COLUMN approach text,
  ADD COLUMN time_complexity text,
  ADD COLUMN space_complexity text,
  ADD COLUMN notes text;

-- Preserve the legacy enum value for old records, but no new Codeforces records are allowed.
ALTER TABLE public.solutions
  ADD CONSTRAINT solutions_supported_platform_check
  CHECK (platform IN ('leetcode', 'geeksforgeeks', 'code360', 'codechef')) NOT VALID;
