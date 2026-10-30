import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = "https://github.com/cursor/plugins";
const LINE =
  "In Mixdog, read [the Mixdog adapter](../../docs/harness/mixdog.md) once per session before you follow this skill. " +
  "It maps the Cursor names in pstack skills to Mixdog.";
const MANIFEST = {
  $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  name: "pstack",
  version: "1.2.3",
  description: "pstack description",
  author: { name: "Lauren Tan" },
  homepage: "https://github.com/cursor/plugins/tree/main/pstack",
  repository: REPOSITORY,
  license: "MIT",
  keywords: ["pstack", "workflow"],
};
const skill = (name, body, heading = `# ${name}\n\n`) => `---\nname: ${name}\ndescription: The ${name} workflow.\n---\n\n${heading}${body}\n`;
const UPSTREAM = {
  "scripts/generate-pstack-harness-trees.mjs": `const TERMS = [
  { key: "\`AskQuestion\`", re: /AskQuestion/ },
  { key: "todolist", re: /\\btodo ?list\\b/i },
];
const ROUTE_KEY = "Run another pstack skill";
`,
  "pstack/plugin.json": `${JSON.stringify(MANIFEST, null, 2)}\n`,
  "pstack/README.md": "# pstack\n\nRead [the guide](docs/guide/README.md). Schedules live in [automations](automations/).\n",
  "pstack/LICENSE": "MIT License\n",
  "pstack/agents/reviewer.md": "# reviewer\n",
  "pstack/docs/guide/README.md": "# Guide\n\nBack to [pstack](../../README.md).\n",
  "pstack/docs/harness/claude-code.md": "# Claude Code adapter\n",
  "pstack/automations/nightly.md": "# nightly\n",
  "pstack/skills/alpha/SKILL.md": skill(
    "alpha",
    "Ask with `AskQuestion`. Set up [nightly](../../automations/nightly.md#setup) from [automations](../../automations).",
  ),
  "pstack/skills/beta/SKILL.md": skill("beta", "Plain steps. Compare with [alpha](../alpha/SKILL.md)."),
  "pstack/skills/gamma/SKILL.md": skill("gamma", "Then run the **beta** skill."),
  "pstack/skills/delta/SKILL.md": skill("delta", "Install the tools with bun."),
};
const HARNESS = {
  "adapter.md": "# Mixdog adapter\n\n| Cursor | Mixdog |\n| --- | --- |\n| `AskQuestion` | ask |\n| Run another pstack skill | skill |\n| bun | npm |\n",
  "SKILL.md": `---
name: pstack
description: pstack for Mixdog.
---

# pstack

pstack {{PSTACK_VERSION}} at {{UPSTREAM_COMMIT}}. Skills: {{SKILL_NAMES}}.

Read [the adapter](../../upstream/docs/harness/mixdog.md) and [alpha](../../upstream/skills/alpha/SKILL.md#steps).
`,
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

function commit(dir, files) {
  write(dir, files);
  git(dir, "add", "-A");
  git(dir, "-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "update");
  return git(dir, "rev-parse", "HEAD");
}

function run(script, args) {
  return spawnSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: "utf8" });
}

// A temp project with an upstream fixture repo at one commit, a lock pinning it, and a harness.
function project(t, { upstream = {}, harness = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), "pstack-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dirs = { root, upstream: join(root, "upstream"), harness: join(root, "harness"), out: join(root, "out"), lock: join(root, "upstream.lock.json") };
  mkdirSync(dirs.upstream);
  git(dirs.upstream, "init", "-q", "-b", "main");
  git(dirs.upstream, "config", "core.autocrlf", "false");
  const pin = (sha) => {
    const lock = { repository: REPOSITORY, ref: "main", commit: sha, syncedAt: new Date().toISOString() };
    writeFileSync(dirs.lock, `${JSON.stringify(lock, null, 2)}\n`);
    return sha;
  };
  write(dirs.harness, { ...HARNESS, ...harness });
  return {
    ...dirs,
    sha: pin(commit(dirs.upstream, { ...UPSTREAM, ...upstream })),
    pin,
    build: (...args) => run("build.mjs", ["--upstream", dirs.upstream, "--lock", dirs.lock, "--harness", dirs.harness, "--out", dirs.out, ...args]),
    read: (path) => readFileSync(join(dirs.out, path), "utf8"),
  };
}

