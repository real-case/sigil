// Pin for a defect class no other gate here can see: a module that ships inside
// `dist/server` importing a package that `package.json` never declares. It
// resolves in this repo and on a consumer's npm install alike, because npm
// hoists the copy some *other* dependency brought — right up until a strict
// layout (pnpm, Yarn PnP) or a dependency dropping its own copy takes it away,
// and `npx sigil` dies on the import with nothing having gone red first. `zod`
// shipped exactly that way: imported by all eleven tool modules, declared by
// none of them.
//
// The graph is walked from the two published entry points rather than listed,
// so a new tools/ or shared/ module is covered the day it lands.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..");
const REPO_ROOT = join(SRC, "..");

// The two things package.json points at: `bin` and `main`.
const ENTRY_POINTS = [join(SRC, "stdio.ts"), join(SRC, "server.ts")];

const BUILTINS = new Set(builtinModules);

// Matches static `from "x"`, bare side-effect `import "x"`, and dynamic
// `import("x")` — the three ways a specifier reaches the emitted JS.
const IMPORT_RE = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

/**
 * Source is written with `.js` specifiers under moduleResolution "Bundler", so
 * "./tools/index.js" is `src/tools/index.ts` on disk.
 */
function resolveRelative(fromFile: string, spec: string): string | null {
  const base = join(dirname(fromFile), spec);
  const candidates = [base.replace(/\.js$/, ".ts"), `${base}.ts`, base];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

/** "@scope/pkg/sub" → "@scope/pkg"; "pkg/sub" → "pkg". */
function packageOf(spec: string): string {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
}

/**
 * Every bare package imported by the entry points' transitive source graph,
 * plus the files the walk visited — the second is what proves the first is not
 * vacuous.
 */
function collectServerImports(): {
  byPackage: Map<string, string[]>;
  visited: Set<string>;
} {
  const byPackage = new Map<string, string[]>();
  const seen = new Set<string>();
  const queue = [...ENTRY_POINTS];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(IMPORT_RE)) {
      const spec = match[1]!;
      if (spec.startsWith(".")) {
        const next = resolveRelative(file, spec);
        if (next) queue.push(next);
        continue;
      }
      if (spec.startsWith("node:") || BUILTINS.has(packageOf(spec))) continue;
      const pkg = packageOf(spec);
      const importers = byPackage.get(pkg) ?? [];
      importers.push(relative(REPO_ROOT, file));
      byPackage.set(pkg, importers);
    }
  }
  return { byPackage, visited: seen };
}

describe("published server dependencies", () => {
  const manifest = JSON.parse(
    readFileSync(join(REPO_ROOT, "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };
  const declared = new Set(Object.keys(manifest.dependencies ?? {}));
  const { byPackage: imported, visited } = collectServerImports();

  it("reaches every tool module from an entry point", () => {
    // Guards the walk itself: a resolver that quietly returned null for every
    // relative import would leave `imported` near-empty and the pin below
    // vacuously green. Stated as the files reached rather than as some
    // package's importer count, which moves whenever a dependency does — it
    // used to count zod's eleven importing tool modules, and then the schemas
    // moved into one shared module and took the count with them.
    const walked = [...visited].map((f) => relative(REPO_ROOT, f));
    const toolModules = walked.filter((f) => f.startsWith("src/tools/"));
    expect(toolModules.length, `only walked: ${walked.join(", ")}`).toBe(12);
  });

  it("declares every package the server bundle imports", () => {
    const undeclared = [...imported]
      .filter(([pkg]) => !declared.has(pkg))
      .map(([pkg, importers]) => `${pkg} (imported by ${importers.sort()[0]})`);

    expect(
      undeclared,
      "these resolve today only because npm hoists another dependency's copy",
    ).toEqual([]);
  });
});
