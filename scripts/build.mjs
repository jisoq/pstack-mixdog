#!/usr/bin/env node

// Renders the Mixdog pstack plugin from the pinned upstream checkout plus harness/.
// Mirrors scripts/generate-pstack-harness-trees.mjs in cursor/plugins, which renders the Claude Code tree.

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { values: options } = parseArgs({
  options: {
    check: { type: "boolean", default: false },
    upstream: { type: "string", default: join(ROOT, ".cache", "cursor-plugins") },
    lock: { type: "string", default: join(ROOT, "upstream.lock.json") },
    harness: { type: "string", default: join(ROOT, "harness") },
    out: { type: "string", default: ROOT },
  },
});
const UPSTREAM = resolve(options.upstream);
const LOCK = resolve(options.lock);
const HARNESS = resolve(options.harness);
const OUT = resolve(options.out);
const PSTACK = join(UPSTREAM, "pstack");
const SKILLS = join(PSTACK, "skills");
const GENERATOR = "scripts/generate-pstack-harness-trees.mjs";
const ADAPTER = "docs/harness/mixdog.md";
const GUIDE = "docs/guide";
const ENTRY = "skills/pstack/SKILL.md";
// The output root is the plugin repo, so everything else in it is hand-written and never touched.
const OWNED = ["plugin.json", "skills", "upstream"];
const OWNED_DIRS = ["skills", "upstream"];
const COMMAND = "node scripts/build.mjs";
const LINK = /\]\(([^)\s]+)\)/g;
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEHOLDER = /\{\{[A-Z][A-Z0-9_]*\}\}/g;
// Mixdog's skill validator warns above this, and its UI shows the description.
const DESCRIPTION_MAX = 100;
// Names that Mixdog maps but upstream's Claude Code tree does not need to.
const EXTRA_TERMS = [
  { key: "cursor-team-kit", re: /cursor-team-kit/ },
  { key: "create-skill", re: /(?<![\w-])create-skill(?![\w-])/ },
  { key: "/loop", re: /\/loop\b/ },
  { key: "bun", re: /\bbun\b/ },
];

// Paths inside the project print relative to it, others in full.
function show(path) {
  const rel = relative(ROOT, path);
  return rel.startsWith("..") || isAbsolute(rel) ? path : rel.split(sep).join("/");
}

function rel(base, path) {
  return relative(base, path).split(sep).join("/");
}

const SOURCE_SKIP = new Set([".DS_Store", "node_modules"]);
// Upstream scripts install their own dependencies into node_modules at run time (watch-pr's bootstrap), so the
// output inventory leaves those folders alone; every other stale file in an owned path is still reconciled.
const OUTPUT_SKIP = new Set(["node_modules"]);

