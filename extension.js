const { registerCommandCenter } = require("./src/commandCenter");

function activate(context) {
  registerCommandCenter(context);
}

function deactivate() {}

module.exports = { activate, deactivate };
