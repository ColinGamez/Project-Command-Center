import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const expectedName = "project-command-center";
const expectedCommands = ["project-command-center.open","project-command-center.refresh","project-command-center.runBestScript","project-command-center.openTerminal","project-command-center.openRepository","project-command-center.createMissingBasics"];
const files = ["extension.js","src/commandCenter.js","src/project.js"];

if (pkg.name !== expectedName) {
  throw new Error(`package name must be ${expectedName}`);
}

const contributedCommands = new Set((pkg.contributes?.commands ?? []).map((item) => item.command));
for (const command of expectedCommands) {
  if (!contributedCommands.has(command)) {
    throw new Error(`missing contributed command: ${command}`);
  }
}

for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

console.log("Colin's Project Command Center package check passed.");
