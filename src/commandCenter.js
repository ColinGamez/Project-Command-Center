const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { SCRIPT_PRIORITY, projectSnapshot, scriptCommand, bestScript } = require("./project");

class CommandCenterNode extends vscode.TreeItem {
  constructor(label, options = {}) {
    super(label, options.collapsibleState ?? vscode.TreeItemCollapsibleState.None);
    this.nodeType = options.nodeType;
    this.description = options.description;
    this.tooltip = options.tooltip;
    this.contextValue = options.contextValue;
    this.command = options.command;

    if (options.icon) {
      this.iconPath = new vscode.ThemeIcon(options.icon);
    }
  }
}

class ProjectCommandCenterProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  async getChildren(element) {
    const snapshot = projectSnapshot();

    if (!snapshot.root) {
      return [
        new CommandCenterNode("Open a folder", {
          description: "Command Center needs a workspace",
          icon: "folder-opened",
          command: {
            command: "workbench.action.files.openFolder",
            title: "Open Folder"
          }
        })
      ];
    }

    if (!element) {
      return commandCenterRootItems(snapshot);
    }

    if (element.nodeType === "quickActions") {
      return commandCenterQuickActions(snapshot);
    }

    if (element.nodeType === "scripts") {
      return commandCenterScriptItems(snapshot);
    }

    if (element.nodeType === "git") {
      return commandCenterGitItems(snapshot);
    }

    if (element.nodeType === "health") {
      return commandCenterHealthItems(snapshot);
    }

    if (element.nodeType === "reactor") {
      return commandCenterReactorItems(snapshot);
    }

    return [];
  }
}

function commandCenterRootItems(snapshot) {
  return [
    new CommandCenterNode(snapshot.name, {
      description: snapshot.projectTypes.join(" / "),
      tooltip: snapshot.root,
      icon: "rocket"
    }),
    new CommandCenterNode("Quick Actions", {
      nodeType: "quickActions",
      description: "Run + open",
      icon: "zap",
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded
    }),
    new CommandCenterNode(`Scripts (${snapshot.scripts.length})`, {
      nodeType: "scripts",
      description: snapshot.packageManager,
      icon: "terminal",
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
    }),
    new CommandCenterNode(snapshot.git.isRepo ? `Git: ${snapshot.git.branch || "repo"}` : "Git", {
      nodeType: "git",
      description: snapshot.git.isRepo ? `${snapshot.git.changes} changes` : "not detected",
      icon: "git-branch",
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
    }),
    new CommandCenterNode(`Health ${snapshot.health.ok}/${snapshot.health.total}`, {
      nodeType: "health",
      description: snapshot.health.ok === snapshot.health.total ? "solid" : "needs polish",
      icon: snapshot.health.ok === snapshot.health.total ? "pass" : "warning",
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
    }),
    new CommandCenterNode("Theme Reactor", {
      nodeType: "reactor",
      description: vscode.workspace.getConfiguration("themeReactor").get("reactor.enabled") ? "on" : "off",
      icon: "sparkle",
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
    })
  ];
}

function commandCenterQuickActions(snapshot) {
  const items = [
    new CommandCenterNode("Create Bug Report", {
      description: "Issue draft",
      icon: "bug",
      command: {
        command: "bug-report-builder.create",
        title: "Create Bug Report"
      }
    }),
    new CommandCenterNode("Open Launch Pad", {
      description: "Workspace launcher",
      icon: "rocket",
      command: {
        command: "colins-launch-pad.open",
        title: "Open Launch Pad"
      }
    }),
    new CommandCenterNode("Open README Studio", {
      description: "Build project docs",
      icon: "preview",
      command: {
        command: "colins-readme-studio.open",
        title: "Open README Studio"
      }
    }),
    new CommandCenterNode("Forge Snippet From Selection", {
      description: "Selection to snippet",
      icon: "symbol-snippet",
      command: {
        command: "snippet-forge.createFromSelection",
        title: "Forge Snippet From Selection"
      }
    }),
    new CommandCenterNode("Run Best Script", {
      description: bestScript(snapshot) || "no scripts",
      icon: "play",
      command: {
        command: "project-command-center.runBestScript",
        title: "Run Best Script"
      }
    }),
    new CommandCenterNode("Open Terminal Here", {
      description: path.basename(snapshot.root),
      icon: "terminal",
      command: {
        command: "project-command-center.openTerminal",
        title: "Open Terminal Here"
      }
    })
  ];

  if (snapshot.readme) {
    items.push(
      new CommandCenterNode("Open README", {
        description: snapshot.readme,
        icon: "book",
        command: {
          command: "project-command-center.openFile",
          title: "Open README",
          arguments: [snapshot.readme]
        }
      })
    );
  }

  if (snapshot.git.remoteUrl) {
    items.push(
      new CommandCenterNode("Open Repository", {
        description: "GitHub",
        icon: "repo",
        command: {
          command: "project-command-center.openRepository",
          title: "Open Repository"
        }
      })
    );
  }

  items.push(
    new CommandCenterNode("Create Missing Basics", {
      description: "README + .gitignore",
      icon: "wand",
      command: {
        command: "project-command-center.createMissingBasics",
        title: "Create Missing Basics"
      }
    })
  );

  return items;
}