function walk(dir, skip = SOURCE_SKIP) {
  return readdirSync(dir).flatMap((name) => {
    if (skip.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path, skip) : [path];
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

// The path a relative link in `from` points at, relative to the same root as `from`.
function linkPath(from, href) {
  const target = href.replace(/[#?].*/, "");
  if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return undefined;
  return posix.join(posix.dirname(from), target).replace(/\/$/, "");
}

// The pstack-relative path that a relative link in `from` points at, if that path exists upstream.
function resolveLink(from, href) {
  const path = linkPath(from, href);
  return path !== undefined && existsSync(join(PSTACK, path)) ? path : undefined;
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
  const git = (...args) => execFileSync("git", ["-C", UPSTREAM, ...args], { encoding: "utf8" });
  const head = git("rev-parse", "HEAD").trim();
  const changes = git("status", "--porcelain").split("\n").filter(Boolean);
  const blockers = [];
  if (head !== lock.commit) blockers.push(`${show(UPSTREAM)} is at ${head}, but ${show(LOCK)} pins ${lock.commit}. Run node scripts/sync.mjs.`);
  if (changes.length > 0) blockers.push(`${show(UPSTREAM)} has local changes: ${changes.join(", ")}`);
  if (blockers.length > 0) return fail(blockers);

  // Upstream's inventory of Cursor names stays the source of truth, so read it from the pinned generator.
  let terms;
  let routeKey;
  try {
    const source = readFileSync(join(UPSTREAM, GENERATOR), "utf8");
    const termsSource = source.match(/^const TERMS = (\[[\s\S]*?^\]);/m)?.[1];
    const routeSource = source.match(/^const ROUTE_KEY = ("[^"\n]*");/m)?.[1];
    if (!termsSource || !routeSource) throw new Error('no `const TERMS = [...]` or `const ROUTE_KEY = "..."`');
    const upstreamTerms = vm.runInNewContext(termsSource);
    const isTerm = (term) => typeof term?.key === "string" && Object.prototype.toString.call(term.re) === "[object RegExp]";
    if (!Array.isArray(upstreamTerms) || !upstreamTerms.every(isTerm)) throw new Error("TERMS is not a list of { key, re }");
    terms = [...upstreamTerms, ...EXTRA_TERMS];
    routeKey = vm.runInNewContext(routeSource);
  } catch (error) {
    return fail([`upstream ${GENERATOR} changed shape (${error.message}). Update how scripts/build.mjs reads TERMS and ROUTE_KEY.`]);
  }

  const skills = readdirSync(SKILLS).filter((name) => existsSync(join(SKILLS, name, "SKILL.md"))).sort();

  function classify(skill) {
    const dir = join(SKILLS, skill);
    const others = skills.filter((name) => name !== skill).join("|");
    const route = new RegExp(`the \\*\\*(?<bold>${others})\\*\\* skill|\`/(?<command>${others})\``, "g");
    const linksToSkill = (line, name) => line.includes(`(../${name}/`);
    const namesBareSkill = (line) =>
      [...line.matchAll(route)].some(({ groups }) => !linksToSkill(line, groups.bold ?? groups.command));
    const usesCursorNames = new Set();
    for (const path of walk(dir).filter((path) => path.endsWith(".md"))) {
      const text = readFileSync(path, "utf8");
      for (const term of terms) if (term.re.test(text)) usesCursorNames.add(term.key);
      if (text.split("\n").some(namesBareSkill)) usesCursorNames.add(routeKey);
    }
    const text = readFileSync(join(dir, "SKILL.md"), "utf8");
    const wrap = usesCursorNames.size > 0 && /^# /m.test(text);
    return { usesCursorNames, wrap };
  }

  const classes = new Map(skills.map((skill) => [skill, classify(skill)]));
  const problems = [];
  const users = new Map();
  for (const [skill, { usesCursorNames, wrap }] of classes) {
    if (usesCursorNames.size > 0 && !wrap) problems.push(`pstack/skills/${skill}/SKILL.md uses Cursor names but has no H1`);
    for (const key of usesCursorNames) users.set(key, [...(users.get(key) ?? []), skill]);
    const frontmatter = readFileSync(join(SKILLS, skill, "SKILL.md"), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const name = frontmatter.match(/^name:(.*)$/m)?.[1].trim().replace(/^(["'])(.*)\1$/, "$2");
    if (name !== skill) problems.push(`pstack/skills/${skill}/SKILL.md has name ${JSON.stringify(name ?? "")}, not its folder name ${skill}`);
    if (!SKILL_NAME.test(skill) || skill.length > 64) problems.push(`pstack/skills/${skill} is not lowercase words joined by hyphens, at most 64 characters`);
  }
  const adapter = readFileSync(join(HARNESS, "adapter.md"));
  for (const [key, using] of users) {
    if (!adapter.toString("utf8").includes(key)) problems.push(`${show(join(HARNESS, "adapter.md"))} has no row for ${key}, used by ${using.join(", ")}`);
  }

  // Skills read the adapter, the guide, the agents, and the README at runtime, so Mixdog never fetches them.
  const copies = [
    ...walk(SKILLS),
    ...walk(join(PSTACK, "agents")),
    ...walk(join(PSTACK, GUIDE)),
    ...["README.md", "LICENSE", "plugin.json"].map((name) => join(PSTACK, name)),
  ];
  const files = new Map(copies.map((path) => [rel(PSTACK, path), file(path)]));
  files.set(ADAPTER, { bytes: adapter, executable: false });
  const line =
    `In Mixdog, read [the Mixdog adapter](../../${ADAPTER}) once per session before you follow this skill. ` +
    "It maps the Cursor names in pstack skills to Mixdog.";
  for (const [skill, { wrap }] of classes) {
    const entry = files.get(`skills/${skill}/SKILL.md`);
    if (wrap) entry.bytes = Buffer.from(entry.bytes.toString("utf8").replace(/^(# .*)\n+/m, `$1\n\n${line}\n\n`));
  }
  for (const [path, entry] of files) {
    if (!path.endsWith(".md")) continue;
    entry.bytes = Buffer.from(
      entry.bytes.toString("utf8").replace(LINK, (link, href) => {
        const target = resolveLink(path, href);
        if (!target || target.split("/")[0] === ".." || has(files, target)) return link;
        const kind = statSync(join(PSTACK, target)).isDirectory() ? "tree" : "blob";
        return `](${lock.repository}/${kind}/${lock.commit}/pstack/${target}${href.slice(href.search(/[#?]|$/))})`;
      }),
    );
  }
  // Links to pstack files that the tree leaves out already point at the pinned commit, so a failure here is a link that leaves pstack/.
  for (const [path, entry] of files) {
    if (!path.endsWith(".md")) continue;
    for (const [, href] of entry.bytes.toString("utf8").matchAll(LINK)) {
      const target = resolveLink(path, href);
      if (target && !has(files, target)) problems.push(`upstream/${path} links to ${href}, which is not in the tree`);
    }
  }

  const manifest = JSON.parse(files.get("plugin.json").bytes.toString("utf8"));
  const rendered = new Map([...files].map(([path, entry]) => [`upstream/${path}`, entry]));
  const harnessSkill = join(HARNESS, "SKILL.md");
  const entry = readFileSync(harnessSkill, "utf8")
    .replaceAll("{{PSTACK_VERSION}}", () => manifest.version)
    .replaceAll("{{UPSTREAM_COMMIT}}", () => lock.commit.slice(0, 12))
    .replaceAll("{{SKILL_NAMES}}", () => skills.map((skill) => `\`${skill}\``).join(", "));
  rendered.set(ENTRY, textFile(entry));
  const { description, author, homepage, repository, license, keywords } = manifest;
  const version = `${manifest.version}+mixdog.${lock.commit.slice(0, 7)}`;
  const plugin = { name: "pstack", displayName: "pstack", version, description, author, homepage, repository, license, keywords };
  rendered.set("plugin.json", textFile(`${JSON.stringify(plugin, null, 2)}\n`));
  const directList = join(HARNESS, "direct-skills.json");
  const directTemplate = join(HARNESS, "DIRECT-SKILL.md");
  const template = readFileSync(directTemplate, "utf8");
  const harnessSkills = [{ source: harnessSkill, path: ENTRY, text: entry }];
  for (const [name, description] of Object.entries(JSON.parse(readFileSync(directList, "utf8")))) {
    if (!skills.includes(name)) problems.push(`${show(directList)} lists ${name}, which is not an upstream pstack skill`);
    if (typeof description !== "string" || description.trim() === "") problems.push(`${show(directList)} has no description for ${name}`);
    else if (/[\r\n]/.test(description)) problems.push(`${show(directList)} has a multi-line description for ${name}`);
    else if (description.length > DESCRIPTION_MAX) {
      problems.push(`${show(directList)} has a ${description.length}-character description for ${name}, over ${DESCRIPTION_MAX}`);
    }
    if (typeof description === "string" && /[<>]/.test(description)) {
      problems.push(`${show(directList)} has a description with < or > for ${name}, which Mixdog's skill validator rejects`);
    }
    const path = `skills/pstack-${name}/SKILL.md`;
    // A JSON string is a YAML double-quoted scalar, so any one-line description stays one frontmatter value.
    const text = template.replaceAll("{{NAME}}", () => name).replaceAll("{{DESCRIPTION}}", () => JSON.stringify(description));
    rendered.set(path, textFile(text));
    harnessSkills.push({ source: directTemplate, path, text });
  }
  for (const { source, path, text } of harnessSkills) {
    for (const placeholder of new Set(text.match(PLACEHOLDER))) problems.push(`${show(source)} has unfilled placeholder ${placeholder}`);
    for (const [, href] of text.matchAll(LINK)) {
      const target = linkPath(path, href);
      if (target !== undefined && !has(rendered, target)) problems.push(`${show(source)} links to ${href}, which is not a rendered file`);
    }
  }
  if (problems.length > 0) return fail(problems);

  const onDisk = new Map(
    OWNED.map((name) => join(OUT, name))
      .filter((path) => existsSync(path))
      .flatMap((path) => (statSync(path).isDirectory() ? walk(path, OUTPUT_SKIP) : [path]))
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
  for (const name of OWNED_DIRS) if (existsSync(join(OUT, name))) prune(join(OUT, name));
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
  const wrapped = [...classes.values()].filter(({ wrap }) => wrap).length;
  console.log(
    `${skills.length} skills, ${wrapped} SKILL.md files with the Mixdog adapter line; ${where}: ${added} added, ${changed} changed, ${deleted} deleted`,
  );
  return 0;
}

process.exitCode = main();
