var remote = require("remote");

function getCurrentWindow() {
  return remote.getCurrentWindow()
}

var Dialogs = {
  confirm: function (options, callback) {
    return remote.require("dialog").showMessageBox(getCurrentWindow(), options, function (button) {
      if (callback) callback(button);
    });
  },

  promptForPath: function (options, callback) {
    return remote.require("dialog").showSaveDialog(getCurrentWindow(), options, function (savePath) {
      if (callback) callback(savePath);
    });
  }
};

module.exports = Dialogs;
