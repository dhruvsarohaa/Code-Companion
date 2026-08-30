/** Server-only GitHub App client. No GitHub credential crosses this boundary. */

const GITHUB_API = "https://api.github.com";

export type GitHubAppConfig = {
  appId: string;
  privateKey: string;
  appSlug: string;
  clientId: string;
  clientSecret: string;
  appBaseUrl: string;
  tokenEncryptionKey: string;
};

export type GitHubRepository = {
  id: number;
  fullName: string;
  defaultBranch: string;
  private: boolean;
};

export class GitHubConfigurationError extends Error {
  constructor(message = "GitHub App is not configured on the server.") {
    super(message);
    this.name = "GitHubConfigurationError";
  }
}

export class GitHubServiceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GitHubServiceError";
  }
}

export function readGitHubAppConfig(): GitHubAppConfig | null {
  const appId = process.env["GITHUB_APP_ID"];
  const privateKey = process.env["GITHUB_PRIVATE_KEY"] ?? process.env["GITHUB_APP_PRIVATE_KEY"];
  const appSlug = process.env["GITHUB_APP_SLUG"];
  const clientId = process.env["GITHUB_CLIENT_ID"];
  const clientSecret = process.env["GITHUB_CLIENT_SECRET"];
  const appBaseUrl = process.env["APP_BASE_URL"]?.replace(/\/$/, "");
  const tokenEncryptionKey = process.env["GITHUB_TOKEN_ENCRYPTION_KEY"];
  if (
    !appId ||
    !privateKey ||
    !appSlug ||
    !clientId ||
    !clientSecret ||
    !appBaseUrl ||
    !tokenEncryptionKey
  )
    return null;
  return { appId, privateKey, appSlug, clientId, clientSecret, appBaseUrl, tokenEncryptionKey };
}

export function requireGitHubAppConfig(): GitHubAppConfig {
  const config = readGitHubAppConfig();
  if (!config) {
    throw new GitHubConfigurationError(
      "GitHub is not configured. Add the server-side GitHub App, OAuth, application URL, and token-encryption secrets.",
    );
  }
  return config;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function utf8(value: string) {
  return new TextEncoder().encode(value);
}

function decodePem(pem: string) {
  const content = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(content);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function appJwt() {
  const config = requireGitHubAppConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(utf8(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64Url(
    utf8(JSON.stringify({ iat: now - 30, exp: now + 540, iss: config.appId })),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    decodePem(config.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    utf8(`${header}.${payload}`),
  );
  return `${header}.${payload}.${base64Url(new Uint8Array(signature))}`;
}

async function githubFetch(path: string, init: RequestInit, token: string) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    const message =
      response.status === 401 || response.status === 403
        ? "GitHub denied this operation. Check the App installation and its Contents permission."
        : response.status === 404
          ? "The selected repository or GitHub installation is no longer accessible."
          : `GitHub request failed${payload?.message ? `: ${payload.message}` : ""}`;
    throw new GitHubServiceError(message, response.status);
  }
  return response;
}

async function appFetch(path: string, init: RequestInit = {}) {
  return githubFetch(path, init, await appJwt());
}

export async function createInstallationToken(installationId: number): Promise<string> {
  const response = await appFetch(`/app/installations/${installationId}/access_tokens`, {
    method: "POST",
  });
  const payload = (await response.json()) as { token?: string };
  if (!payload.token) throw new GitHubServiceError("GitHub did not return an installation token.");
  return payload.token;
}

export async function getInstallation(installationId: number) {
  const response = await appFetch(`/app/installations/${installationId}`);
  return (await response.json()) as { id: number; account: { login: string; id: number } };
}

export async function getUserInstallations(accessToken: string) {
  const response = await githubFetch("/user/installations", {}, accessToken);
  const payload = (await response.json()) as { installations?: Array<{ id: number }> };
  return new Set((payload.installations ?? []).map((installation) => installation.id));
}

export async function listInstallationRepositories(
  installationId: number,
): Promise<GitHubRepository[]> {
  const token = await createInstallationToken(installationId);
  const response = await githubFetch("/installation/repositories?per_page=100", {}, token);
  const payload = (await response.json()) as {
    repositories?: Array<{
      id: number;
      full_name: string;
      default_branch: string;
      private: boolean;
    }>;
  };
  return (payload.repositories ?? []).map((repository) => ({
    id: repository.id,
    fullName: repository.full_name,
    defaultBranch: repository.default_branch,
    private: repository.private,
  }));
}

export async function getRepository(
  installationId: number,
  repositoryFullName: string,
): Promise<GitHubRepository> {
  assertRepositoryFullName(repositoryFullName);
  const token = await createInstallationToken(installationId);
  const response = await githubFetch(`/repos/${repositoryFullName}`, {}, token);
  const repository = (await response.json()) as {
    id: number;
    full_name: string;
    default_branch: string;
    private: boolean;
  };
  return {
    id: repository.id,
    fullName: repository.full_name,
    defaultBranch: repository.default_branch,
    private: repository.private,
  };
}

export async function exchangeOAuthCode(code: string) {
  const config = requireGitHubAppConfig();
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: `${config.appBaseUrl}/github/callback`,
    }),
  });
  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
    error_description?: string;
  } | null;
  if (!response.ok || !payload?.access_token)
    throw new GitHubServiceError(
      payload?.error_description ?? "GitHub authorization failed.",
      response.status,
    );
  return payload.access_token;
}

