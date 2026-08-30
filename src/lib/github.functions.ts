import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  buildReadme,
  exportPaths,
  isSupportedPlatform,
  slugify,
  validatePlatformUrl,
} from "@/lib/solution-vault";

const stateSchema = z.string().regex(/^[A-Za-z0-9_-]{32,200}$/);
const safeRedirectPath = z
  .string()
  .regex(/^\/(?:settings)?$/)
  .default("/settings");
const solutionInput = z.object({
  platform: z.enum(["leetcode", "geeksforgeeks", "code360", "codechef"]),
  title: z.string().trim().min(1).max(200),
  problemUrl: z.string().trim().url().max(2000),
  language: z.string().trim().min(1).max(32),
  tags: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
  code: z.string().min(1).max(500_000),
  submissionUrl: z.string().trim().url().max(2000).optional(),
  difficulty: z.string().trim().max(64).optional(),
  approach: z.string().trim().max(10_000).optional(),
  timeComplexity: z.string().trim().max(200).optional(),
  spaceComplexity: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(10_000).optional(),
});

function opaqueState() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createState(
  supabase: SupabaseClient<Database>,
  userId: string,
  purpose: "oauth" | "installation",
) {
  const state = opaqueState();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const { error } = await supabase
    .from("github_oauth_states")
    .insert({ state, user_id: userId, purpose, expires_at: expiresAt });
  if (error) throw new Error("Unable to start GitHub authorization. Please retry.");
  return state;
}

async function consumeState(
  supabase: SupabaseClient<Database>,
  userId: string,
  state: string,
  purpose: "oauth" | "installation",
) {
  const { data, error } = await supabase
    .from("github_oauth_states")
    .select("state, expires_at")
    .eq("state", state)
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .maybeSingle();
  if (error || !data || new Date(data.expires_at).getTime() < Date.now())
    throw new Error("GitHub authorization has expired or is invalid. Start again from Settings.");
  await supabase.from("github_oauth_states").delete().eq("state", state).eq("user_id", userId);
}

async function serverGithubConnection(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("github_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error("Connect your GitHub account first.");
  const { decryptOAuthToken } = await import("@/lib/github-app.server");
  return { connection: data, accessToken: await decryptOAuthToken(data.encrypted_access_token) };
}

/** Create a solution through the server so untrusted clients cannot assign a verified state. */
export const createSolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => solutionInput.parse(input))
  .handler(async ({ data, context }) => {
    const problemUrlError = validatePlatformUrl(data.platform, data.problemUrl, "Problem URL");
    if (problemUrlError) throw new Error(problemUrlError);
    if (data.submissionUrl) {
      const submissionUrlError = validatePlatformUrl(
        data.platform,
        data.submissionUrl,
        "Submission URL",
      );
      if (submissionUrlError) throw new Error(submissionUrlError);
    }
    const { data: solution, error } = await context.supabase
      .from("solutions")
      .insert({
        user_id: context.userId,
        platform: data.platform,
        problem_title: data.title,
        problem_slug: slugify(data.title),
        problem_url: data.problemUrl,
        language: data.language,
        tags: data.tags,
        code: data.code,
        submission_url: data.submissionUrl ?? null,
        difficulty: data.difficulty ?? null,
        approach: data.approach ?? null,
        time_complexity: data.timeComplexity ?? null,
        space_complexity: data.spaceComplexity ?? null,
        notes: data.notes ?? null,
        status: "draft",
        verification: "pending",
        verification_note: "Pending manual verification.",
      })
      .select("id")
      .single();
    if (error || !solution) throw new Error("Could not save this solution.");
    return { id: solution.id };
  });

