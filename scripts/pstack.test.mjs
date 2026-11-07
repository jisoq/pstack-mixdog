import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const REAL_HARNESS = join(SCRIPTS, "..", "harness");
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const MANIFEST = {
  $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  name: "pstack",
  version: "1.2.3",
  description: "pstack description",
  author: { name: "Lauren Tan" },
  homepage: "https://github.com/cursor/plugins/tree/main/pstack",
  repository: "https://github.com/cursor/plugins",
  license: "MIT",
  keywords: ["pstack", "workflow"],
};
const skill = (name, body) => `---\nname: ${name}\ndescription: The ${name} workflow.\n---\n\n# ${name}\n\n${body}\n`;
// upstream/ as a finished port leaves it.
const SOURCE = {
  "plugin.json": `${JSON.stringify(MANIFEST, null, 2)}\n`,
  "README.md": "# pstack\n\nCursor's README stays as upstream wrote it.\n",
  LICENSE: "MIT License\n",
  "agents/reviewer.md": "# reviewer\n\nFollow [alpha](../skills/alpha/SKILL.md).\n",
  "docs/guide/README.md": "# Guide\n\nThe guide keeps Cursor's names and [its links](missing.md).\n",
  "skills/alpha/SKILL.md": skill(
    "alpha",
    "Ask with `ask_user`. Compare [beta](../beta/SKILL.md#steps), read [the roles](../../../harness/PORTING.md#roles), and see [nightly](https://github.com/cursor/plugins/blob/0123456/pstack/automations/nightly.md).",
  ),
  "skills/beta/SKILL.md": skill(
    "beta",
    "Read Bugbot comments on cursor/plugins. Run create-verification-skill or make-create-skill-kit.",
  ),
  "skills/beta/scripts/README.md": "# run\n\nCursor runs this with `Task`.\n",
};
// WORKFLOW.md is left out, because project() writes it with the stamp of the harness it builds.
const HARNESS = {
  "SAVED-WORKFLOW.md": "---\nid: poteto-mode\n---\n\nRead the rules.\n",
  "agents.md": "# agents\n",
  "INSTALL.md": "# install\n",
  "PORTING.md": "# Porting\n\n## Roles\n",
  "STANDALONE-SKILL.md": readFileSync(join(REAL_HARNESS, "STANDALONE-SKILL.md"), "utf8"),
  "cursor-terms.json": readFileSync(join(REAL_HARNESS, "cursor-terms.json"), "utf8"),
  "standalone-skills.json": "{}\n",
  "excluded-skills.json": "[]\n",
};

function git(dir, ...args) {
  return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

// Writes files under dir; a null value deletes the file.
function write(dir, files) {
  for (const [path, content] of Object.entries(files)) {
    if (content === null) rmSync(join(dir, path));
    else {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
  }
}

// Every file under dir, as sorted slash paths.
function list(dir) {
  return readdirSync(dir, { recursive: true })
    .filter((path) => statSync(join(dir, path)).isFile())
    .map((path) => path.split(sep).join("/"))
    .sort();
}

function stamp(harness) {
  return createHash("sha256")
    .update(harness["SAVED-WORKFLOW.md"] + harness["agents.md"] + harness["INSTALL.md"])
    .digest("hex")
    .slice(0, 8);
}

// A WORKFLOW.md that holds the current setup stamp of harness.
function rules(harness) {
  return `# rules\n\nThe current setup stamp is \`${stamp(harness)}\`.\n\n## Rules\n`;
}

// Reads one-line frontmatter values in any YAML quoting: plain, 'single' with '' escapes, or "double".
function frontmatter(text) {
  const lines = text.match(/^---\n([\s\S]*?)\n---\n/)[1].split("\n");
  return Object.fromEntries(
    lines.map((line) => {
      const [, key, value] = line.match(/^([\w-]+):[ \t]*(.*?)[ \t]*$/);
      if (value.startsWith("'")) return [key, value.slice(1, -1).replaceAll("''", "'")];
      if (value.startsWith('"')) return [key, JSON.parse(value)];
      return [key, value];
    }),
  );
}

function run(script, args) {
  return spawnSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: "utf8" });
}

// The problems a failed build printed, without their FAIL prefix.
function fails(result) {
  return result.stdout
    .split("\n")
    .filter((line) => line.startsWith("FAIL "))
    .map((line) => line.slice("FAIL ".length));
}