describe("build", () => {
  test("renders the Mixdog plugin layout with placeholders filled", (t) => {
    const p = project(t);
    const result = p.build();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /^4 skills, 3 SKILL\.md files with the Mixdog adapter line; .*: \d+ added, 0 changed, 0 deleted$/m);

    assert.deepEqual(readdirSync(join(p.out, "skills")), ["pstack"]);
    const { description, author, homepage, repository, license, keywords } = MANIFEST;
    const plugin = { name: "pstack", displayName: "pstack", version: `1.2.3+mixdog.${p.sha.slice(0, 7)}`, description, author, homepage, repository, license, keywords };
    assert.equal(p.read("plugin.json"), `${JSON.stringify(plugin, null, 2)}\n`);
    assert.equal(
      p.read("skills/pstack/SKILL.md"),
      HARNESS["SKILL.md"].replace(
        "pstack {{PSTACK_VERSION}} at {{UPSTREAM_COMMIT}}. Skills: {{SKILL_NAMES}}.",
        `pstack 1.2.3 at ${p.sha.slice(0, 12)}. Skills: \`alpha\`, \`beta\`, \`delta\`, \`gamma\`.`,
      ),
    );

    assert.equal(p.read("upstream/docs/harness/mixdog.md"), HARNESS["adapter.md"]);
    for (const path of ["README.md", "LICENSE", "plugin.json", "agents/reviewer.md", "docs/guide/README.md"]) {
      assert.ok(existsSync(join(p.out, "upstream", path)), path);
    }
    for (const path of ["automations", "docs/harness/claude-code.md"]) assert.ok(!existsSync(join(p.out, "upstream", path)), path);
  });

  test("inserts the adapter line after the H1 only in skills that use Cursor names", (t) => {
    const p = project(t);
    assert.equal(p.build().status, 0);
    for (const name of ["alpha", "gamma", "delta"]) {
      assert.ok(p.read(`upstream/skills/${name}/SKILL.md`).includes(`\n# ${name}\n\n${LINE}\n\n`), name);
    }
    assert.equal(p.read("upstream/skills/beta/SKILL.md"), UPSTREAM["pstack/skills/beta/SKILL.md"]);
  });

  test("rewrites links to left-out upstream files to the pinned commit", (t) => {
    const p = project(t);
    assert.equal(p.build().status, 0);
    const alpha = p.read("upstream/skills/alpha/SKILL.md");
    assert.ok(alpha.includes(`[nightly](${REPOSITORY}/blob/${p.sha}/pstack/automations/nightly.md#setup)`), alpha);
    assert.ok(alpha.includes(`[automations](${REPOSITORY}/tree/${p.sha}/pstack/automations)`), alpha);
    assert.ok(p.read("upstream/README.md").includes(`[automations](${REPOSITORY}/tree/${p.sha}/pstack/automations)`));
    assert.ok(p.read("upstream/README.md").includes("[the guide](docs/guide/README.md)"));
    assert.ok(p.read("upstream/skills/beta/SKILL.md").includes("[alpha](../alpha/SKILL.md)"));
  });

  test("fails on a missing adapter row, naming the key and the skill, and writes nothing", (t) => {
    const p = project(t, { harness: { "adapter.md": HARNESS["adapter.md"].replace("| bun | npm |\n", "") } });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^FAIL .*adapter\.md has no row for bun, used by delta$/m);
    assert.ok(!existsSync(p.out));
  });

  test("lists every skill problem at once", (t) => {
    const p = project(t, {
      upstream: {
        "pstack/skills/alpha/SKILL.md": skill("alpha", "Ask with `AskQuestion`.", ""),
        "pstack/skills/beta/SKILL.md": skill("beta", "Plain steps.").replace("name: beta", "name: Beta"),
      },
    });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^FAIL pstack\/skills\/alpha\/SKILL\.md uses Cursor names but has no H1$/m);
    assert.match(result.stdout, /^FAIL pstack\/skills\/beta\/SKILL\.md has name "Beta", not its folder name beta$/m);
    assert.ok(!existsSync(p.out));
  });

  test("fails on a link that leaves upstream pstack/", (t) => {
    const p = project(t, { upstream: { "pstack/skills/beta/SKILL.md": skill("beta", "See [the generator](../../../scripts/generate-pstack-harness-trees.mjs).") } });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^FAIL upstream\/skills\/beta\/SKILL\.md links to \.\.\/\.\.\/\.\.\/scripts\/generate-pstack-harness-trees\.mjs, which is not in the tree$/m);
  });

  test("fails on unfilled placeholders and unresolved links in harness/SKILL.md", (t) => {
    const p = project(t, { harness: { "SKILL.md": "# pstack\n\n{{UNKNOWN_VALUE}} and [missing](../../upstream/skills/missing/SKILL.md).\n" } });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^FAIL .*SKILL\.md has unfilled placeholder \{\{UNKNOWN_VALUE\}\}$/m);
    assert.match(result.stdout, /^FAIL .*SKILL\.md links to \.\.\/\.\.\/upstream\/skills\/missing\/SKILL\.md, which is not a rendered file$/m);
    assert.ok(!existsSync(p.out));
  });

  test("fails when the upstream generator changed shape", (t) => {
    const p = project(t, { upstream: { "scripts/generate-pstack-harness-trees.mjs": "export const TERMS = loadTerms();\n" } });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^FAIL upstream scripts\/generate-pstack-harness-trees\.mjs changed shape/m);
  });

  test("fails when upstream HEAD differs from the lock", (t) => {
    const p = project(t);
    const head = commit(p.upstream, { "pstack/agents/reviewer.md": "# reviewer v2\n" });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.match(result.stdout, new RegExp(`^FAIL .* is at ${head}, but .*upstream\\.lock\\.json pins ${p.sha}\\.`, "m"));
    assert.ok(!existsSync(p.out));
  });

  test("fails when the upstream checkout has local changes", (t) => {
    const p = project(t);
    write(p.upstream, { "pstack/skills/beta/SKILL.md": skill("beta", "Edited.") });
    const result = p.build();
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^FAIL .* has local changes: +M pstack\/skills\/beta\/SKILL\.md$/m);
  });

  test("--check detects drift, writes nothing, and passes after a build", (t) => {
    const p = project(t);
    const before = p.build("--check");
    assert.equal(before.status, 1);
    assert.match(before.stdout, /\/skills\/pstack\/SKILL\.md$/m);
    assert.ok(!existsSync(p.out));

    assert.equal(p.build().status, 0);
    const clean = p.build("--check");
    assert.equal(clean.status, 0, clean.stdout);
    assert.match(clean.stdout, /is up to date\.$/m);

    write(p.out, { "plugin.json": "edited\n", "upstream/extra.md": "extra\n" });
    const drift = p.build("--check");
    assert.equal(drift.status, 1);
    assert.match(drift.stdout, /\/plugin\.json$/m);
    assert.match(drift.stdout, /\/upstream\/extra\.md$/m);
    assert.match(drift.stdout, /out of date in 2 paths/);
    assert.equal(p.read("plugin.json"), "edited\n");
  });

  test("a rebuild deletes stale files, keeps unchanged files and the output dir", (t) => {
    const p = project(t);
    assert.equal(p.build().status, 0);
    const outId = statSync(p.out, { bigint: true }).ino;
    const unchanged = join(p.out, "upstream/skills/beta/SKILL.md");
    utimesSync(unchanged, new Date(2000, 0, 1), new Date(2000, 0, 1));
    write(p.out, { "upstream/stray/old.md": "stale\n" });
    p.pin(commit(p.upstream, { "pstack/skills/delta/SKILL.md": null }));

    const result = p.build();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    // Changed: plugin.json and skills/pstack/SKILL.md, plus upstream alpha and README.md, whose links pin the commit.
    assert.match(result.stdout, /^3 skills, 2 SKILL\.md files .*: 0 added, 4 changed, 2 deleted$/m);
    assert.ok(!existsSync(join(p.out, "upstream/skills/delta")));
    assert.ok(!existsSync(join(p.out, "upstream/stray")));
    assert.equal(statSync(p.out, { bigint: true }).ino, outId);
    assert.equal(statSync(unchanged).mtime.getFullYear(), 2000);
    assert.match(p.read("skills/pstack/SKILL.md"), /Skills: `alpha`, `beta`, `gamma`\./);
    assert.equal(p.build("--check").status, 0);
  });

  test("leaves files outside the owned paths untouched and out of drift, but deletes stale owned files", (t) => {
    const p = project(t);
    const unrelated = {
      "README.md": "# pstack-mixdog\n",
      "scripts/build.mjs": "// hand-written\n",
      "harness/adapter.md": "# adapter\n",
      "upstream.lock.json": "{}\n",
      ".gitignore": ".cache/\n",
      ".git/HEAD": "ref: refs/heads/main\n",
      ".cache/cursor-plugins/x.md": "cache\n",
      "node_modules/x/index.js": "dep\n",
      ".DS_Store": "finder\n",
    };
    write(p.out, unrelated);
    mkdirSync(join(p.out, "empty"));
    for (const path of Object.keys(unrelated)) utimesSync(join(p.out, path), new Date(2000, 0, 1), new Date(2000, 0, 1));
    const untouched = () => {
      for (const [path, content] of Object.entries(unrelated)) {
        assert.equal(p.read(path), content, path);
        assert.equal(statSync(join(p.out, path)).mtime.getFullYear(), 2000, path);
      }
      assert.ok(existsSync(join(p.out, "empty")));
    };

    assert.equal(p.build().status, 0);
    untouched();
    const clean = p.build("--check");
    assert.equal(clean.status, 0, clean.stdout);

    write(p.out, { "skills/old/SKILL.md": "stale\n" });
    const drift = p.build("--check");
    assert.equal(drift.status, 1);
    assert.match(drift.stdout, /\/skills\/old\/SKILL\.md$/m);
    assert.match(drift.stdout, /out of date in 1 paths/);

    const rebuild = p.build();
    assert.match(rebuild.stdout, /: 0 added, 0 changed, 1 deleted$/m);
    assert.deepEqual(readdirSync(join(p.out, "skills")), ["pstack"]);
    untouched();
  });

  test("runtime-installed node_modules survive and are not drift, while a stray .DS_Store is deleted", (t) => {
    const p = project(t);
    assert.equal(p.build().status, 0);
    write(p.out, { "upstream/skills/beta/node_modules/x/index.js": "installed\n", "upstream/.DS_Store": "stale\n" });

    const drift = p.build("--check");
    assert.equal(drift.status, 1, drift.stdout);
    assert.match(drift.stdout, /out of date in 1 paths/);

    assert.equal(p.build().status, 0);
    assert.equal(readFileSync(join(p.out, "upstream/skills/beta/node_modules/x/index.js"), "utf8"), "installed\n");
    assert.ok(!existsSync(join(p.out, "upstream/.DS_Store")));
    assert.equal(p.build("--check").status, 0);
  });
});

