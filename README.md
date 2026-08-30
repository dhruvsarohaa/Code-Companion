# Solution Vault

Solution Vault stores competitive-programming solution metadata and exports a source file plus a metadata-only `README.md` to one selected GitHub repository.

## Security and verification

- Authentication is handled by Supabase. All solution and export database access is scoped by RLS and by the server function's authenticated user ID.
- LeetCode, GeeksforGeeks, Code360, and CodeChef use manual-link verification only. The app validates an HTTPS URL on the selected platform, then records a signed-in user's manual attestation. It never logs in, scrapes submissions, stores platform passwords, or reports a programmatic acceptance result.
- GitHub OAuth tokens are encrypted with AES-GCM before being written to the server-only `github_connections` table. GitHub App keys, OAuth client secrets, and installation tokens never enter the browser bundle.
- The OAuth and App-install flows use short-lived, single-use state values tied to the signed-in user. The install callback checks that the installation is listed for that user's GitHub OAuth token before it is persisted.

## GitHub App configuration

Create a GitHub App with:

- **Repository permissions:** Contents — Read and write; Metadata — Read-only.
- **User authorization callback URL:** `https://<your-production-domain>/github/callback`
- **Setup URL:** `https://<your-production-domain>/github/setup`
- **Where can this GitHub App be installed?** Any account is acceptable, but users must select **Only select repositories** and choose exactly their solutions repository during installation.

The callback URL and setup URL are intentionally separate. Set `APP_BASE_URL` to the deployment's real HTTPS origin (no trailing slash); the application does not hardcode localhost or guess a production domain.

## Required server environment variables

Keep these server-only. Do not prefix any of them with `VITE_`.

```text
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GITHUB_APP_ID=
GITHUB_APP_SLUG=
GITHUB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_TOKEN_ENCRYPTION_KEY=<base64url encoded random 32-byte key>
APP_BASE_URL=https://<your-production-domain>
```

Generate `GITHUB_TOKEN_ENCRYPTION_KEY` with a cryptographically secure random 32-byte value and base64url encode it. `GITHUB_APP_PRIVATE_KEY` is also accepted temporarily for compatibility, but `GITHUB_PRIVATE_KEY` is the documented name.

## Install and select flow

1. The user signs into Solution Vault and clicks **Connect GitHub**.
2. GitHub OAuth returns to `/github/callback`; the server exchanges the code and stores only an encrypted server-side OAuth token and GitHub account identity.
3. The user clicks **Install GitHub App**, selects exactly one repository in GitHub, and GitHub redirects to `/github/setup`.
4. The server validates state, confirms that the installation belongs to the connected GitHub account, retrieves only repositories granted to the App, and lets the user select one of them.
5. An export obtains a short-lived installation token server-side, validates repository access, and writes `platform/problem-slug/solution.ext` plus `README.md` in one commit. If both files are unchanged, no commit is created.

## Local validation

```sh
pnpm install
pnpm test
pnpm lint
pnpm build
```

Run the Supabase migration in `supabase/migrations/20260830110000_secure_github_app_and_solution_metadata.sql` before enabling the GitHub flow.

An end-to-end GitHub export requires a real GitHub App, server secrets, and a dedicated test repository. This repository intentionally contains none of those credentials, so no external GitHub export has been claimed or performed.
