#!/usr/bin/env node

// Merges a cursor/plugins commit into upstream/, the hand-ported Mixdog text, with a three-way merge against the
// last pin, pins the commit in upstream.lock.json, and rebuilds. A conflict stays in the file for a person to resolve.
// --check only reports whether the upstream ref moved past the pin, and changes nothing outside the cache.

import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPTS, "..");
const GENERATOR = "scripts/generate-pstack-harness-trees.mjs";
const LINK = /\]\(([^)\s]+)\)/g;
const { values: options } = parseArgs({
  options: {
    ref: { type: "string", default: "main" },
    repo: { type: "string", default: "https://github.com/cursor/plugins" },
    cache: { type: "string", default: join(ROOT, ".cache", "cursor-plugins") },
    lock: { type: "string", default: join(ROOT, "upstream.lock.json") },
    upstream: { type: "string", default: join(ROOT, "upstream") },
    harness: { type: "string", default: join(ROOT, "harness") },
    out: { type: "string" },
    check: { type: "boolean", default: false },
  },
});
const CACHE = resolve(options.cache);
const LOCK = resolve(options.lock);
const UPSTREAM = resolve(options.upstream);
const HARNESS = resolve(options.harness);
const git = (args, more) => execFileSync("git", ["-C", CACHE, ...args], { encoding: "utf8", maxBuffer: 1 << 30, ...more });
// Lets a check of a blob:none clone report a missing object instead of fetching it.
const NO_FETCH = { ...process.env, GIT_NO_LAZY_FETCH: "1" };

if (!existsSync(CACHE)) {
  mkdirSync(dirname(CACHE), { recursive: true });
  // Without these, Windows autocrlf turns upstream LF files into CRLF in any checkout of the cache.
  const config = ["--config", "core.autocrlf=false", "--config", "core.eol=lf"];
  execFileSync("git", ["clone", "--filter=blob:none", "--no-checkout", ...config, options.repo, CACHE], { stdio: "inherit" });
}
git(["fetch", "origin", options.ref]);
const commit = git(["rev-parse", "FETCH_HEAD^{commit}"]).trim();
const previous = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, "utf8")) : undefined;
const excluded = JSON.parse(readFileSync(join(HARNESS, "excluded-skills.json"), "utf8"));

function listTree(sha) {
  return git(["ls-tree", "-r", "-z", sha, "--", "pstack", GENERATOR])
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      const [mode, type, oid] = line.slice(0, tab).split(" ");
      return { mode, type, oid, path: line.slice(tab + 1) };
    })
    .filter(({ type }) => type === "blob");
}

function readBlobs(oids) {
  const input = `${[...new Set(oids)].join("\n")}\n`;
  const absent = git(["cat-file", "--batch-check"], { input, env: NO_FETCH })
    .split("\n")
    .filter((line) => line.endsWith(" missing"))
    .map((line) => line.split(" ")[0]);
  // A blob:none clone lacks every blob it never checked out, and git would fetch each one in its own request.
  // This is the request git's lazy fetch makes, for all of them at once.
  if (absent.length > 0) {
    const fetch = ["fetch", "origin", "--no-tags", "--no-write-fetch-head", "--recurse-submodules=no", "--filter=blob:none", "--stdin"];
    git(["-c", "fetch.negotiationAlgorithm=noop", ...fetch], { input: `${absent.join("\n")}\n` });
  }
  const out = git(["cat-file", "--batch"], { input: Buffer.from(input), encoding: "buffer" });
  const blobs = new Map();
  for (let at = 0; at < out.length; ) {
    const eol = out.indexOf(10, at);
    const [oid, , size] = out.toString("latin1", at, eol).split(" ");
    blobs.set(oid, out.subarray(eol + 1, eol + 1 + Number(size)));
    at = eol + 2 + Number(size);
  }
  return blobs;
}

