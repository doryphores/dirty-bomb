var app = require("app");
var BrowserWindow = require("browser-window");
var nodegit = require("nodegit");
var ipc = require("ipc");
var dialog = require("dialog");
var promisify = require("promisify-node");
var fs = promisify(require("fs"));

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
  
  mainWindow.loadUrl("file://" + __dirname + "/index.html");
  
  mainWindow.on("closed", function () {
    mainWindow = null;
  });
});

ipc.on("clone", function () {
  nodegit.Clone.clone("https://github.com/doryphores/testing.git", __dirname + "/repo", {
    remoteCallbacks: {
      // credentials: function () {
      //   return nodegit.Cred.userpassPlaintextNew("doryphores", "");
      // },
      certificateCheck: function() {
        return 1;
      }
    }
  }).done(function () {
    console.log("Done");
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
