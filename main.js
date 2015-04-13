var app           = require("app");
var BrowserWindow = require("browser-window");
var ipc           = require("ipc");
var dialog        = require("dialog");

var mainWindow = null;
var specWindow = null;

app.on("window-all-closed", function () {
  app.quit();
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
