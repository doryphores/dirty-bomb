var app           = require("app");
var BrowserWindow = require("browser-window");
var ipc           = require("ipc");
var dialog        = require("dialog");

var mainWindow = null;
var specWindow = null;

app.on("window-all-closed", function () {
  if (process.platform != "darwin") {
    app.quit();
  }
});

app.on("ready", function () {
  mainWindow = new BrowserWindow({
    width  : 800,
    height : 600
  });

  mainWindow.maximize();
  mainWindow.openDevTools();
  mainWindow.loadUrl("file://" + __dirname + "/static/index.html");

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
});

ipc.on("dialog.message", function (event, options) {
  dialog.showMessageBox(mainWindow, options, function (button) {
    event.sender.send("dialog.message.callback", button);
  });
});

ipc.on("dialog.save", function (event, options) {
  dialog.showSaveDialog(mainWindow, options, function (savePath) {
    event.sender.send("dialog.save.callback", savePath);
  });
});

ipc.on("spec", function () {
  specWindow = new BrowserWindow({
    width: 800,
    height: 600
  });

  specWindow.maximize();
  specWindow.openDevTools();
  specWindow.loadUrl("file://" + __dirname + "/static/specs.html");

  specWindow.on("closed", function () {
    specWindow = null;
  });
});
