import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const staged = process.argv.includes("--staged");
const files = [
  ...new Set(
    execFileSync(
      "git",
      staged
        ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
        : ["ls-files", "-c", "-o", "--exclude-standard", "-z"],
      { encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean),
  ),
];
const rules = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];
const issues = [];
let scanned = 0;
for (const file of files) {
  if (/(^|\/)(\.env(?:\..*)?)$/.test(file) && !file.endsWith(".env.example")) {
    issues.push(file + " (environment file)");
    continue;
  }
  if (/\.(img|tif|tiff|zip|tar|tgz)$/i.test(file)) {
    issues.push(file + " (raw/archive artifact)");
    continue;
  }
  if (/\.(png|jpg|jpeg|svg|woff2?)$/i.test(file)) continue;
  let bytes;
  try {
    bytes = staged
      ? execFileSync("git", ["show", `:${file}`], {
          maxBuffer: 8 * 1024 * 1024,
        })
      : readFileSync(file);
  } catch {
    issues.push(file + " (unreadable)");
    continue;
  }
  if (bytes.includes(0)) continue;
  scanned++;
  if (rules.some((pattern) => pattern.test(bytes.toString("utf8"))))
    issues.push(file + " (potential credential; value withheld)");
}
if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Secret/artifact checks passed for ${scanned} text files (${staged ? "staged contents" : "working tree"}). Pattern checks do not replace human review.`,
  );
