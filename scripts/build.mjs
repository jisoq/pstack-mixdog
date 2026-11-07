#!/usr/bin/env node

// Generates the Mixdog plugin's plugin.json and $p-<name> skills from upstream/ and harness/, and checks that
// upstream/, the hand-ported pstack text that scripts/sync.mjs merges from cursor/plugins, is ready to ship.

import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { values: options } = parseArgs({
  options: {
    check: { type: "boolean", default: false },
    upstream: { type: "string", default: join(ROOT, "upstream") },
    lock: { type: "string", default: join(ROOT, "upstream.lock.json") },
    harness: { type: "string", default: join(ROOT, "harness") },
    out: { type: "string", default: ROOT },
  },
});
const UPSTREAM = resolve(options.upstream);
const LOCK = resolve(options.lock);
const HARNESS = resolve(options.harness);
const OUT = resolve(options.out);
// Links resolve from the plugin folder, which holds upstream/, harness/, and the generated files.
const PLUGIN = dirname(UPSTREAM);
const SOURCE = relative(PLUGIN, UPSTREAM);
// The output root is the plugin repo, so everything else in it is hand-written and never touched.
const OWNED = ["plugin.json", "skills"];
// The saved Poteto mode workflow names the stamp of these, so a change to any of them makes its next conversation resync.
// WORKFLOW.md is read live on every task, so it holds the current stamp instead of feeding it.
const STAMPED = ["SAVED-WORKFLOW.md", "agents.md", "INSTALL.md"];
const RULES = "WORKFLOW.md";
const STAMP_LINE = /^The current setup stamp is `([^`\r\n]*)`\.\r?$/m;
const PORT_AUTHOR = "jisoq";
const PLUGIN_REPOSITORY = "https://github.com/jisoq/pstack-mixdog";
const COMMAND = "node scripts/build.mjs";
// An inline link with an optional title, and a reference definition that is not a footnote.
const LINK = /\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)|^ {0,3}\[(?!\^)[^\]]+\]:[ \t]*<?([^\s>]+)>?/gm;
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEHOLDER = /\{\{[A-Z][A-Z0-9_]*\}\}/g;
// The marker lines that scripts/sync.mjs leaves through git merge-file --diff3.
const CONFLICT_MARKER = /^(?:(?:<{7}|\|{7}|>{7}) |={7}\r?$)/;
// Mixdog's skill validator warns above this, and its UI shows the description.
const DESCRIPTION_MAX = 100;

// Paths inside the project print relative to it, others in full.
function show(path) {
  const rel = relative(ROOT, path);
  return rel.startsWith("..") || isAbsolute(rel) ? path : rel.split(sep).join("/");
}

function rel(base, path) {
  return relative(base, path).split(sep).join("/");
}

// Upstream scripts install their own dependencies into node_modules at run time (watch-pr's bootstrap).
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function file(path) {
  return { bytes: readFileSync(path), executable: (statSync(path).mode & 0o111) !== 0 };
}

function textFile(content) {
  return { bytes: Buffer.from(content), executable: false };
}

function has(files, path) {
  return files.has(path) || [...files.keys()].some((key) => key.startsWith(`${path}/`));
}

function prune(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(dir, entry.name);
    prune(path);
    if (readdirSync(path).length === 0) rmdirSync(path);
  }
}

function fail(problems) {
  // Every wrapper renders from one template, so a template problem repeats once per wrapper.
  for (const problem of new Set(problems)) console.log(`FAIL ${problem}`);
  return 1;
}

function main() {
  const lock = JSON.parse(readFileSync(LOCK, "utf8"));
  const manifest = JSON.parse(readFileSync(join(UPSTREAM, "plugin.json"), "utf8"));
  const excludedList = join(HARNESS, "excluded-skills.json");
  const standaloneList = join(HARNESS, "standalone-skills.json");
  const standaloneTemplate = join(HARNESS, "STANDALONE-SKILL.md");
  const excluded = JSON.parse(readFileSync(excludedList, "utf8"));
  const terms = JSON.parse(readFileSync(join(HARNESS, "cursor-terms.json"), "utf8")).map(({ key, re, everywhere }) => ({ key, re: new RegExp(re), everywhere }));
  // Code and the harness's own text legitimately use some listed words, such as a cursor variable or a model id.
  const anywhere = terms.filter(({ everywhere }) => everywhere);
  const problems = [];
  const scan = (name, text, list) =>
    text.split("\n").forEach((line, i) => {
      for (const { key, re } of list) if (re.test(line)) problems.push(`${name}:${i + 1} has the Cursor-only term ${key}`);
    });

  const skillsDir = join(UPSTREAM, "skills");
  const skills = readdirSync(skillsDir).filter((name) => existsSync(join(skillsDir, name, "SKILL.md"))).sort();
  for (const skill of skills) {
    const path = `${SOURCE}/skills/${skill}`;
    const frontmatter = readFileSync(join(skillsDir, skill, "SKILL.md"), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const name = frontmatter.match(/^name:(.*)$/m)?.[1].trim().replace(/^(["'])(.*)\1$/, "$2");
    if (name !== skill) problems.push(`${path}/SKILL.md has name ${JSON.stringify(name ?? "")}, not its folder name ${skill}`);
    if (!SKILL_NAME.test(skill) || skill.length > 64) problems.push(`${path} is not lowercase words joined by hyphens, at most 64 characters`);
  }
  // Any leftover, such as a folder whose SKILL.md is gone, would still ship in the plugin.
  for (const skill of excluded) {
    if (existsSync(join(skillsDir, skill))) problems.push(`${SOURCE}/skills/${skill} is excluded by ${show(excludedList)}. Delete it.`);
  }

  const stamp = createHash("sha256")
    .update(Buffer.concat(STAMPED.map((name) => readFileSync(join(HARNESS, name)))))
    .digest("hex")
    .slice(0, 8);
  const rules = join(HARNESS, RULES);
  if (readFileSync(rules, "utf8").match(STAMP_LINE)?.[1] !== stamp) {
    problems.push(`${show(rules)} does not hold the current setup stamp. Its stamp line must read: The current setup stamp is \`${stamp}\`.`);
  }
  const { description, homepage, license, keywords } = manifest;
  const version = `${manifest.version}+mixdog.${lock.commit.slice(0, 7)}.${stamp}`;
  // Mixdog shows only one author string, so the port credit rides in it after the upstream author.
  const upstreamAuthor = typeof manifest.author === "string" ? manifest.author : manifest.author.name;
  const author = `${upstreamAuthor} (ported to Mixdog by ${PORT_AUTHOR})`;
  const plugin = { name: "pstack-mixdog", displayName: "pstack-mixdog", version, description, author, homepage, repository: PLUGIN_REPOSITORY, license, keywords };
  const rendered = new Map([["plugin.json", textFile(`${JSON.stringify(plugin, null, 2)}\n`)]]);
  // A $p-<name> skill runs its skill alone, without WORKFLOW.md. Skills that need its rules run only in Poteto mode.
  const template = readFileSync(standaloneTemplate, "utf8");
  for (const [name, description] of Object.entries(JSON.parse(readFileSync(standaloneList, "utf8")))) {
    if (excluded.includes(name)) problems.push(`${show(standaloneList)} lists ${name}, which ${show(excludedList)} excludes`);
    else if (!skills.includes(name)) problems.push(`${show(standaloneList)} lists ${name}, which is not a pstack skill in ${SOURCE}/skills`);
    if (typeof description !== "string" || description.trim() === "") problems.push(`${show(standaloneList)} has no description for ${name}`);
    else if (/[\r\n]/.test(description)) problems.push(`${show(standaloneList)} has a multi-line description for ${name}`);
    else if (description.length > DESCRIPTION_MAX) {
      problems.push(`${show(standaloneList)} has a ${description.length}-character description for ${name}, over ${DESCRIPTION_MAX}`);
    }
    if (typeof description === "string" && /[<>]/.test(description)) {
      problems.push(`${show(standaloneList)} has a description with < or > for ${name}, which Mixdog's skill validator rejects`);
    }
    // A JSON string is a YAML double-quoted scalar, so any one-line description stays one frontmatter value.
    const text = template.replaceAll("{{NAME}}", () => name).replaceAll("{{DESCRIPTION}}", () => JSON.stringify(description));
    rendered.set(`skills/p-${name}/SKILL.md`, textFile(text));
  }

  // A relative link resolves from the plugin folder, with the generated files as this build writes them.
  const resolves = (from, href) => {
    const target = href.replace(/[#?].*/, "");
    if (!target || target.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(target)) return true;
    const path = posix.join(posix.dirname(from), target).replace(/\/$/, "");
    if (path === ".." || path.startsWith("../")) return false;
    if (OWNED.some((name) => path === name || path.startsWith(`${name}/`))) return has(rendered, path);
    return existsSync(join(PLUGIN, path));
  };
  for (const path of walk(UPSTREAM)) {
    const name = rel(PLUGIN, path);
    const bytes = readFileSync(path);
    if (bytes.includes(0)) continue;
    const text = bytes.toString("utf8");
    const lines = text.split("\n");
    const marker = lines.findIndex((line) => CONFLICT_MARKER.test(line));
    if (marker !== -1) problems.push(`${name} has merge conflict markers, the first on line ${marker + 1}. Resolve them with harness/PORTING.md.`);
    const prose = name.endsWith(".md") && [`${SOURCE}/skills/`, `${SOURCE}/agents/`].some((dir) => name.startsWith(dir));
    // Scripts stay as upstream wrote them, so they and their docs answer only to the terms that hold anywhere.
    const scripts = name.split("/").slice(0, -1).includes("scripts");
    if (prose || scripts) scan(name, text, scripts ? anywhere : terms);
    if (!prose) continue;
    for (const [, inline, reference] of text.matchAll(LINK)) {
      const href = inline ?? reference;
      if (!resolves(name, href)) problems.push(`${name} links to ${href}, which does not exist`);
    }
  }
  // The workflow and install read these; PORTING.md and cursor-terms.json name Cursor on purpose.
  for (const path of [...STAMPED, RULES, "STANDALONE-SKILL.md", "excluded-skills.json", "standalone-skills.json"].map((name) => join(HARNESS, name))) {
    scan(show(path), readFileSync(path, "utf8"), anywhere);
  }
  for (const [path, { bytes }] of rendered) {
    if (!path.endsWith(".md")) continue;
    const text = bytes.toString("utf8");
    for (const placeholder of new Set(text.match(PLACEHOLDER))) problems.push(`${show(standaloneTemplate)} has unfilled placeholder ${placeholder}`);
    for (const [, inline, reference] of text.matchAll(LINK)) {
      const href = inline ?? reference;
      if (!resolves(path, href)) problems.push(`${show(standaloneTemplate)} links to ${href}, which does not exist`);
    }
  }
  if (problems.length > 0) return fail(problems);

  const onDisk = new Map(
    OWNED.map((name) => join(OUT, name))
      .filter((path) => existsSync(path))
      .flatMap((path) => (statSync(path).isDirectory() ? walk(path) : [path]))
      .map((path) => [rel(OUT, path), file(path)]),
  );
  const same = (want, have) => want.bytes.equals(have.bytes) && want.executable === have.executable;
  const where = show(OUT) || "the project root";
  if (options.check) {
    const drifted = [...new Set([...rendered.keys(), ...onDisk.keys()])].sort().filter((path) => {
      const [want, have] = [rendered.get(path), onDisk.get(path)];
      return !want || !have || !same(want, have);
    });
    for (const path of drifted.slice(0, 20)) console.log(show(OUT) ? `${show(OUT)}/${path}` : path);
    if (drifted.length > 0) {
      console.log(`The generated plugin in ${where} is out of date in ${drifted.length} paths. Run \`${COMMAND}\`.`);
      return 1;
    }
    console.log(`The generated plugin in ${where} is up to date.`);
    return 0;
  }

  // Reconcile in place: Mixdog watches the plugin's skill dirs, and Windows cannot rename a watched tree.
  mkdirSync(OUT, { recursive: true });
  let deleted = 0;
  for (const path of onDisk.keys()) {
    if (rendered.has(path)) continue;
    rmSync(join(OUT, path));
    deleted++;
  }
  if (existsSync(join(OUT, "skills"))) prune(join(OUT, "skills"));
  let added = 0;
  let changed = 0;
  for (const [path, want] of rendered) {
    const have = onDisk.get(path);
    if (have && same(want, have)) continue;
    mkdirSync(dirname(join(OUT, path)), { recursive: true });
    writeFileSync(join(OUT, path), want.bytes);
    chmodSync(join(OUT, path), want.executable ? 0o755 : 0o644);
    if (have) changed++;
    else added++;
  }
  console.log(`${skills.length} skills, ${rendered.size - 1} $p-<name> skills; ${where}: ${added} added, ${changed} changed, ${deleted} deleted`);
  return 0;
}

process.exitCode = main();