// The upstream files that upstream/ holds at a commit, keyed by their path under upstream/. A relative link to a pstack
// file outside that set points at the commit on GitHub, because the plugin does not have the file.
function render(tree, blobs, sha, repository) {
  const pstack = new Map(tree.filter(({ path }) => path.startsWith("pstack/")).map((entry) => [entry.path.slice("pstack/".length), entry]));
  const dirs = new Set(
    [...pstack.keys()].flatMap((path) => {
      const parts = path.split("/");
      return parts.slice(1).map((_, i) => parts.slice(0, i + 1).join("/"));
    }),
  );
  const copied = (path) =>
    (path.startsWith("skills/") && !excluded.includes(path.split("/")[1])) ||
    /^(?:agents|docs\/guide)\//.test(path) ||
    ["README.md", "LICENSE", "plugin.json"].includes(path);
  const files = new Map(
    [...pstack].filter(([path]) => copied(path)).map(([path, { oid, mode }]) => [path, { bytes: blobs.get(oid), executable: mode === "100755" }]),
  );
  const held = (path) => files.has(path) || [...files.keys()].some((key) => key.startsWith(`${path}/`));
  for (const [path, file] of files) {
    if (!path.endsWith(".md")) continue;
    file.bytes = Buffer.from(
      file.bytes.toString("utf8").replace(LINK, (link, href) => {
        const target = href.replace(/[#?].*/, "");
        if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return link;
        const at = posix.join(posix.dirname(path), target).replace(/\/$/, "");
        const kind = pstack.has(at) ? "blob" : dirs.has(at) ? "tree" : undefined;
        if (!kind || held(at)) return link;
        return `](${repository}/${kind}/${sha}/pstack/${at}${href.slice(href.search(/[#?]|$/))})`;
      }),
    );
  }
  return files;
}

// Upstream's list of Cursor-only names, which harness/cursor-terms.json follows.
function termsOf(tree, blobs) {
  const entry = tree.find(({ path }) => path === GENERATOR);
  return (entry && blobs.get(entry.oid).toString("utf8").match(/^const TERMS = \[[\s\S]*?^\];/m)?.[0]) ?? "";
}

const conflicts = [];
if (previous?.commit === commit) {
  console.log(`Already current: ${options.ref} is still ${commit}.`);
  if (options.check) process.exit(0);
} else {
  const old = previous?.commit;
  if (old) {
    if (spawnSync("git", ["-C", CACHE, "cat-file", "-e", `${old}^{commit}`], { env: NO_FETCH }).status !== 0) git(["fetch", "origin", old]);
    const paths = ["pstack", GENERATOR];
    console.log(`Upstream ${options.ref} moved from ${old} to ${commit}.\n`);
    console.log(git(["log", "--oneline", `${old}..${commit}`, "--", ...paths]).trimEnd() || "No commits touch pstack/ or the generator.");
    console.log(git(["diff", "--stat", old, commit, "--", ...paths]).trimEnd());
  } else {
    console.log(`No previous lock. ${options.check ? "Upstream" : "Importing"} ${options.ref} at ${commit}.`);
  }
  if (options.check) {
    console.log(`\nNothing was merged. Run \`node scripts/sync.mjs${options.ref === "main" ? "" : ` --ref ${options.ref}`}\` to merge it.`);
    process.exit(0);
  }

  const theirsTree = listTree(commit);
  const unknown = excluded.filter((name) => !theirsTree.some(({ path }) => path.startsWith(`pstack/skills/${name}/`)));
  if (unknown.length > 0) {
    console.log(`FAIL ${join(HARNESS, "excluded-skills.json")} lists ${unknown.join(", ")}, which pstack/skills does not have at ${commit}.`);
    process.exit(1);
  }
  const baseTree = old ? listTree(old) : [];
  const blobs = readBlobs([...baseTree, ...theirsTree].map(({ oid }) => oid));
  const base = old ? render(baseTree, blobs, old, previous.repository) : new Map();
  const theirs = render(theirsTree, blobs, commit, options.repo);

  const tmp = mkdtempSync(join(tmpdir(), "pstack-sync-"));
  try {
    const [baseTerms, theirTerms] = [termsOf(baseTree, blobs), termsOf(theirsTree, blobs)];
    if (old && baseTerms !== theirTerms) {
      writeFileSync(join(tmp, "TERMS.old"), baseTerms);
      writeFileSync(join(tmp, "TERMS.new"), theirTerms);
      const diff = spawnSync("git", ["diff", "--no-index", "--no-color", "TERMS.old", "TERMS.new"], { cwd: tmp, encoding: "utf8" }).stdout;
      console.log(`
==================== NOTICE ====================
Upstream changed TERMS, its list of Cursor-only names, in ${GENERATOR}.
Check whether harness/cursor-terms.json needs the same change.
${diff.trimEnd()}
================================================
`);
    }

    const writes = new Map();
    const deletes = [];
    const labels = ["ours (Mixdog port)", `base (pstack ${old?.slice(0, 7)})`, `theirs (pstack ${commit.slice(0, 7)})`];
    for (const path of [...new Set([...base.keys(), ...theirs.keys()])].sort()) {
      const [b, t] = [base.get(path), theirs.get(path)];
      const same = b && t && b.bytes.equals(t.bytes);
      if (same && b.executable === t.executable) continue;
      const shown = `upstream/${path}`;
      const target = join(UPSTREAM, path);
      const o = existsSync(target) ? readFileSync(target) : undefined;
      if (!t) {
        if (o?.equals(b.bytes)) deletes.push(path);
        else if (o) conflicts.push(`${shown}: upstream deleted it, and it differs from upstream's last version here`);
      } else if (!b) {
        if (!o || o.equals(t.bytes)) writes.set(path, t);
        else conflicts.push(`${shown}: upstream added it, and a different file exists here`);
      } else if (!o) {
        conflicts.push(`${shown}: upstream changed it, and it was deleted here`);
      } else if (same) {
        writes.set(path, { bytes: o, executable: t.executable });
      } else if ([b.bytes, o, t.bytes].some((bytes) => bytes.includes(0))) {
        if (o.equals(b.bytes)) writes.set(path, t);
        else conflicts.push(`${shown}: a binary file that changed upstream and here`);
      } else {
        for (const [name, bytes] of [["ours", o], ["base", b.bytes], ["theirs", t.bytes]]) writeFileSync(join(tmp, name), bytes);
        const files = ["ours", "base", "theirs"].map((name) => join(tmp, name));
        const merged = spawnSync("git", ["merge-file", "-p", "--diff3", ...labels.flatMap((label) => ["-L", label]), ...files], { maxBuffer: 1 << 30 });
        // The exit status counts the conflicts, at most 127, and anything higher is an error.
        if (merged.status === null || merged.status > 127) throw new Error(`git merge-file failed on ${shown}: ${merged.stderr}`);
        if (merged.status > 0) conflicts.push(`${shown}: ${merged.status} conflicting hunks, marked in the file`);
        if (!merged.stdout.equals(o) || t.executable !== b.executable) writes.set(path, { bytes: merged.stdout, executable: t.executable });
      }
    }

    for (const path of deletes) {
      rmSync(join(UPSTREAM, path));
      for (let dir = dirname(join(UPSTREAM, path)); dir !== UPSTREAM && readdirSync(dir).length === 0; dir = dirname(dir)) rmdirSync(dir);
    }
    const modes = [];
    for (const [path, { bytes, executable }] of writes) {
      mkdirSync(dirname(join(UPSTREAM, path)), { recursive: true });
      writeFileSync(join(UPSTREAM, path), bytes);
      chmodSync(join(UPSTREAM, path), executable ? 0o755 : 0o644);
      if (executable !== (base.get(path)?.executable ?? false)) modes.push(`${executable ? "+x" : "-x"} upstream/${path}`);
    }
    console.log(`\nMerged into upstream/: ${writes.size} written, ${deletes.length} deleted, ${conflicts.length} conflicted.`);
    if (modes.length > 0) {
      console.log(`Upstream changed the executable bit of these files. Windows git does not record it, so there run
\`git update-index --chmod=<+x or -x> <path>\` for each before committing:
${modes.join("\n")}`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const lock = { repository: options.repo, ref: options.ref, commit, syncedAt: new Date().toISOString() };
writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`);

const build = [join(SCRIPTS, "build.mjs"), "--upstream", UPSTREAM, "--lock", LOCK, "--harness", HARNESS];
if (options.out) build.push("--out", options.out);
const status = spawnSync(process.execPath, build, { stdio: "inherit" }).status ?? 1;
if (conflicts.length > 0) {
  console.log("");
  for (const conflict of conflicts) console.log(`CONFLICT ${conflict}`);
  console.log(`${conflicts.length} paths conflicted. Resolve each with harness/PORTING.md, then run \`node scripts/build.mjs\`.`);
}
process.exitCode = conflicts.length > 0 ? 2 : status;
