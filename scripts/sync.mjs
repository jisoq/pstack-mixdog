#!/usr/bin/env node

// Pins an upstream cursor/plugins commit in upstream.lock.json, reports what changed since the last pin, and rebuilds.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPTS, "..");
const GENERATOR = "scripts/generate-pstack-harness-trees.mjs";
// Upstream's Claude Code mapping: when it changes, the Mixdog adapter may need the same change.
const MAPPING = ["pstack/docs/harness/claude-code.md", GENERATOR];
const { values: options } = parseArgs({
  options: {
    ref: { type: "string", default: "main" },
    repo: { type: "string", default: "https://github.com/cursor/plugins" },
    cache: { type: "string", default: join(ROOT, ".cache", "cursor-plugins") },
    lock: { type: "string", default: join(ROOT, "upstream.lock.json") },
    harness: { type: "string" },
    out: { type: "string" },
  },
});
const CACHE = resolve(options.cache);
const LOCK = resolve(options.lock);
const git = (...args) => execFileSync("git", ["-C", CACHE, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

if (!existsSync(CACHE)) {
  mkdirSync(dirname(CACHE), { recursive: true });
  // Without these, Windows autocrlf turns upstream LF files into CRLF and breaks frontmatter parsing.
  const config = ["--config", "core.autocrlf=false", "--config", "core.eol=lf"];
  execFileSync("git", ["clone", "--filter=blob:none", "--no-checkout", ...config, options.repo, CACHE], { stdio: "inherit" });
}
git("fetch", "origin", options.ref);
const commit = git("rev-parse", "FETCH_HEAD^{commit}").trim();
git("checkout", "--quiet", "--force", "--detach", commit);

const old = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, "utf8")).commit : undefined;
let review = false;
if (old === commit) {
  console.log(`Already current: ${options.ref} is still ${commit}.`);
} else if (old) {
  const paths = ["pstack", GENERATOR];
  console.log(`Upstream ${options.ref} moved from ${old} to ${commit}.\n`);
  console.log(git("log", "--oneline", `${old}..${commit}`, "--", ...paths).trimEnd() || "No commits touch pstack/ or the generator.");
  console.log(git("diff", "--stat", old, commit, "--", ...paths).trimEnd());
  const mapping = git("diff", "--name-only", old, commit, "--", ...MAPPING).trim();
  if (mapping) {
    review = true;
    console.log(`
==================== REVIEW ====================
Upstream changed its Claude Code mapping:
${mapping}
Check whether harness/adapter.md (and harness/SKILL.md) need the same change.
================================================
`);
    console.log(git("diff", old, commit, "--", ...MAPPING).trimEnd());
    console.log("================== END REVIEW ==================\n");
  }
} else {
  console.log(`No previous lock. Pinning ${options.ref} at ${commit}.`);
}

const lock = { repository: options.repo, ref: options.ref, commit, syncedAt: new Date().toISOString() };
writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`);

// The generated plugin is live in Mixdog, so a mapping change must not ship before a human reviews it.
if (review) {
  console.log("Not building. Review the diffs above, update harness/adapter.md if needed, then run `node scripts/build.mjs`.");
  process.exit(2);
}

const build = [join(SCRIPTS, "build.mjs"), "--upstream", CACHE, "--lock", LOCK];
for (const name of ["harness", "out"]) if (options[name]) build.push(`--${name}`, options[name]);
process.exitCode = spawnSync(process.execPath, build, { stdio: "inherit" }).status ?? 1;
