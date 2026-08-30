import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI } from "@google/genai";
import { Octokit } from "octokit";

export const submitSolution = createServerFn({ method: "POST" })
  .validator(
    (data: {
      platform: string;
      problemName: string;
      language: string;
      code: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { platform, problemName, language, code } = data;

    const GITHUB_PAT = process.env.GITHUB_PAT;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    const specificRepoVar = `GITHUB_REPO_${platform.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    const repoSlug = process.env[specificRepoVar] || process.env.GITHUB_REPO;

    if (!GITHUB_PAT || !GEMINI_API_KEY || !repoSlug) {
      throw new Error(
        "Missing environment variables. Please check GITHUB_PAT, GEMINI_API_KEY, and GITHUB_REPO.",
      );
    }

    const [owner, repo] = repoSlug.split("/");
    if (!owner || !repo) {
      throw new Error("Invalid GITHUB_REPO format. Must be 'owner/repo'.");
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    let readmeContent = "";
    try {
      const prompt = `You are a competitive programming assistant. I am providing you a solution to a problem.
Platform: ${platform}
Problem Name: ${problemName}
Language: ${language}

Code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Write a comprehensive README.md file explaining the approach, time complexity, and space complexity for this solution. Output ONLY the raw markdown content without any wrapper code blocks like \`\`\`markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      readmeContent = response.text || "";
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      throw new Error(`Gemini error: ${err?.message ?? String(err)}`);
    }

    const octokit = new Octokit({ auth: GITHUB_PAT });

    const problemSlug = problemName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const folderPath = `${problemSlug}`;
    const fileExtensionMap: Record<string, string> = {
      "C++": "cpp",
      "Python": "py",
      "Java": "java",
      "JavaScript": "js",
      "TypeScript": "ts",
      "C": "c",
      "C#": "cs",
      "Go": "go",
      "Rust": "rs",
      "Ruby": "rb"
    };
    
    const ext = fileExtensionMap[language] || "txt";
    const codeFileName = `solution.${ext}`;
    
    const commitMessage = `Add solution for ${problemName}`;
    
    try {
      const repoInfo = await octokit.rest.repos.get({ owner, repo });
      const defaultBranch = repoInfo.data.default_branch;

      const ref = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });
      const latestCommitSha = ref.data.object.sha;

      const latestCommit = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: latestCommitSha,
      });
      const baseTreeSha = latestCommit.data.tree.sha;

      const readmeBlob = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: readmeContent,
        encoding: "utf-8",
      });

      const codeBlob = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: code,
        encoding: "utf-8",
      });

      const newTree = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree: [
          {
            path: `${folderPath}/README.md`,
            mode: "100644",
            type: "blob",
            sha: readmeBlob.data.sha,
          },
          {
            path: `${folderPath}/${codeFileName}`,
            mode: "100644",
            type: "blob",
            sha: codeBlob.data.sha,
          },
        ],
      });

      const newCommit = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: newTree.data.sha,
        parents: [latestCommitSha],
      });

      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
        sha: newCommit.data.sha,
      });
      
      return { success: true, message: "Successfully pushed to GitHub!", commitUrl: newCommit.data.html_url };
    } catch (err) {
      console.error("GitHub API Error:", err);
      throw new Error(`Failed to commit to GitHub: ${(err as any).message}`);
    }
  });