describe("sync", () => {
  test("pins the fetched commit, rebuilds, and stops for review on Claude Code mapping changes until --reviewed", (t) => {
    const p = project(t);
    const cache = join(p.root, "cache");
    const lock = join(p.root, "synced.lock.json");
    const repo = pathToFileURL(p.upstream).href;
    const sync = (...args) => run("sync.mjs", ["--repo", repo, "--cache", cache, "--lock", lock, "--harness", p.harness, "--out", p.out, ...args]);
    const generated = () =>
      Object.fromEntries(readdirSync(p.out, { recursive: true }).filter((path) => statSync(join(p.out, path)).isFile()).map((path) => [path, p.read(path)]));
    const locked = () => JSON.parse(readFileSync(lock, "utf8")).commit;

    const first = sync();
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.match(first.stdout, /No previous lock/);
    assert.deepEqual(
      (({ syncedAt, ...rest }) => rest)(JSON.parse(readFileSync(lock, "utf8"))),
      { repository: repo, ref: "main", commit: p.sha },
    );
    assert.equal(git(cache, "config", "core.autocrlf"), "false");
    assert.equal(git(cache, "config", "core.eol"), "lf");
    assert.ok(!p.read("upstream/skills/alpha/SKILL.md").includes("\r"));
    assert.ok(p.read("upstream/skills/alpha/SKILL.md").includes(`${repo}/blob/${p.sha}/pstack/automations/nightly.md`));

    assert.match(sync().stdout, /Already current: main is still/);

    const plain = commit(p.upstream, { "pstack/agents/reviewer.md": "# reviewer v2\n" });
    const moved = sync();
    assert.equal(moved.status, 0, moved.stdout + moved.stderr);
    assert.match(moved.stdout, new RegExp(`moved from ${p.sha} to ${plain}`));
    assert.match(moved.stdout, /pstack\/agents\/reviewer\.md \| 2 \+-/);
    assert.doesNotMatch(moved.stdout, /REVIEW/);
    assert.equal(p.read("upstream/agents/reviewer.md"), "# reviewer v2\n");

    const mapped = commit(p.upstream, {
      "pstack/docs/harness/claude-code.md": "# Claude Code adapter\n\n| new row |\n",
      "pstack/agents/reviewer.md": "# reviewer v3\n",
    });
    const built = generated();
    const review = sync();
    assert.equal(review.status, 2, review.stdout + review.stderr);
    assert.equal(locked(), plain);
    assert.deepEqual(generated(), built);
    assert.match(review.stdout, /pstack\/docs\/harness\/claude-code\.md \| 2 \+\+/);
    assert.match(review.stdout, /={5,} REVIEW ={5,}/);
    assert.match(review.stdout, /^\+\| new row \|$/m);
    assert.match(review.stdout, /then run `node scripts\/sync\.mjs --reviewed`\.\n$/);

    const rerun = sync();
    assert.equal(rerun.status, 2, rerun.stdout + rerun.stderr);
    assert.match(rerun.stdout, /^\+\| new row \|$/m);
    assert.equal(locked(), plain);
    assert.deepEqual(generated(), built);

    const reviewed = sync("--reviewed");
    assert.equal(reviewed.status, 0, reviewed.stdout + reviewed.stderr);
    assert.match(reviewed.stdout, new RegExp(`moved from ${plain} to ${mapped}`));
    assert.match(reviewed.stdout, /pstack\/docs\/harness\/claude-code\.md \| 2 \+\+/);
    assert.match(reviewed.stdout, /^\+\| new row \|$/m);
    assert.equal(locked(), mapped);
    assert.equal(p.read("upstream/agents/reviewer.md"), "# reviewer v3\n");
  });
});
