var app = require("app");
var BrowserWindow = require("browser-window");
var ipc = require("ipc");
var dialog = require("dialog");
var promisify = require("promisify-node");
var fs = promisify(require("fs"));
var repository = require("./src/browser/repository");

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

  // if (repository.isReady()) {
  //   mainWindow.loadUrl("file://" + __dirname + "/index.html");
  // } else {
    mainWindow.loadUrl("file://" + __dirname + "/setup.html");
  // }

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
});

ipc.on("authorize", function (event, data) {
  repository.generateKeys(data.email, data.password, function () {
    repository.clone(function () {
      mainWindow.loadUrl("file://" + __dirname + "/index.html");
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