// A temp plugin folder: upstream/, harness/, and a lock, with the generated files written beside them.
function project(t, { upstream = SOURCE, harness = {}, lock = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "pstack-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dirs = { root, upstream: join(root, "upstream"), harness: join(root, "harness"), lock: join(root, "upstream.lock.json") };
  write(dirs.upstream, upstream);
  const files = { ...HARNESS, ...harness };
  write(dirs.harness, { "WORKFLOW.md": rules(files), ...files });
  if (lock) writeFileSync(dirs.lock, `${JSON.stringify({ repository: MANIFEST.repository, ref: "main", commit: COMMIT, syncedAt: "2026-01-01T00:00:00.000Z" }, null, 2)}\n`);
  return {
    ...dirs,
    build: (...args) => run("build.mjs", ["--upstream", dirs.upstream, "--lock", dirs.lock, "--harness", dirs.harness, "--out", root, ...args]),
    read: (path) => readFileSync(join(root, path), "utf8"),
  };
}

describe("build", () => {
  test("writes plugin.json with the upstream version, the pinned commit, and the harness stamp, and leaves upstream/ alone", (t) => {
    const p = project(t);
    const result = p.build();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /^2 skills, 0 \$p-<name> skills; .*: 1 added, 0 changed, 0 deleted$/m);

    const { description, homepage, license, keywords } = MANIFEST;
    const plugin = {
      name: "pstack-mixdog",
      displayName: "pstack-mixdog",
      version: `1.2.3+mixdog.0123456.${stamp(HARNESS)}`,
      description,
      author: "Lauren Tan (ported to Mixdog by jisoq)",
      homepage,
      repository: "https://github.com/jisoq/pstack-mixdog",
      license,
      keywords,
    };
    assert.equal(p.read("plugin.json"), `${JSON.stringify(plugin, null, 2)}\n`);
    for (const [path, content] of Object.entries(SOURCE)) assert.equal(p.read(`upstream/${path}`), content, path);
    assert.deepEqual(list(p.upstream), Object.keys(SOURCE).sort());
    assert.equal(p.build("--check").status, 0);
  });

  test("a change to SAVED-WORKFLOW.md, agents.md, or INSTALL.md changes the setup stamp, and the build fails until WORKFLOW.md holds it", (t) => {
    const p = project(t);
    assert.equal(p.build().status, 0);
    const workflow = join(p.harness, "WORKFLOW.md");
    const expected = (harness) => [`${workflow} does not hold the current setup stamp. Its stamp line must read: The current setup stamp is \`${stamp(harness)}\`.`];
    const harness = { ...HARNESS };
    for (const name of ["SAVED-WORKFLOW.md", "agents.md", "INSTALL.md"]) {
      const [built, held] = [p.read("plugin.json"), p.read("harness/WORKFLOW.md")];
      harness[name] += "Changed.\n";
      write(p.harness, { [name]: harness[name] });
      const stale = p.build();
      assert.equal(stale.status, 1, name);
      assert.deepEqual(fails(stale), expected(harness), name);
      assert.equal(p.read("plugin.json"), built, name);
      assert.equal(p.read("harness/WORKFLOW.md"), held, name);

      write(p.harness, { "WORKFLOW.md": rules(harness) });
      assert.equal(p.build().status, 0, name);
      assert.equal(JSON.parse(p.read("plugin.json")).version, `1.2.3+mixdog.0123456.${stamp(harness)}`, name);
    }
    // WORKFLOW.md is read live on every task, so its own edits need no resync.
    write(p.harness, { "WORKFLOW.md": `${rules(harness)}\n- Changed.\n`, "PORTING.md": "# Porting\n\n## Roles\n\nChanged.\n" });
    assert.equal(p.build("--check").status, 0);

    write(p.harness, { "WORKFLOW.md": "# rules\n\n## Rules\n" });
    const missing = p.build();
    assert.equal(missing.status, 1);
    assert.deepEqual(fails(missing), expected(harness));
  });

  test("renders a $p-<name> skill for each listed skill that reads the skill itself, without WORKFLOW.md", (t) => {
    const description = `Run beta's "plain" steps: one line.`;
    const p = project(t, { harness: { "standalone-skills.json": JSON.stringify({ beta: description }) } });
    const result = p.build();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /^2 skills, 1 \$p-<name> skills; /m);
    assert.deepEqual(readdirSync(join(p.root, "skills")), ["p-beta"]);
    const wrapper = p.read("skills/p-beta/SKILL.md");
    const fields = frontmatter(wrapper);
    assert.equal(fields.name, "p-beta");
    assert.equal(fields.description, description);
    assert.equal(fields.when_to_use, "User selects $p-beta; never inferred from the task.");
    assert.ok(wrapper.includes("`~/.mixdog/data/skills/pstack-custom-beta/SKILL.md` when the user keeps that copy, otherwise `<root>/upstream/skills/beta/SKILL.md`"), wrapper);
    assert.ok(!wrapper.includes("WORKFLOW.md"), wrapper);
    assert.equal(p.build("--check").status, 0);
  });

  test("fails on merge conflict markers in any text file under upstream/, and writes nothing", (t) => {
    const p = project(t, {
      upstream: {
        ...SOURCE,
        "docs/guide/README.md": "<<<<<<< ours (Mixdog port)\nA\n||||||| base\nB\n=======\nC\n>>>>>>> theirs\n",
        "skills/beta/scripts/run.ts": "one\n=======\n",
        "docs/guide/images/a.jpg": "\0\n=======\n",
      },
    });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.deepEqual(fails(result).sort(), [
      "upstream/docs/guide/README.md has merge conflict markers, the first on line 1. Resolve them with harness/PORTING.md.",
      "upstream/skills/beta/scripts/run.ts has merge conflict markers, the first on line 2. Resolve them with harness/PORTING.md.",
    ]);
    assert.ok(!existsSync(join(p.root, "plugin.json")));
  });

  test("fails on each Cursor-only term in skills and agents outside scripts/ folders, naming the file, line, and term", (t) => {
    const body = ["Spawn it with `Task`.", "Ask with AskQuestion, then run /deslop.", "Use Cursor's create-skill.", "Pick claude-opus-4-8 in Fast mode."];
    const p = project(t, {
      upstream: { ...SOURCE, "skills/alpha/SKILL.md": skill("alpha", body.join("\n")), "agents/reviewer.md": "# reviewer\n\nRead ~/.cursor/plugins/pstack.\n" },
    });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.deepEqual(fails(result).sort(), [
      "upstream/agents/reviewer.md:3 has the Cursor-only term .cursor",
      "upstream/skills/alpha/SKILL.md:10 has the Cursor-only term Cursor",
      "upstream/skills/alpha/SKILL.md:10 has the Cursor-only term create-skill",
      "upstream/skills/alpha/SKILL.md:11 has the Cursor-only term claude-<family>-<n>",
      "upstream/skills/alpha/SKILL.md:11 has the Cursor-only term fast mode",
      "upstream/skills/alpha/SKILL.md:8 has the Cursor-only term `Task`",
      "upstream/skills/alpha/SKILL.md:9 has the Cursor-only term AskQuestion",
      "upstream/skills/alpha/SKILL.md:9 has the Cursor-only term deslop",
    ]);
    assert.ok(!existsSync(join(p.root, "plugin.json")));
  });

  test("fails on a .cursor path in a scripts file or a harness file the workflow reads, and passes their other cursor words", (t) => {
    const code = ['const { endCursor } = data.pageInfo;', 'if (author === "cursor" && edge.cursor) start(CURSOR_AUTOMATION_ID);', '// Cursor spawns this with `Task`.'];
    const p = project(t, {
      upstream: {
        ...SOURCE,
        "skills/beta/scripts/audit.sh": 'ls "$HOME/.cursor/projects"\n',
        "skills/beta/scripts/watch.ts": `${code.join("\n")}\n`,
        "skills/beta/scripts/package.json": '{ "name": "@cursor-skill/tools" }\n',
      },
      harness: { "INSTALL.md": "# install\n\nCopy it to `~/.cursor`.\n" },
    });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.deepEqual(
      fails(result).sort(),
      [`${join(p.harness, "INSTALL.md")}:3 has the Cursor-only term .cursor`, "upstream/skills/beta/scripts/audit.sh:1 has the Cursor-only term .cursor"].sort(),
    );
  });

  test("fails on a relative link that resolves to no path in skills, agents, or the $p-<name> template", (t) => {
    const p = project(t, {
      upstream: {
        ...SOURCE,
        "skills/beta/SKILL.md": skill("beta", "See [gone](../gone/SKILL.md) and [outside](../../../../outside.md)."),
        "agents/reviewer.md": "# reviewer\n\n[missing](missing.md)\n",
      },
      harness: {
        "standalone-skills.json": JSON.stringify({ alpha: "Run alpha." }),
        "STANDALONE-SKILL.md": "---\nname: p-{{NAME}}\n---\n\n[skill](../../upstream/skills/{{NAME}}/SKILL.md), [plugin](../../plugin.json), [entry](../../upstream/docs/harness/mixdog-entry.md)\n",
      },
    });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.deepEqual(
      fails(result).sort(),
      [
        "upstream/agents/reviewer.md links to missing.md, which does not exist",
        "upstream/skills/beta/SKILL.md links to ../gone/SKILL.md, which does not exist",
        "upstream/skills/beta/SKILL.md links to ../../../../outside.md, which does not exist",
        `${join(p.harness, "STANDALONE-SKILL.md")} links to ../../upstream/docs/harness/mixdog-entry.md, which does not exist`,
      ].sort(),
    );
  });

  test("checks titled inline links and reference link definitions, and skips footnotes", (t) => {
    const body = [
      'See [alpha](../alpha/SKILL.md "Alpha") and [gone](../gone/SKILL.md "Gone").',
      "Compare [alpha][a] and [lost][l].[^1]",
      "",
      "[a]: ../alpha/SKILL.md",
      "[l]: <../lost/SKILL.md> 'Lost'",
      "[^1]: A footnote, not a link.",
    ];
    const p = project(t, { upstream: { ...SOURCE, "skills/beta/SKILL.md": skill("beta", body.join("\n")) } });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.deepEqual(fails(result).sort(), [
      "upstream/skills/beta/SKILL.md links to ../gone/SKILL.md, which does not exist",
      "upstream/skills/beta/SKILL.md links to ../lost/SKILL.md, which does not exist",
    ]);
  });

  test("fails on anything left in an excluded skill's folder, even without a SKILL.md", (t) => {
    const p = project(t, { upstream: { ...SOURCE, "skills/omega/README.md": "# omega\n" }, harness: { "excluded-skills.json": JSON.stringify(["omega"]) } });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.deepEqual(fails(result), [`upstream/skills/omega is excluded by ${join(p.harness, "excluded-skills.json")}. Delete it.`]);
    assert.ok(!existsSync(join(p.root, "plugin.json")));
  });

  test("lists every skill, list, and template problem at once, and writes nothing", (t) => {
    const p = project(t, {
      upstream: {
        ...SOURCE,
        "skills/beta/SKILL.md": skill("beta", "Plain steps.").replace("name: beta", "name: Beta"),
        "skills/Bad_Name/SKILL.md": skill("Bad_Name", "Plain steps."),
        "skills/gamma/SKILL.md": skill("gamma", "Plain steps."),
      },
      harness: {
        "excluded-skills.json": JSON.stringify(["gamma"]),
        "standalone-skills.json": JSON.stringify({ omega: "Run omega.", gamma: "Run gamma.", alpha: "a".repeat(101), beta: "Run <beta> steps." }),
        "STANDALONE-SKILL.md": "---\nname: p-{{NAME}}\n---\n\n{{UNKNOWN}}\n",
      },
    });
    const result = p.build();
    assert.equal(result.status, 1);
    const [direct, excluded, template] = ["standalone-skills.json", "excluded-skills.json", "STANDALONE-SKILL.md"].map((name) => join(p.harness, name));
    assert.deepEqual(fails(result), [
      "upstream/skills/Bad_Name is not lowercase words joined by hyphens, at most 64 characters",
      'upstream/skills/beta/SKILL.md has name "Beta", not its folder name beta',
      `upstream/skills/gamma is excluded by ${excluded}. Delete it.`,
      `${direct} lists omega, which is not a pstack skill in upstream/skills`,
      `${direct} lists gamma, which ${excluded} excludes`,
      `${direct} has a 101-character description for alpha, over 100`,
      `${direct} has a description with < or > for beta, which Mixdog's skill validator rejects`,
      `${template} has unfilled placeholder {{UNKNOWN}}`,
    ]);
    assert.ok(!existsSync(join(p.root, "plugin.json")));
    assert.ok(!existsSync(join(p.root, "skills")));
  });

  test("--check reports drift only in plugin.json and skills/, and a build reconciles them in place", (t) => {
    const p = project(t, { harness: { "standalone-skills.json": JSON.stringify({ alpha: "Run alpha.", beta: "Run beta." }) } });
    const before = p.build("--check");
    assert.equal(before.status, 1);
    assert.match(before.stdout, /\/plugin\.json$/m);
    assert.match(before.stdout, /out of date in 3 paths/);
    assert.ok(!existsSync(join(p.root, "plugin.json")));

    assert.equal(p.build().status, 0);
    assert.match(p.build("--check").stdout, /is up to date\.$/m);

    const unrelated = {
      "README.md": "# pstack-mixdog\n",
      "scripts/build.mjs": "// hand-written\n",
      "upstream/extra.md": "# extra\n",
      ".cache/cursor-plugins/x.md": "cache\n",
    };
    write(p.root, { ...unrelated, "plugin.json": "edited\n", "skills/old/SKILL.md": "stale\n" });
    const old = new Date(2000, 0, 1);
    for (const path of [...Object.keys(unrelated), "skills/p-alpha/SKILL.md"]) utimesSync(join(p.root, path), old, old);
    const rootId = statSync(p.root, { bigint: true }).ino;
    const drift = p.build("--check");
    assert.equal(drift.status, 1);
    assert.match(drift.stdout, /\/plugin\.json$/m);
    assert.match(drift.stdout, /\/skills\/old\/SKILL\.md$/m);
    assert.match(drift.stdout, /out of date in 2 paths/);
    assert.equal(p.read("plugin.json"), "edited\n");

    write(p.harness, { "standalone-skills.json": JSON.stringify({ alpha: "Run alpha." }) });
    const rebuild = p.build();
    assert.equal(rebuild.status, 0, rebuild.stdout + rebuild.stderr);
    assert.match(rebuild.stdout, /: 0 added, 1 changed, 2 deleted$/m);
    assert.deepEqual(readdirSync(join(p.root, "skills")), ["p-alpha"]);
    assert.equal(statSync(join(p.root, "skills/p-alpha/SKILL.md")).mtime.getFullYear(), 2000);
    assert.equal(statSync(p.root, { bigint: true }).ino, rootId);
    for (const [path, content] of Object.entries(unrelated)) {
      assert.equal(p.read(path), content, path);
      assert.equal(statSync(join(p.root, path)).mtime.getFullYear(), 2000, path);
    }
    assert.equal(p.build("--check").status, 0);
  });
});

