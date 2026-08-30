// Browser-safe domain model. Platform-specific checking is deliberately local
// and URL-only; it never logs in to, scrapes, or stores credentials for a CP site.

export const PLATFORMS = [
  { value: "leetcode", label: "LeetCode" },
  { value: "geeksforgeeks", label: "GeeksforGeeks" },
  { value: "code360", label: "Code360" },
  { value: "codechef", label: "CodeChef" },
] as const;

export type Platform = (typeof PLATFORMS)[number]["value"];
export const MANUAL_VERIFICATION_PLATFORMS: Platform[] = PLATFORMS.map(
  (platform) => platform.value,
);

export const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "accepted", label: "Accepted" },
  { value: "manually_verified", label: "Manually verified" },
] as const;

export type SolutionStatus = (typeof STATUSES)[number]["value"];

export const LANGUAGES = [
  { value: "cpp", label: "C++", extension: "cpp" },
  { value: "python", label: "Python", extension: "py" },
  { value: "java", label: "Java", extension: "java" },
  { value: "javascript", label: "JavaScript", extension: "js" },
  { value: "typescript", label: "TypeScript", extension: "ts" },
  { value: "go", label: "Go", extension: "go" },
  { value: "rust", label: "Rust", extension: "rs" },
  { value: "kotlin", label: "Kotlin", extension: "kt" },
  { value: "csharp", label: "C#", extension: "cs" },
  { value: "c", label: "C", extension: "c" },
] as const;

export type LanguageValue = (typeof LANGUAGES)[number]["value"];

const PLATFORM_HOSTS: Record<Platform, string[]> = {
  leetcode: ["leetcode.com"],
  geeksforgeeks: ["geeksforgeeks.org"],
  code360: ["naukri.com", "codingninjas.com"],
  codechef: ["codechef.com"],
};

export function platformLabel(value: string) {
  return PLATFORMS.find((platform) => platform.value === value)?.label ?? value;
}

export function statusLabel(value: string) {
  return STATUSES.find((status) => status.value === value)?.label ?? value;
}

export function languageLabel(value: string) {
  return LANGUAGES.find((language) => language.value === value)?.label ?? value;
}

export function extensionFor(language: string) {
  return LANGUAGES.find((item) => item.value === language)?.extension ?? "txt";
}

export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "untitled"
  );
}

export function isSupportedPlatform(value: string): value is Platform {
  return PLATFORMS.some((platform) => platform.value === value);
}

export function validatePlatformUrl(
  platform: Platform,
  value: string,
  label = "URL",
): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return `${label} must use HTTPS.`;
    const hostname = url.hostname.toLowerCase();
    if (
      !PLATFORM_HOSTS[platform].some((host) => hostname === host || hostname.endsWith(`.${host}`))
    ) {
      return `${label} must be a public ${platformLabel(platform)} URL.`;
    }
    return null;
  } catch {
    return `${label} is not a valid URL.`;
  }
}

export function exportPaths(opts: { platform: string; slug: string; language: string }) {
  const safePlatform = isSupportedPlatform(opts.platform) ? opts.platform : "unknown";
  const safeSlug = slugify(opts.slug);
  const base = `${safePlatform}/${safeSlug}`;
  return {
    codePath: `${base}/solution.${extensionFor(opts.language)}`,
    readmePath: `${base}/README.md`,
  };
}

function valueOrNotProvided(value?: string | null) {
  return value?.trim() || "_not provided_";
}

/** Metadata only—problem text, examples, and unverified complexity claims are never generated. */
export function buildReadme(input: {
  title: string;
  platform: string;
  problemUrl?: string | null;
  language: string;
  tags: string[];
  status: string;
  verification: string;
  submissionUrl?: string | null;
  difficulty?: string | null;
  approach?: string | null;
  timeComplexity?: string | null;
  spaceComplexity?: string | null;
  notes?: string | null;
}) {
  const verification =
    input.verification === "verified"
      ? "Verified (manual attestation)"
      : input.verification === "pending" || input.verification === "manual_required"
        ? "Pending Manual Verification"
        : "Not Verified";
  const lines = [
    `# ${input.title.trim()}`,
    "",
    `- **Platform:** ${platformLabel(input.platform)}`,
    `- **Problem URL:** ${valueOrNotProvided(input.problemUrl)}`,
    `- **Submission URL:** ${valueOrNotProvided(input.submissionUrl)}`,
    `- **Language:** ${languageLabel(input.language)}`,
    `- **Verification status:** ${verification}`,
    `- **Difficulty:** ${valueOrNotProvided(input.difficulty)}`,
    `- **Tags:** ${input.tags.length ? input.tags.join(", ") : "_none_"}`,
  ];
  if (input.approach?.trim()) lines.push("", "## Approach", "", input.approach.trim());
  if (input.timeComplexity?.trim() || input.spaceComplexity?.trim()) {
    lines.push(
      "",
      "## Complexity",
      "",
      `- **Time:** ${valueOrNotProvided(input.timeComplexity)}`,
      `- **Space:** ${valueOrNotProvided(input.spaceComplexity)}`,
    );
  }
  if (input.notes?.trim()) lines.push("", "## Notes", "", input.notes.trim());
  lines.push(
    "",
    "> Archived with Solution Vault. This README contains user-supplied metadata only.",
    "",
  );
  return lines.join("\n");
}