function commandCenterScriptItems(snapshot) {
  if (!snapshot.scripts.length) {
    return [
      new CommandCenterNode("No package scripts found", {
        description: "Add scripts to package.json",
        icon: "info"
      })
    ];
  }

  return snapshot.scripts.map(
    (scriptName) =>
      new CommandCenterNode(scriptName, {
        description: scriptCommand(snapshot.packageManager, scriptName),
        tooltip: snapshot.packageJson?.scripts?.[scriptName],
        icon: SCRIPT_PRIORITY.includes(scriptName) ? "play" : "symbol-method",
        command: {
          command: "project-command-center.runScript",
          title: `Run ${scriptName}`,
          arguments: [scriptName]
        }
      })
  );
}

function commandCenterGitItems(snapshot) {
  if (!snapshot.git.isRepo) {
    return [
      new CommandCenterNode("Git repo not detected", {
        description: "No branch or remote",
        icon: "info"
      })
    ];
  }

  const items = [
    new CommandCenterNode("Branch", {
      description: snapshot.git.branch || "detached",
      icon: "git-branch"
    }),
    new CommandCenterNode("Working Tree", {
      description: snapshot.git.changes ? `${snapshot.git.changes} changed files` : "clean",
      icon: snapshot.git.changes ? "diff" : "pass"
    })
  ];

  if (snapshot.git.remoteUrl) {
    items.push(
      new CommandCenterNode("Open Remote", {
        description: "browser",
        tooltip: snapshot.git.remoteUrl,
        icon: "link-external",
        command: {
          command: "project-command-center.openRepository",
          title: "Open Remote"
        }
      })
    );
  }

  return items;
}

function commandCenterHealthItems(snapshot) {
  return snapshot.health.checks.map(
    (check) =>
      new CommandCenterNode(check.ok ? check.label : check.missing, {
        description: check.ok ? "ok" : "missing",
        icon: check.ok ? "pass" : "warning",
        command: check.create
          ? {
              command: "project-command-center.openOrCreateFile",
              title: `Open ${check.create}`,
              arguments: [check.create]
            }
          : undefined
      })
  );
}

function commandCenterReactorItems() {
  const config = vscode.workspace.getConfiguration("themeReactor");
  const enabled = config.get("reactor.enabled", false);
  const mode = config.get("reactor.mode", "hybrid");

  return [
    new CommandCenterNode(enabled ? "Theme Reactor On" : "Theme Reactor Off", {
      description: mode,
      icon: enabled ? "radio-tower" : "circle-slash"
    }),
    new CommandCenterNode("Apply Reactor Now", {
      icon: "sync",
      command: {
        command: "theme-reactor.applyThemeReactorNow",
        title: "Apply Reactor Now"
      }
    }),
    new CommandCenterNode("Random Favorite", {
      icon: "symbol-color",
      command: {
        command: "theme-reactor.randomReactorFavorite",
        title: "Random Favorite"
      }
    }),
    new CommandCenterNode("Set Workspace Theme", {
      icon: "settings-gear",
      command: {
        command: "theme-reactor.setReactorWorkspaceTheme",
        title: "Set Workspace Theme"
      }
    })
  ];
}

function commandCenterTerminal(snapshot = projectSnapshot()) {
  return vscode.window.createTerminal({
    name: "Colin's Command Center",
    cwd: snapshot.root
  });
}

async function runProjectScript(scriptName) {
  const snapshot = projectSnapshot();

  if (!snapshot.root || !snapshot.scripts.includes(scriptName)) {
    vscode.window.showWarningMessage(`Colin's Command Center: script "${scriptName}" was not found.`);
    return;
  }

  const terminal = commandCenterTerminal(snapshot);
  terminal.show();
  terminal.sendText(scriptCommand(snapshot.packageManager, scriptName));
}

async function runBestProjectScript() {
  const snapshot = projectSnapshot();
  const scriptName = bestScript(snapshot);

  if (!scriptName) {
    vscode.window.showInformationMessage("Colin's Command Center: no runnable package scripts found.");
    return;
  }

  await runProjectScript(scriptName);
}

