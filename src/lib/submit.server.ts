import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI } from "@google/genai";
import { Octokit } from "octokit";
import fs from "node:fs";
import path from "node:path";

function getEnvVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
      if (match) return match[1].trim();
    }
  } catch {}
  return undefined;
}

export const submitSolution = createServerFn({ method: "POST" })
  .validator(
    (data: {
      platform?: string;
      platforms?: string[];
      problemName: string;
      language: string;
      code: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { problemName, language, code } = data;

    const targetPlatforms =
      data.platforms && data.platforms.length > 0
        ? data.platforms
        : data.platform
          ? [data.platform]
          : [];

    if (targetPlatforms.length === 0) {
      throw new Error("No platform specified.");
    }

    const GITHUB_PAT = getEnvVar("GITHUB_PAT");
    const GEMINI_API_KEY = getEnvVar("GEMINI_API_KEY");

    if (!GITHUB_PAT || !GEMINI_API_KEY) {
      throw new Error(
        "Missing environment variables. Please check GITHUB_PAT and GEMINI_API_KEY in .env.",
      );
    }

    const platformRepoMap = new Map<string, { owner: string; repo: string }>();
    for (const p of targetPlatforms) {
      const specificRepoVar = `GITHUB_REPO_${p.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
      const repoSlug = getEnvVar(specificRepoVar) || getEnvVar("GITHUB_REPO");
      if (!repoSlug) {
        throw new Error(
          `Missing repository configuration for platform '${p}'. Please check ${specificRepoVar} in .env.`,
        );
      }
      const [owner, repo] = repoSlug.split("/");
      if (!owner || !repo) {
        throw new Error(
          `Invalid repository format '${repoSlug}' for platform '${p}'. Must be 'owner/repo'.`,
        );
      }
      platformRepoMap.set(p, { owner, repo });
    }

    // Call Gemini API ONCE for all target platforms
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    let readmeContent = "";
    try {
      const platformDisplay =
        targetPlatforms.length === 1 ? targetPlatforms[0] : targetPlatforms.join(", ");
      const prompt = `You are a competitive programming assistant. I am providing you a solution to a problem.
Platform: ${platformDisplay}
Problem Name: ${problemName}
Language: ${language}

Code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Write a comprehensive README.md file explaining the approach, time complexity, and space complexity for this solution. Output ONLY the raw markdown content without any wrapper code blocks like \`\`\`markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
      });

      readmeContent = response.text || "";
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      throw new Error(`Gemini error: ${err?.message ?? String(err)}`);
    }

    const octokit = new Octokit({ auth: GITHUB_PAT });
    const problemSlug = problemName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const folderPath = `${problemSlug}`;
    const fileExtensionMap: Record<string, string> = {
      "C++": "cpp",
      Python: "py",
      Java: "java",
      JavaScript: "js",
      TypeScript: "ts",
      C: "c",
      "C#": "cs",
      Go: "go",
      Rust: "rs",
      Ruby: "rb",
    };

    const ext = fileExtensionMap[language] || "txt";
    const codeFileName = `solution.${ext}`;
    const commitMessage = `Add solution for ${problemName}`;

    interface CommitResult {
      platform: string;
      success: boolean;
      commitUrl?: string;
      error?: string;
    }

    const results: CommitResult[] = [];

    // Commit to each target platform repo — 3 separate commits per platform
    for (const p of targetPlatforms) {
      const { owner, repo } = platformRepoMap.get(p)!;

      try {
        const repoInfo = await octokit.rest.repos.get({ owner, repo });
        const defaultBranch = repoInfo.data.default_branch || "main";

        // Get the latest commit SHA to chain off of
        const ref = await octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${defaultBranch}`,
        });
        let currentSha = ref.data.object.sha;

        // Helper: make one commit with one file and return the new SHA
        async function makeCommit(filePath: string, content: string, message: string) {
          const parentCommit = await octokit.rest.git.getCommit({
            owner,
            repo,
            commit_sha: currentSha,
          });

          const blob = await octokit.rest.git.createBlob({
            owner,
            repo,
            content,
            encoding: "utf-8",
          });

          const newTree = await octokit.rest.git.createTree({
            owner,
            repo,
            base_tree: parentCommit.data.tree.sha,
            tree: [
              {
                path: filePath,
                mode: "100644",
                type: "blob",
                sha: blob.data.sha,
              },
            ],
          });

          const newCommit = await octokit.rest.git.createCommit({
            owner,
            repo,
            message,
            tree: newTree.data.sha,
            parents: [currentSha],
          });

          await octokit.rest.git.updateRef({
            owner,
            repo,
            ref: `heads/${defaultBranch}`,
            sha: newCommit.data.sha,
          });

          currentSha = newCommit.data.sha;
          return newCommit.data.html_url;
        }

        // Commit 1: Create folder with .gitkeep
        await makeCommit(
          `${folderPath}/.gitkeep`,
          "",
          `Create folder for ${problemName}`
        );

        // Commit 2: Add README.md
        await makeCommit(
          `${folderPath}/README.md`,
          readmeContent,
          `Add README for ${problemName}`
        );

        // Commit 3: Add solution code
        const lastCommitUrl = await makeCommit(
          `${folderPath}/${codeFileName}`,
          code,
          `Add ${language} solution for ${problemName}`
        );

        results.push({
          platform: p,
          success: true,
          commitUrl: lastCommitUrl,
        });
      } catch (err: any) {
        console.error(`Error committing to ${p} (${owner}/${repo}):`, err);
        results.push({
          platform: p,
          success: false,
          error: err?.message || String(err),
        });
      }
    }

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (successful.length === 0) {
      const errorDetails = failed.map((f) => `${f.platform}: ${f.error}`).join("; ");
      throw new Error(`Failed to commit to GitHub: ${errorDetails}`);
    }

    return {
      success: true,
      message: `Successfully pushed to ${successful.map((s) => s.platform).join(", ")}!`,
      commitUrl: successful[0]?.commitUrl,
      results,
    };
  });
