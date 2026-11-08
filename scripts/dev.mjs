import { spawn, spawnSync } from "node:child_process";
// One documented command for the complete development stack; no new runtime dependency.
const build = spawnSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-p", "tsconfig.server.json"],
  { stdio: "inherit" },
);
if (build.status !== 0) process.exit(build.status ?? 1);
const env = { ...process.env, NODE_USE_ENV_PROXY: "1" };
const children = [
  spawn(
    process.execPath,
    [
      "node_modules/typescript/bin/tsc",
      "-p",
      "tsconfig.server.json",
      "--watch",
      "--preserveWatchOutput",
    ],
    { stdio: "inherit" },
  ),
  spawn(
    process.execPath,
    ["--env-file-if-exists=.env", "--watch", "dist-server/server/index.js"],
    { stdio: "inherit", env },
  ),
  spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", ...process.argv.slice(2)],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