/** Manual verification checks public URL shape only; acceptance is never scraped or claimed automatically. */
export const verifySolutionManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        solutionId: z.string().uuid(),
        submissionUrl: z.string().trim().url().max(2000),
        attestAccepted: z.literal(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: solution, error } = await context.supabase
      .from("solutions")
      .select("platform")
      .eq("id", data.solutionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !solution || !isSupportedPlatform(solution.platform))
      throw new Error("Solution not found.");
    const urlError = validatePlatformUrl(solution.platform, data.submissionUrl, "Submission URL");
    if (urlError) throw new Error(urlError);
    const { error: updateError } = await context.supabase
      .from("solutions")
      .update({
        submission_url: data.submissionUrl,
        verification: "verified",
        verified_at: new Date().toISOString(),
        verification_note:
          "Manually verified by the signed-in user; Solution Vault did not scrape or programmatically validate the submission.",
        status: "manually_verified",
      })
      .eq("id", data.solutionId)
      .eq("user_id", context.userId);
    if (updateError) throw new Error("Could not record manual verification.");
    return { ok: true as const };
  });

export const beginGitHubAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ redirectPath: safeRedirectPath }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { requireGitHubAppConfig } = await import("@/lib/github-app.server");
    const config = requireGitHubAppConfig();
    const state = await createState(context.supabase, context.userId, "oauth");
    return {
      ok: true as const,
      authorizationUrl: `https://github.com/login/oauth/authorize?${new URLSearchParams({ client_id: config.clientId, redirect_uri: `${config.appBaseUrl}/github/callback`, state, scope: "read:user" })}`,
      redirectPath: data.redirectPath,
    };
  });

export const completeGitHubAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().min(1).max(500), state: stateSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await consumeState(context.supabase, context.userId, data.state, "oauth");
    const { encryptOAuthToken, exchangeOAuthCode, getGitHubUser } =
      await import("@/lib/github-app.server");
    const accessToken = await exchangeOAuthCode(data.code);
    const githubUser = await getGitHubUser(accessToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("github_connections").upsert({
      user_id: context.userId,
      github_user_id: githubUser.id,
      github_login: githubUser.login,
      encrypted_access_token: await encryptOAuthToken(accessToken),
    });
    if (error) throw new Error("Could not save the server-side GitHub connection.");
    await context.supabase
      .from("profiles")
      .update({ github_username: githubUser.login })
      .eq("id", context.userId);
    return { ok: true as const, login: githubUser.login };
  });

/** Starts the GitHub App installation after user OAuth is connected. */
export const beginGithubAppInstallation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ redirectPath: safeRedirectPath }).parse(input ?? {}),
  )
  .handler(async ({ context }) => {
    const { requireGitHubAppConfig } = await import("@/lib/github-app.server");
    await serverGithubConnection(context.userId);
    const config = requireGitHubAppConfig();
    const state = await createState(context.supabase, context.userId, "installation");
    return {
      ok: true as const,
      installUrl: `https://github.com/apps/${config.appSlug}/installations/new?state=${encodeURIComponent(state)}`,
    };
  });

/** Validates callback state, OAuth ownership, and installation access before exposing repository names. */
export const completeGithubAppInstallation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ installationId: z.coerce.number().int().positive(), state: stateSchema })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await consumeState(context.supabase, context.userId, data.state, "installation");
    const { connection, accessToken } = await serverGithubConnection(context.userId);
    const { getInstallation, getUserInstallations, listInstallationRepositories } =
      await import("@/lib/github-app.server");
    const accessible = await getUserInstallations(accessToken);
    if (!accessible.has(data.installationId))
      throw new Error(
        "This GitHub App installation does not belong to the connected GitHub account.",
      );
    const installation = await getInstallation(data.installationId);
    const repositories = await listInstallationRepositories(data.installationId);
    if (!repositories.length)
      throw new Error(
        "The GitHub App installation has no selected repositories. Install it on exactly one solutions repository.",
      );
    const { error } = await context.supabase.from("github_installations").upsert(
      {
        user_id: context.userId,
        installation_id: data.installationId,
        account_login: installation.account.login,
        selected_repository_id: null,
        selected_repository_full_name: null,
        default_branch: "main",
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("Could not save the GitHub App installation.");
    return { ok: true as const, githubLogin: connection.github_login, repositories };
  });

