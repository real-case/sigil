import { spawnSync } from "node:child_process";
import { WIDGETS } from "../src/registry.js";

for (const widget of WIDGETS) {
  const result = spawnSync("vite", ["build"], {
    stdio: "inherit",
    env: { ...process.env, WIDGET: widget.name },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