describe("harness", () => {
  const real = (name) => readFileSync(join(REAL_HARNESS, name), "utf8");
  const placeholders = (text) => [...new Set(text.match(/\{\{[A-Z][A-Z0-9_]*\}\}/g))].sort();

  test("the saved workflow has only placeholders INSTALL.md fills, and WORKFLOW.md, read live, has none", () => {
    const saved = real("SAVED-WORKFLOW.md");
    assert.equal(frontmatter(saved).id, "poteto-mode");
    assert.deepEqual(placeholders(saved), ["{{PLUGIN_ROOT}}", "{{SETUP_STAMP}}"]);
    for (const placeholder of placeholders(saved)) assert.ok(real("INSTALL.md").includes(`\`${placeholder}\``), placeholder);
    assert.deepEqual(placeholders(real("WORKFLOW.md")), []);
  });

  test("WORKFLOW.md ends by asking for the pstack activated marker, which only a reader of it can know", () => {
    const marker = real("WORKFLOW.md").trimEnd().split("\n").at(-1).match(/first line of your first message on the task is exactly `([^`]+)`\.$/)?.[1];
    assert.equal(marker, "pstack activated");
    for (const name of ["SAVED-WORKFLOW.md", "STANDALONE-SKILL.md"]) assert.ok(!real(name).includes(marker), name);
  });
});

// A cursor/plugins stand-in. Its server settings make the sync cache a real blob:none clone, as GitHub does.
const REMOTE = {
  "scripts/generate-pstack-harness-trees.mjs": 'const TERMS = [\n  { key: "AskQuestion", re: /AskQuestion/ },\n];\nconst ROUTE_KEY = "x";\n',
  "pstack/plugin.json": `${JSON.stringify(MANIFEST, null, 2)}\n`,
  "pstack/README.md": "# pstack\n\nRead [the guide](docs/guide/README.md). Schedules live in [automations](automations/).\n",
  "pstack/LICENSE": "MIT License\n",
  "pstack/agents/reviewer.md": "# reviewer\n",
  "pstack/docs/guide/README.md": "# Guide\n\nBack to [pstack](../../README.md).\n",
  "pstack/docs/harness/claude-code.md": "# Claude Code adapter\n",
  "pstack/automations/nightly.md": "# nightly\n",
  "pstack/skills/alpha/SKILL.md": skill(
    "alpha",
    "Set up [nightly](../../automations/nightly.md#setup) from [automations](../../automations). Compare [beta](../beta/SKILL.md) and [omega](../omega/SKILL.md).",
  ),
  "pstack/skills/beta/SKILL.md": skill("beta", "Step one.\nStep two.\nStep three.\nStep four.\nStep five."),
  "pstack/skills/gamma/SKILL.md": skill("gamma", "Plain steps."),
  "pstack/skills/omega/SKILL.md": skill("omega", "Excluded."),
};

function commit(dir, files, executable = []) {
  write(dir, files);
  git(dir, "add", "-A");
  for (const path of executable) git(dir, "update-index", "--chmod=+x", path);
  git(dir, "-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "update");
  return git(dir, "rev-parse", "HEAD");
}

function synced(t, { harness = {} } = {}) {
  const p = project(t, { upstream: {}, harness: { "excluded-skills.json": JSON.stringify(["omega"]), ...harness }, lock: false });
  const remote = join(p.root, "remote");
  const cache = join(p.root, "cache");
  mkdirSync(remote);
  git(remote, "init", "-q", "-b", "main");
  for (const [key, value] of [["core.autocrlf", "false"], ["uploadpack.allowFilter", "true"], ["uploadpack.allowAnySHA1InWant", "true"]]) git(remote, "config", key, value);
  const repo = pathToFileURL(remote).href;
  return {
    ...p,
    remote,
    cache,
    repo,
    first: commit(remote, REMOTE),
    sync: (...args) =>
      run("sync.mjs", ["--repo", repo, "--cache", cache, "--lock", p.lock, "--upstream", p.upstream, "--harness", p.harness, "--out", p.root, ...args]),
    locked: () => JSON.parse(readFileSync(p.lock, "utf8")).commit,
  };
}

describe("sync", () => {
  test("first imports the rendered upstream tree, links left-out files to the pinned commit, pins it, and builds", (t) => {
    const s = synced(t);
    const first = s.sync();
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.match(first.stdout, /^No previous lock\. Importing main at /m);
    const { syncedAt, ...lock } = JSON.parse(readFileSync(s.lock, "utf8"));
    assert.deepEqual(lock, { repository: s.repo, ref: "main", commit: s.first });
    assert.equal(git(s.cache, "config", "remote.origin.promisor"), "true");
    assert.equal(git(s.cache, "config", "core.autocrlf"), "false");
    assert.equal(git(s.cache, "config", "core.eol"), "lf");

    assert.deepEqual(list(s.upstream), [
      "LICENSE",
      "README.md",
      "agents/reviewer.md",
      "docs/guide/README.md",
      "plugin.json",
      "skills/alpha/SKILL.md",
      "skills/beta/SKILL.md",
      "skills/gamma/SKILL.md",
    ]);
    const blob = `${s.repo}/blob/${s.first}/pstack`;
    assert.equal(
      s.read("upstream/skills/alpha/SKILL.md"),
      skill(
        "alpha",
        `Set up [nightly](${blob}/automations/nightly.md#setup) from [automations](${s.repo}/tree/${s.first}/pstack/automations). Compare [beta](../beta/SKILL.md) and [omega](${blob}/skills/omega/SKILL.md).`,
      ),
    );
    assert.equal(s.read("upstream/README.md"), `# pstack\n\nRead [the guide](docs/guide/README.md). Schedules live in [automations](${s.repo}/tree/${s.first}/pstack/automations).\n`);
    assert.equal(s.read("upstream/skills/beta/SKILL.md"), REMOTE["pstack/skills/beta/SKILL.md"]);
    assert.equal(JSON.parse(s.read("plugin.json")).version, `1.2.3+mixdog.${s.first.slice(0, 7)}.${stamp(HARNESS)}`);

    const rerun = s.sync();
    assert.equal(rerun.status, 0, rerun.stdout + rerun.stderr);
    assert.match(rerun.stdout, new RegExp(`^Already current: main is still ${s.first}\\.$`, "m"));
  });

  test("--check reports whether upstream moved past the pin, without merging, pinning, or building", (t) => {
    const s = synced(t);
    assert.equal(s.sync().status, 0);
    const current = s.sync("--check");
    assert.equal(current.status, 0, current.stdout + current.stderr);
    assert.match(current.stdout, new RegExp(`^Already current: main is still ${s.first}\\.$`, "m"));

    const kept = ["upstream/skills/beta/SKILL.md", "upstream.lock.json", "plugin.json"].map((path) => [path, readFileSync(join(s.root, path), "utf8")]);
    const next = commit(s.remote, { "pstack/skills/beta/SKILL.md": REMOTE["pstack/skills/beta/SKILL.md"].replace("Step five.", "Step five, updated.") });
    const moved = s.sync("--check");
    assert.equal(moved.status, 0, moved.stdout + moved.stderr);
    assert.match(moved.stdout, new RegExp(`^Upstream main moved from ${s.first} to ${next}\\.$`, "m"));
    assert.match(moved.stdout, /^Nothing was merged\. Run `node scripts\/sync\.mjs` to merge it\.$/m);
    for (const [path, text] of kept) assert.equal(readFileSync(join(s.root, path), "utf8"), text, path);
  });

  test("merges an upstream change into a locally ported file, writes additions, and deletes files and folders upstream removed", (t) => {
    const s = synced(t);
    assert.equal(s.sync().status, 0);
    const ported = (text) => text.replace("Step one.", "Step one, ported.");
    write(s.upstream, { "skills/beta/SKILL.md": ported(s.read("upstream/skills/beta/SKILL.md")) });
    const next = commit(s.remote, {
      "pstack/skills/beta/SKILL.md": REMOTE["pstack/skills/beta/SKILL.md"].replace("Step five.", "Step five, updated."),
      "pstack/agents/new.md": "# new\n",
      "pstack/agents/reviewer.md": null,
      "pstack/skills/gamma/SKILL.md": null,
    });

    const result = s.sync();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, new RegExp(`^Upstream main moved from ${s.first} to ${next}\\.$`, "m"));
    assert.match(result.stdout, /pstack\/agents\/new\.md +\| 1 \+/);
    // README.md and alpha change too, because their links to left-out files now pin the new commit.
    assert.match(result.stdout, /^Merged into upstream\/: 4 written, 2 deleted, 0 conflicted\.$/m);
    assert.ok(s.read("upstream/README.md").includes(`(${s.repo}/tree/${next}/pstack/automations)`));
    assert.equal(s.read("upstream/skills/beta/SKILL.md"), ported(REMOTE["pstack/skills/beta/SKILL.md"]).replace("Step five.", "Step five, updated."));
    assert.equal(s.read("upstream/agents/new.md"), "# new\n");
    assert.ok(!existsSync(join(s.upstream, "agents/reviewer.md")));
    assert.ok(!existsSync(join(s.upstream, "skills/gamma")));
    assert.equal(s.locked(), next);
  });

  test("a conflict leaves markers, exits 2, and fails the build until a person resolves it", (t) => {
    const s = synced(t);
    assert.equal(s.sync().status, 0);
    const built = s.read("plugin.json");
    write(s.upstream, {
      "skills/beta/SKILL.md": s.read("upstream/skills/beta/SKILL.md").replace("Step three.", "Step three, ported."),
      "agents/reviewer.md": "# reviewer, ported\n",
      LICENSE: null,
    });
    const next = commit(s.remote, {
      "pstack/skills/beta/SKILL.md": REMOTE["pstack/skills/beta/SKILL.md"].replace("Step three.", "Step three, updated."),
      "pstack/agents/reviewer.md": null,
      "pstack/LICENSE": "MIT License, updated\n",
    });

    const result = s.sync();
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stdout, /^FAIL upstream\/skills\/beta\/SKILL\.md has merge conflict markers, the first on line 10\. /m);
    const conflicts = result.stdout.split("\n").filter((line) => line.startsWith("CONFLICT "));
    assert.deepEqual(conflicts, [
      "CONFLICT upstream/LICENSE: upstream changed it, and it was deleted here",
      "CONFLICT upstream/agents/reviewer.md: upstream deleted it, and it differs from upstream's last version here",
      "CONFLICT upstream/skills/beta/SKILL.md: 1 conflicting hunks, marked in the file",
    ]);
    assert.match(result.stdout, /^3 paths conflicted\. Resolve each with harness\/PORTING\.md/m);
    const merged = s.read("upstream/skills/beta/SKILL.md");
    assert.ok(
      merged.includes(
        `<<<<<<< ours (Mixdog port)\nStep three, ported.\n||||||| base (pstack ${s.first.slice(0, 7)})\nStep three.\n=======\nStep three, updated.\n>>>>>>> theirs (pstack ${next.slice(0, 7)})\n`,
      ),
      merged,
    );
    assert.equal(s.read("upstream/agents/reviewer.md"), "# reviewer, ported\n");
    assert.ok(!existsSync(join(s.upstream, "LICENSE")));
    assert.equal(s.locked(), next);
    assert.equal(s.read("plugin.json"), built);

    const rerun = s.sync();
    assert.equal(rerun.status, 1, rerun.stdout + rerun.stderr);
    assert.match(rerun.stdout, /^Already current: /m);
    assert.match(rerun.stdout, /^FAIL upstream\/skills\/beta\/SKILL\.md has merge conflict markers/m);

    write(s.upstream, { "skills/beta/SKILL.md": merged.replace(/<<<<<<< [\s\S]*>>>>>>> .*\n/, "Step three, ported and updated.\n") });
    const resolved = s.build();
    assert.equal(resolved.status, 0, resolved.stdout + resolved.stderr);
    assert.equal(JSON.parse(s.read("plugin.json")).version, `1.2.3+mixdog.${next.slice(0, 7)}.${stamp(HARNESS)}`);
  });

  test("never imports an excluded skill, and fails before writing when upstream lacks an excluded name", (t) => {
    const s = synced(t);
    assert.equal(s.sync().status, 0);
    assert.ok(!existsSync(join(s.upstream, "skills/omega")));
    const before = list(s.upstream);
    write(s.harness, { "excluded-skills.json": JSON.stringify(["omega", "zeta"]) });
    commit(s.remote, { "pstack/agents/reviewer.md": "# reviewer v2\n" });

    const result = s.sync();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, new RegExp(`^FAIL .*excluded-skills\\.json lists zeta, which pstack/skills does not have at [0-9a-f]{40}\\.$`, "m"));
    assert.equal(s.locked(), s.first);
    assert.deepEqual(list(s.upstream), before);
    assert.equal(s.read("upstream/agents/reviewer.md"), "# reviewer\n");
  });

  test("an upstream executable bit follows upstream, and sync names each change for Windows", (t) => {
    const s = synced(t);
    assert.equal(s.sync().status, 0);
    const script = "pstack/skills/beta/scripts/run.sh";
    commit(s.remote, { [script]: "#!/bin/sh\necho run\n" }, [script]);
    const added = s.sync();
    assert.equal(added.status, 0, added.stdout + added.stderr);
    assert.match(added.stdout, /^\+x upstream\/skills\/beta\/scripts\/run\.sh$/m);
    assert.equal(s.read("upstream/skills/beta/scripts/run.sh"), "#!/bin/sh\necho run\n");
    if (process.platform !== "win32") assert.notEqual(statSync(join(s.upstream, "skills/beta/scripts/run.sh")).mode & 0o111, 0);

    git(s.remote, "update-index", "--chmod=-x", script);
    git(s.remote, "-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "not executable");
    const removed = s.sync();
    assert.equal(removed.status, 0, removed.stdout + removed.stderr);
    assert.match(removed.stdout, /^-x upstream\/skills\/beta\/scripts\/run\.sh$/m);
    if (process.platform !== "win32") assert.equal(statSync(join(s.upstream, "skills/beta/scripts/run.sh")).mode & 0o111, 0);
  });

  test("prints upstream's TERMS change as a notice without blocking, and stays quiet on other generator changes", (t) => {
    const s = synced(t);
    assert.equal(s.sync().status, 0);
    const generator = "scripts/generate-pstack-harness-trees.mjs";
    const terms = REMOTE[generator].replace("];", '  { key: "Worktrees", re: /worktrees/ },\n];');
    commit(s.remote, { [generator]: terms });
    const changed = s.sync();
    assert.equal(changed.status, 0, changed.stdout + changed.stderr);
    assert.match(changed.stdout, /^Check whether harness\/cursor-terms\.json needs the same change\.$/m);
    assert.match(changed.stdout, /^\+  \{ key: "Worktrees", re: \/worktrees\/ \},$/m);

    commit(s.remote, { [generator]: `${terms}// trailing\n` });
    const other = s.sync();
    assert.equal(other.status, 0, other.stdout + other.stderr);
    assert.doesNotMatch(other.stdout, /cursor-terms\.json/);
  });

  test("an upstream addition keeps a different local file at its path as an add/add conflict, also on a first import", (t) => {
    const s = synced(t);
    const conflicts = (result) => result.stdout.split("\n").filter((line) => line.startsWith("CONFLICT "));
    write(s.upstream, { LICENSE: REMOTE["pstack/LICENSE"], "agents/reviewer.md": "# reviewer, ported\n" });
    const first = s.sync();
    assert.equal(first.status, 2, first.stdout + first.stderr);
    assert.match(first.stdout, /^Merged into upstream\/: 7 written, 0 deleted, 1 conflicted\.$/m);
    assert.deepEqual(conflicts(first), ["CONFLICT upstream/agents/reviewer.md: upstream added it, and a different file exists here"]);
    assert.equal(s.read("upstream/agents/reviewer.md"), "# reviewer, ported\n");

    write(s.upstream, { "agents/new.md": "# new, ported\n" });
    commit(s.remote, { "pstack/agents/new.md": "# new\n" });
    const added = s.sync();
    assert.equal(added.status, 2, added.stdout + added.stderr);
    assert.deepEqual(conflicts(added), ["CONFLICT upstream/agents/new.md: upstream added it, and a different file exists here"]);
    assert.equal(s.read("upstream/agents/new.md"), "# new, ported\n");
  });

  test("an upstream change to only the executable bit of a file deleted here is a conflict", (t) => {
    const s = synced(t);
    assert.equal(s.sync().status, 0);
    write(s.upstream, { "agents/reviewer.md": null });
    commit(s.remote, {}, ["pstack/agents/reviewer.md"]);
    const result = s.sync();
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.deepEqual(
      result.stdout.split("\n").filter((line) => line.startsWith("CONFLICT ")),
      ["CONFLICT upstream/agents/reviewer.md: upstream changed it, and it was deleted here"],
    );
    assert.ok(!existsSync(join(s.upstream, "agents/reviewer.md")));
  });

  test("fetches the previously pinned commit when the cache lacks it", (t) => {
    const s = synced(t);
    git(s.remote, "checkout", "-q", "-b", "side");
    const side = commit(s.remote, { "pstack/agents/reviewer.md": "# reviewer on side\n" });
    assert.equal(s.sync("--ref", "side").status, 0);
    // A fresh clone of a remote whose side branch is gone has no copy of the pinned commit.
    git(s.remote, "checkout", "-q", "main");
    git(s.remote, "branch", "-q", "-D", "side");
    const next = commit(s.remote, { "pstack/LICENSE": "MIT License, updated\n" });
    rmSync(s.cache, { recursive: true, force: true });

    const result = s.sync();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, new RegExp(`^Upstream main moved from ${side} to ${next}\\.$`, "m"));
    assert.equal(s.read("upstream/agents/reviewer.md"), "# reviewer\n");
    assert.equal(s.read("upstream/LICENSE"), "MIT License, updated\n");
    assert.ok(s.read("upstream/README.md").includes(`(${s.repo}/tree/${next}/pstack/automations)`));
  });
});