export const selectGithubRepository = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ repositoryId: z.coerce.number().int().positive() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: installation } = await context.supabase
      .from("github_installations")
      .select("installation_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!installation) throw new Error("Install the GitHub App before selecting a repository.");
    const { listInstallationRepositories } = await import("@/lib/github-app.server");
    const repository = (
      await listInstallationRepositories(Number(installation.installation_id))
    ).find((item) => item.id === data.repositoryId);
    if (!repository)
      throw new Error("That repository is not available to this GitHub App installation.");
    const { error } = await context.supabase
      .from("github_installations")
      .update({
        selected_repository_id: repository.id,
        selected_repository_full_name: repository.fullName,
        default_branch: repository.defaultBranch,
      })
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not save the selected repository.");
    return { ok: true as const, repository };
  });

export const getGithubConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: connection } = await supabaseAdmin
      .from("github_connections")
      .select("github_login")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { data: installation } = await context.supabase
      .from("github_installations")
      .select(
        "installation_id, selected_repository_id, selected_repository_full_name, default_branch",
      )
      .eq("user_id", context.userId)
      .maybeSingle();
    return { githubLogin: connection?.github_login ?? null, installation: installation ?? null };
  });

/** Exports two deterministic files in one commit only after manual verification. */
export const exportSolutionToGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ solutionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: solution, error: solutionError } = await context.supabase
      .from("solutions")
      .select("*")
      .eq("id", data.solutionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (solutionError || !solution) throw new Error("Solution not found.");
    if (!isSupportedPlatform(solution.platform))
      throw new Error("This legacy platform cannot be exported.");
    if (solution.verification !== "verified")
      throw new Error("Verify the public submission manually before exporting this solution.");
    const { data: installation } = await context.supabase
      .from("github_installations")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (
      !installation?.installation_id ||
      !installation.selected_repository_full_name ||
      !installation.selected_repository_id
    ) {
      return {
        ok: false as const,
        reason: "no_repository" as const,
        message:
          "Connect GitHub, install the App, and select its single solutions repository first.",
      };
    }
    const slug = slugify(solution.problem_slug || solution.problem_title);
    const { codePath, readmePath } = exportPaths({
      platform: solution.platform,
      slug,
      language: solution.language,
    });
    const readme = buildReadme({
      title: solution.problem_title,
      platform: solution.platform,
      problemUrl: solution.problem_url,
      language: solution.language,
      tags: solution.tags ?? [],
      status: solution.status,
      verification: solution.verification,
      submissionUrl: solution.submission_url,
      difficulty: solution.difficulty,
      approach: solution.approach,
      timeComplexity: solution.time_complexity,
      spaceComplexity: solution.space_complexity,
      notes: solution.notes,
    });
    const { data: exportRow, error: exportError } = await context.supabase
      .from("exports")
      .insert({
        user_id: context.userId,
        solution_id: solution.id,
        repository_full_name: installation.selected_repository_full_name,
        branch: installation.default_branch,
        code_path: codePath,
        readme_path: readmePath,
        state: "in_progress",
      })
      .select("id")
      .single();
    if (exportError || !exportRow) throw new Error("Could not start the GitHub export.");
    try {
      const { commitFilesInSingleCommit } = await import("@/lib/github-app.server");
      const commit = await commitFilesInSingleCommit({
        installationId: Number(installation.installation_id),
        repositoryFullName: installation.selected_repository_full_name,
        branch: installation.default_branch,
        message: `Add ${solution.problem_title} (${solution.platform})`,
        files: [
          { path: codePath, content: solution.code },
          { path: readmePath, content: readme },
        ],
      });
      await context.supabase
        .from("exports")
        .update({ state: "exported", commit_sha: commit.commitSha, commit_url: commit.commitUrl })
        .eq("id", exportRow.id)
        .eq("user_id", context.userId);
      await context.supabase
        .from("solutions")
        .update({ export_status: "exported", last_exported_at: new Date().toISOString() })
        .eq("id", solution.id)
        .eq("user_id", context.userId);
      return { ok: true as const, ...commit, codePath, readmePath };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      await context.supabase
        .from("exports")
        .update({ state: "failed", error_message: message.slice(0, 1000) })
        .eq("id", exportRow.id)
        .eq("user_id", context.userId);
      await context.supabase
        .from("solutions")
        .update({ export_status: "failed" })
        .eq("id", solution.id)
        .eq("user_id", context.userId);
      return { ok: false as const, reason: "github_error" as const, message };
    }
  });
