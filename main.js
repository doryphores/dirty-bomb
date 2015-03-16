var app           = require("app");
var BrowserWindow = require("browser-window");
var ipc           = require("ipc");
var dialog        = require("dialog");
var promisify     = require("promisify-node");
var fs            = promisify(require("fs"));
var repository    = require("./src/repository");

var mainWindow = null;

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

  repository.setup(function (ready) {
    mainWindow.loadUrl("file://" + __dirname + "/src/html/" + (ready ? "index" : "setup") + ".html");
  });

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
});

ipc.on("dev.reload", function (event) {
  mainWindow.reload();
});

ipc.on("authorize", function (event, data) {
  repository.setupAuthentication(data.email, data.password, function () {
    repository.clone(function (cloned) {
      mainWindow.loadUrl("file://" + __dirname + "/src/html/index.html");
    })
  });
});

var currentFile = null;

ipc.on("open", function (event) {
  dialog.showOpenDialog(mainWindow, {
    defaultPath: __dirname + "/repo",
    filters: [{name: "Content files", extensions: ["md"]}],
    properties: ["openFile"]
  }, function (paths) {
    currentFile = paths[0];
    fs.readFile(currentFile).then(function (data) {
      event.sender.send("load-file-data", {
        fileName    : currentFile,
        fileContent : data.toString("utf-8")
      });
    });
  });
});

ipc.on("save", function (event, data) {
  fs.writeFile(currentFile, data).then(function () {
    console.log("File saved");
  });
});
