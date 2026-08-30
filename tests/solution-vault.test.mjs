import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function loadModule(path) {
  const source = readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, module: { exports }, URL, TextEncoder, btoa, atob });
  return exports;
}

const vault = loadModule(new URL("../src/lib/solution-vault.ts", import.meta.url));
const github = loadModule(new URL("../src/lib/github-app.server.ts", import.meta.url));

test("only the four requested platforms are selectable", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(vault.PLATFORMS.map((platform) => platform.value))), [
    "leetcode",
    "geeksforgeeks",
    "code360",
    "codechef",
  ]);
  assert.equal(vault.isSupportedPlatform("codeforces"), false);
});

test("manual-link verification accepts only HTTPS URLs for the chosen platform", () => {
  assert.equal(
    vault.validatePlatformUrl("leetcode", "https://leetcode.com/problems/two-sum/"),
    null,
  );
  assert.match(
    vault.validatePlatformUrl("leetcode", "https://example.com/problems/two-sum/"),
    /LeetCode/,
  );
  assert.match(
    vault.validatePlatformUrl("codechef", "http://www.codechef.com/problems/TEST"),
    /HTTPS/,
  );
});

test("export paths normalize hostile slugs and reject traversal", () => {
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        vault.exportPaths({ platform: "leetcode", slug: "../../Two Sum", language: "cpp" }),
      ),
    ),
    { codePath: "leetcode/two-sum/solution.cpp", readmePath: "leetcode/two-sum/README.md" },
  );
  assert.throws(() => github.assertGitHubPath("../secrets.txt"), /Invalid export path/);
  assert.throws(
    () => github.assertGitHubPath("leetcode\\two-sum\\solution.cpp"),
    /Invalid export path/,
  );
  assert.throws(
    () => github.assertRepositoryFullName("owner/repo/extra"),
    /Invalid repository name/,
  );
});

test("README labels manual verification and omits unprovided complexity", () => {
  const readme = vault.buildReadme({
    title: "Two Sum",
    platform: "leetcode",
    problemUrl: "https://leetcode.com/problems/two-sum/",
    language: "cpp",
    tags: ["array"],
    status: "manually_verified",
    verification: "verified",
    submissionUrl: "https://leetcode.com/submissions/detail/1/",
  });
  assert.match(readme, /Verification status:\*\* Verified \(manual attestation\)/);
  assert.doesNotMatch(readme, /## Complexity/);
});