export async function getGitHubUser(accessToken: string) {
  const response = await githubFetch("/user", {}, accessToken);
  const user = (await response.json()) as { id: number; login: string };
  return { id: user.id, login: user.login };
}

async function encryptionKey() {
  const encoded = requireGitHubAppConfig().tokenEncryptionKey.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytes.byteLength !== 32)
    throw new GitHubConfigurationError(
      "GITHUB_TOKEN_ENCRYPTION_KEY must be a base64url-encoded 32-byte key.",
    );
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptOAuthToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    utf8(token),
  );
  return `${base64Url(iv)}.${base64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptOAuthToken(value: string) {
  const [iv, ciphertext] = value.split(".");
  if (!iv || !ciphertext)
    throw new GitHubServiceError("Stored GitHub authorization is invalid. Reconnect GitHub.");
  const decode = (part: string) => {
    const binary = atob(
      part
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(part.length / 4) * 4, "="),
    );
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  };
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode(iv) },
      await encryptionKey(),
      decode(ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new GitHubServiceError("Stored GitHub authorization cannot be read. Reconnect GitHub.");
  }
}

export type SingleCommitFile = { path: string; content: string };

export function assertRepositoryFullName(repositoryFullName: string) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repositoryFullName))
    throw new GitHubServiceError("Invalid repository name.");
}

export function assertGitHubPath(path: string) {
  if (
    !path ||
    path.length > 240 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new GitHubServiceError("Invalid export path.");
  }
}

async function currentFileContent(
  token: string,
  repositoryFullName: string,
  branch: string,
  path: string,
) {
  const response = await fetch(
    `${GITHUB_API}/repos/${repositoryFullName}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
    },
  );
  if (response.status === 404) return null;
  if (!response.ok)
    throw new GitHubServiceError(
      "Could not read the existing export from GitHub.",
      response.status,
    );
  const payload = (await response.json()) as { content?: string };
  return payload.content ? atob(payload.content.replace(/\n/g, "")) : null;
}

export async function commitFilesInSingleCommit(input: {
  installationId: number;
  repositoryFullName: string;
  branch: string;
  message: string;
  files: SingleCommitFile[];
}): Promise<{ commitSha: string; commitUrl: string; noOp: boolean }> {
  assertRepositoryFullName(input.repositoryFullName);
  input.files.forEach((file) => assertGitHubPath(file.path));
  if (new Set(input.files.map((file) => file.path)).size !== input.files.length)
    throw new GitHubServiceError("Duplicate export paths are not allowed.");
  const token = await createInstallationToken(input.installationId);
  await getRepository(input.installationId, input.repositoryFullName);
  const existing = await Promise.all(
    input.files.map((file) =>
      currentFileContent(token, input.repositoryFullName, input.branch, file.path),
    ),
  );
  const refResponse = await fetch(
    `${GITHUB_API}/repos/${input.repositoryFullName}/git/ref/heads/${encodeURIComponent(input.branch)}`,
    {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
    },
  );
  const ref = refResponse.ok ? ((await refResponse.json()) as { object: { sha: string } }) : null;
  if (refResponse.status !== 404 && !refResponse.ok)
    throw new GitHubServiceError("Could not read the repository branch.", refResponse.status);
  if (existing.every((content, index) => content === input.files[index]?.content) && ref) {
    return {
      commitSha: ref.object.sha,
      commitUrl: `https://github.com/${input.repositoryFullName}/commit/${ref.object.sha}`,
      noOp: true,
    };
  }
  const blobs = await Promise.all(
    input.files.map(async (file) => {
      const response = await githubFetch(
        `/repos/${input.repositoryFullName}/git/blobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
        },
        token,
      );
      return (await response.json()) as { sha: string };
    }),
  );
  const treeResponse = await githubFetch(
    `/repos/${input.repositoryFullName}/git/trees`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(ref ? { base_tree: ref.object.sha } : {}),
        tree: input.files.map((file, index) => ({
          path: file.path,
          mode: "100644",
          type: "blob",
          sha: blobs[index]?.sha,
        })),
      }),
    },
    token,
  );
  const tree = (await treeResponse.json()) as { sha: string };
  const commitResponse = await githubFetch(
    `/repos/${input.repositoryFullName}/git/commits`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input.message.slice(0, 240),
        tree: tree.sha,
        ...(ref ? { parents: [ref.object.sha] } : {}),
      }),
    },
    token,
  );
  const commit = (await commitResponse.json()) as { sha: string; html_url?: string };
  if (ref) {
    await githubFetch(
      `/repos/${input.repositoryFullName}/git/refs/heads/${encodeURIComponent(input.branch)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha: commit.sha, force: false }),
      },
      token,
    );
  } else {
    await githubFetch(
      `/repos/${input.repositoryFullName}/git/refs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: `refs/heads/${input.branch}`, sha: commit.sha }),
      },
      token,
    );
  }
  return {
    commitSha: commit.sha,
    commitUrl:
      commit.html_url ?? `https://github.com/${input.repositoryFullName}/commit/${commit.sha}`,
    noOp: false,
  };
}
