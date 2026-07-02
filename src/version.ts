import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Single source of truth for the server's version: the package manifest.
// Works from both src/ (tsx dev) and dist/server/ (compiled npm package) by
// walking up from the module until the right package.json is found.
function readPackageVersion(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 4; i++) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
        name?: string;
        version?: string;
      };
      if (pkg.name === "@real-case/sigil" && pkg.version) return pkg.version;
    } catch {
      // keep climbing
    }
    dir = dirname(dir);
  }
  return "0.0.0";
}

export const SIGIL_VERSION = readPackageVersion();
