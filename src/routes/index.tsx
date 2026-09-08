import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Code2,
  FolderGit2,
  Send,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Sparkles,
  GitBranch,
  Zap,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { submitSolution } from "@/lib/submit.server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Code Companion — Push CP solutions to GitHub" },
      {
        name: "description",
        content:
          "Paste your competitive programming solution, get a Gemini-generated README, and push both to your GitHub repo in one commit.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const PLATFORMS = [
  { name: "Codeforces", icon: "🔴", color: "from-red-500/20 to-rose-500/20 border-red-500/30" },
  { name: "CodeChef", icon: "🍳", color: "from-amber-500/20 to-orange-500/20 border-amber-500/30" },
  { name: "GeeksforGeeks", icon: "🟢", color: "from-green-500/20 to-emerald-500/20 border-green-500/30" },
  { name: "CodeStudio", icon: "🔷", color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30" },
] as const;

const ALL_PLATFORM_NAMES = PLATFORMS.map((p) => p.name);

const LANGUAGES = [
  "Java",
  "C++",
  "Python",
  "JavaScript",
  "C",
  "C#",
  "Go",
  "Rust",
  "TypeScript",
  "Ruby",
] as const;

function HomePage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([...ALL_PLATFORM_NAMES]);
  const [problemName, setProblemName] = useState("");
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCommits, setLastCommits] = useState<{ platform: string; commitUrl?: string }[]>([]);

  const isAllSelected = selectedPlatforms.length === PLATFORMS.length;

  const togglePlatform = (name: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms([...ALL_PLATFORM_NAMES]);
    }
  };

  const handleSubmit = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform.");
      return;
    }
    if (!problemName.trim()) {
      toast.error("Please enter a problem name.");
      return;
    }
    if (!code.trim()) {
      toast.error("Please paste your solution code.");
      return;
    }

    setIsSubmitting(true);
    setLastCommits([]);

    try {
      // Calls Gemini once on the server and pushes to all target repositories
      const result = await submitSolution({
        data: {
          platform: selectedPlatforms.length === 1 ? selectedPlatforms[0] : undefined,
          platforms: selectedPlatforms,
          problemName: problemName.trim(),
          language,
          code,
        },
      });

      if (result.results && result.results.length > 0) {
        const successes = result.results.filter((r: any) => r.success);
        const failures = result.results.filter((r: any) => !r.success);

        if (successes.length > 0) {
          setLastCommits(successes);
          toast.success(
            result.message ||
              `Pushed to ${successes.map((s: any) => s.platform).join(", ")}!`,
          );
          setProblemName("");
          setCode("");
        }

        if (failures.length > 0) {
          toast.error(
            failures.map((f: any) => `${f.platform}: ${f.error}`).join("\n"),
          );
        }
      } else {
        toast.success(result.message || "Submitted successfully!");
        setProblemName("");
        setCode("");
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(err?.message || "Something went wrong. Check the console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="animate-slide-down mx-auto flex max-w-5xl items-center px-6 py-6">
        <span className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-primary/30">
            <Terminal className="size-4 text-primary" />
          </div>
          <span className="gradient-text">Code Companion</span>
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Ready
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-32">
        {/* Hero */}
        <section className="animate-fade-in-up py-12 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="size-3" />
            AI-powered solution archive
          </div>
          <h1 className="animate-fade-in-up delay-100 mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Paste your solution.
            <br />
            <span className="gradient-text">Push to GitHub.</span>
          </h1>
          <p className="animate-fade-in-up delay-200 mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Pick the platform, paste your code, and hit submit.{" "}
            <span className="text-foreground/80">Gemini writes the README</span>,
            both land in your repo in{" "}
            <span className="text-primary">one commit</span>.
          </p>

          {/* Stats row */}
          <div className="animate-fade-in-up delay-300 mt-8 flex flex-wrap gap-6">
            {[
              { label: "Platforms", value: "4" },
              { label: "Languages", value: "10" },
              { label: "Files/commit", value: "2" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Main Form Card */}
        <section className="animate-fade-in-up delay-400 panel relative overflow-hidden p-8 sm:p-10">
          {/* Decorative top gradient line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Code2 className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Submit Solution</h2>
              <p className="text-sm text-muted-foreground">Fill in the details and push to GitHub</p>
            </div>
          </div>

          <div className="grid gap-7">
            {/* Platform Selection */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-foreground">
                    Target Platforms
                  </label>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {selectedPlatforms.length} of {PLATFORMS.length} selected
                  </span>
                  {selectedPlatforms.length > 0 && (
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      • {selectedPlatforms.length * 3} GitHub contributions
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedPlatforms([...ALL_PLATFORM_NAMES])}
                    className="text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-2"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground/40">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPlatforms([])}
                    className="text-muted-foreground transition-colors hover:text-destructive hover:underline underline-offset-2"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Master All Platforms Toggle */}
                <button
                  type="button"
                  onClick={toggleAll}
                  className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all duration-300 ${
                    isAllSelected
                      ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/40 text-foreground shadow-lg shadow-purple-500/5"
                      : "border-border/50 bg-card/50 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground"
                  }`}
                >
                  <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                    🚀
                  </span>
                  <span className="truncate">All Platforms</span>
                  {isAllSelected ? (
                    <CheckCircle2 className="ml-auto size-4 animate-scale-in text-primary" />
                  ) : (
                    <span className="ml-auto size-3.5 rounded-full border border-border/60" />
                  )}
                </button>

                {/* Individual Platform Toggles */}
                {PLATFORMS.map((p) => {
                  const isSelected = selectedPlatforms.includes(p.name);
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => togglePlatform(p.name)}
                      className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all duration-300 ${
                        isSelected
                          ? `bg-gradient-to-br ${p.color} border-primary/40 text-foreground shadow-lg shadow-primary/5`
                          : "border-border/50 bg-card/50 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground"
                      }`}
                    >
                      <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                        {p.icon}
                      </span>
                      <span className="truncate">{p.name}</span>
                      {isSelected ? (
                        <CheckCircle2 className="ml-auto size-4 animate-scale-in text-primary" />
                      ) : (
                        <span className="ml-auto size-3.5 rounded-full border border-border/60" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Problem Name & Language Row */}
            <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
              <div>
                <label
                  htmlFor="problemName"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Problem Name
                </label>
                <div className="relative">
                  <input
                    id="problemName"
                    type="text"
                    value={problemName}
                    onChange={(e) => setProblemName(e.target.value)}
                    placeholder="e.g. Two Sum, Chef and Strings"
                    className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-300 focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="language"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Language
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground transition-all duration-300 focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Code Editor */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="code"
                  className="text-sm font-medium text-foreground"
                >
                  Solution Code
                </label>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Terminal className="size-3" />
                  {code.split("\n").length} lines
                </span>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-border/50 transition-all duration-300 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                {/* Editor header bar */}
                <div className="flex items-center gap-2 border-b border-border/30 bg-card/80 px-4 py-2">
                  <span className="size-2.5 rounded-full bg-destructive/60" />
                  <span className="size-2.5 rounded-full bg-warning/60" />
                  <span className="size-2.5 rounded-full bg-success/60" />
                  <span className="ml-3 text-xs text-muted-foreground">
                    solution.{language === "C++" ? "cpp" : language === "C#" ? "cs" : language.toLowerCase().slice(0, 2)}
                  </span>
                </div>
                <textarea
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste your solution here..."
                  rows={14}
                  className="code w-full resize-none bg-background/30 px-4 py-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedPlatforms.length === 0}
                size="lg"
                className={`group relative overflow-hidden rounded-xl px-8 text-base font-semibold transition-all duration-300 ${
                  isSubmitting
                    ? "animate-pulse-glow"
                    : "hover:shadow-lg hover:shadow-primary/20"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-5 animate-spin" />
                    Generating README & Pushing ({selectedPlatforms.length} {selectedPlatforms.length === 1 ? "repo" : "repos"})...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    {selectedPlatforms.length === 0
                      ? "Select at least 1 platform"
                      : `Push to ${selectedPlatforms.length} ${selectedPlatforms.length === 1 ? "Platform" : "Platforms"} (${selectedPlatforms.length * 3} Commits)`}
                    <ArrowRight className="ml-2 size-4 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 -translate-x-2" />
                  </>
                )}
              </Button>

              {isSubmitting && (
                <div className="animate-fade-in flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="size-4 animate-pulse text-primary" />
                  <span>Gemini is analyzing your code...</span>
                </div>
              )}
            </div>

            {/* Success Banner */}
            {lastCommits.length > 0 && (
              <div className="animate-success-bounce flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-success/20 bg-gradient-to-r from-success/5 to-success/10 px-5 py-4 text-sm">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/20">
                  <CheckCircle2 className="size-4 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-success">
                    Committed successfully to {lastCommits.map((c) => c.platform).join(", ")}!
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {lastCommits.length * 3} commits pushed across {lastCommits.length} {lastCommits.length === 1 ? "repository" : "repositories"} (folder, README, and code)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                  {lastCommits.map((c) =>
                    c.commitUrl ? (
                      <a
                        key={c.platform}
                        href={c.commitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/20"
                      >
                        {c.platform} <ExternalLink className="size-3" />
                      </a>
                    ) : null,
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Features Grid */}
        <section className="mt-16 grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: FolderGit2,
              title: "4 repos, organized",
              description:
                "Codeforces, CodeChef, GeeksforGeeks, and CodeStudio each have their own repo. Solutions go into clean problem-name folders.",
              gradient: "from-amber-500/10 to-orange-500/10",
              iconColor: "text-amber-400",
              delay: "delay-500",
            },
            {
              icon: Sparkles,
              title: "Gemini-powered READMEs",
              description:
                "Each solution gets an auto-generated README explaining the approach, time & space complexity.",
              gradient: "from-violet-500/10 to-purple-500/10",
              iconColor: "text-violet-400",
              delay: "delay-600",
            },
            {
              icon: GitBranch,
              title: "One clean commit",
              description:
                "Your solution file and README land in a single commit. No noise, no clutter, just clean history.",
              gradient: "from-cyan-500/10 to-blue-500/10",
              iconColor: "text-cyan-400",
              delay: "delay-700",
            },
          ].map(({ icon: Icon, title, description, gradient, iconColor, delay }) => (
            <article
              key={title}
              className={`animate-fade-in-up ${delay} group panel relative overflow-hidden p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5`}
            >
              {/* Hover gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
              <div className="relative">
                <div className={`flex size-10 items-center justify-center rounded-xl bg-card transition-transform duration-500 group-hover:scale-110`}>
                  <Icon className={`size-5 ${iconColor}`} />
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </section>

        {/* Repo Layout Preview */}
        <section className="animate-fade-in-up delay-700 mt-12">
          <div className="panel relative overflow-hidden p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
            <div className="flex items-center gap-3">
              <Zap className="size-5 text-accent" />
              <h3 className="text-sm font-semibold">Export Preview</h3>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-border/30 bg-background/50">
              <div className="flex items-center gap-2 border-b border-border/30 bg-card/50 px-4 py-2 text-xs text-muted-foreground">
                <Terminal className="size-3" />
                your-repo
              </div>
              <pre className="p-4 font-mono text-sm leading-loose">
                <span className="text-muted-foreground">📂 </span>
                <span className="text-accent">chef-and-strings/</span>
                {"\n"}
                <span className="text-muted-foreground">  ├── </span>
                <span className="text-primary">solution.cpp</span>
                <span className="ml-4 text-xs text-muted-foreground/60">← your code</span>
                {"\n"}
                <span className="text-muted-foreground">  └── </span>
                <span className="text-success">README.md</span>
                <span className="ml-4 text-xs text-muted-foreground/60">← Gemini-generated</span>
              </pre>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="animate-fade-in mt-20 border-t border-border/30 pt-8 text-center">
          <p className="text-xs text-muted-foreground/60">
            Built with ♥ — Powered by Gemini AI & GitHub API
          </p>
        </footer>
      </main>
    </div>
  );
}
