# Colin's Project Command Center

A focused VS Code sidebar for quickly understanding and operating the workspace you have open.

## Features

- Detect project type, package manager, package scripts, Git branch, remote URL, and working tree state.
- Run the best available script or any package script from the sidebar.
- Open a terminal, README, repository remote, or starter project files.
- Surface basic project health checks for README, .gitignore, license, CI, build, test, and lint coverage.
- Link into Colin's standalone tools when they are installed.

## Usage

Open the **Command Center** activity bar view, or run **Colin's Project Command Center: Open Project Command Center** from the Command Palette.

## Local Development

```sh
npm install
npm run build
npx @vscode/vsce package --allow-missing-repository
```