async function openProjectTerminal() {
  const snapshot = projectSnapshot();

  if (!snapshot.root) {
    vscode.window.showWarningMessage("Colin's Command Center: open a folder first.");
    return;
  }

  const terminal = commandCenterTerminal(snapshot);
  terminal.show();
}

async function openWorkspaceFile(relativePath) {
  const snapshot = projectSnapshot();

  if (!snapshot.root || !relativePath) {
    return;
  }

  const fileUri = vscode.Uri.file(path.join(snapshot.root, relativePath));
  await vscode.window.showTextDocument(fileUri);
}

async function openProjectRepository() {
  const snapshot = projectSnapshot();

  if (!snapshot.git?.remoteUrl) {
    vscode.window.showInformationMessage("Colin's Command Center: no repository URL found.");
    return;
  }

  await vscode.env.openExternal(vscode.Uri.parse(snapshot.git.remoteUrl));
}

function starterFileContents(fileName, snapshot) {
  if (fileName === "README.md") {
    return `# ${snapshot.name}\n\n## Getting Started\n\nAdd setup and usage notes here.\n\n## Scripts\n\nDocument the main commands for this project.\n`;
  }

  if (fileName === ".gitignore") {
    return "node_modules/\n.vscode/\n.env\n.env.local\n*.log\n.DS_Store\ndist/\nbuild/\n";
  }

  return "";
}

async function openOrCreateWorkspaceFile(relativePath) {
  const snapshot = projectSnapshot();

  if (!snapshot.root || !relativePath) {
    return;
  }

  const filePath = path.join(snapshot.root, relativePath);

  if (!fs.existsSync(filePath)) {
    const answer = await vscode.window.showWarningMessage(
      `Create ${relativePath} in this workspace?`,
      { modal: false },
      "Create"
    );

    if (answer !== "Create") {
      return;
    }

    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(filePath),
      Buffer.from(starterFileContents(relativePath, snapshot), "utf8")
    );
  }

  await openWorkspaceFile(relativePath);
}

async function createMissingBasics() {
  const snapshot = projectSnapshot();

  if (!snapshot.root) {
    vscode.window.showWarningMessage("Colin's Command Center: open a folder first.");
    return;
  }

  const basics = ["README.md", ".gitignore"].filter((fileName) => !fs.existsSync(path.join(snapshot.root, fileName)));

  if (!basics.length) {
    vscode.window.showInformationMessage("Colin's Command Center: README and .gitignore already exist.");
    return;
  }

  const answer = await vscode.window.showWarningMessage(
    `Create ${basics.join(" and ")}?`,
    { modal: false },
    "Create"
  );

  if (answer !== "Create") {
    return;
  }

  for (const fileName of basics) {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(path.join(snapshot.root, fileName)),
      Buffer.from(starterFileContents(fileName, snapshot), "utf8")
    );
  }

  vscode.window.showInformationMessage(`Colin's Command Center: created ${basics.join(" and ")}.`);
}

async function openCommandCenter() {
  await vscode.commands.executeCommand("project-command-center.view.focus");
}


function registerCommandCenter(context) {
  const commandCenterProvider = new ProjectCommandCenterProvider();

  context.subscriptions.push(
    vscode.window.createTreeView("project-command-center.view", {
      treeDataProvider: commandCenterProvider,
      showCollapseAll: true
    }),
    vscode.commands.registerCommand("project-command-center.open", openCommandCenter),
    vscode.commands.registerCommand("project-command-center.refresh", () => commandCenterProvider.refresh()),
    vscode.commands.registerCommand("project-command-center.runScript", runProjectScript),
    vscode.commands.registerCommand("project-command-center.runBestScript", runBestProjectScript),
    vscode.commands.registerCommand("project-command-center.openTerminal", openProjectTerminal),
    vscode.commands.registerCommand("project-command-center.openFile", openWorkspaceFile),
    vscode.commands.registerCommand("project-command-center.openOrCreateFile", openOrCreateWorkspaceFile),
    vscode.commands.registerCommand("project-command-center.openRepository", openProjectRepository),
    vscode.commands.registerCommand("project-command-center.createMissingBasics", createMissingBasics)
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => commandCenterProvider.refresh()),
    vscode.workspace.onDidSaveTextDocument((document) => {
      const fileName = path.basename(document.uri.fsPath).toLowerCase();

      if (["package.json", "readme.md", ".gitignore", "license", "license.md"].includes(fileName)) {
        commandCenterProvider.refresh();
      }
    }),
    vscode.workspace.onDidCreateFiles(() => commandCenterProvider.refresh()),
    vscode.workspace.onDidDeleteFiles(() => commandCenterProvider.refresh())
  );
}

module.exports = { registerCommandCenter };
