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
      callback(savePath);
    });
  },

  promptForFile: function (options, callback) {
    options.properties = ["openFile"];
    return remote.require("dialog").showOpenDialog(getCurrentWindow(), options, function (filenames) {
      if (filenames === undefined) callback();
      else callback(filenames[0]);
    });
  },

  promptForDirectory: function (options, callback) {
    options.properties = ["openDirectory"];
    return remote.require("dialog").showOpenDialog(getCurrentWindow(), options, function (filenames) {
      if (filenames === undefined) callback();
      else callback(filenames[0]);
    });
  }
};

module.exports = Dialogs;
