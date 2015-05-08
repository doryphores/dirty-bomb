var fs                = require("fs-extra"),
    path              = require("path"),
    _                 = require("underscore"),
    shell             = require("shell"),
    PathWatcher       = require("pathwatcher"),
    Dialogs           = require("../Dialogs"),
    Reflux            = require("reflux"),
    RepoStore         = require("../stores/RepoStore"),
    FileSystemActions = require("../actions/FileSystemActions");


var FileSystemStore = Reflux.createStore({
  listenables: FileSystemActions,

  init: function () {
    this.listenTo(RepoStore, this.setup);
  },

  setup: function () {
    if (RepoStore.isReady() && RepoStore.getContentPath() !== _rootPath) {
      _rootPath = RepoStore.getContentPath();
      this.trigger({
        nodePath: ".",
        event: "ready",
        rootName: path.basename(_rootPath)
      });
    }
  },

  getDirContents: function (dirPath) {
    return _nodeList(dirPath);
  },

  open: function (filePath) {
    fs.readFile(_absolute(filePath), {
      encoding: "utf-8"
    }, function (err, fileContent) {
      if (err) {
        FileSystemActions.open.failed(err);
      } else {
        _watchFile(filePath);
        FileSystemActions.open.completed(fileContent);
      }
    });
  },

  close: function (filePath) {
    _unwatchFile(filePath);
  },

  openDir: function (dirPath) {
    _watchDir(dirPath);
  },

  closeDir: function (dirPath) {
    _unwatchDir(dirPath);
  },

  save: function (filePath, content) {
    fs.outputFile(_absolute(filePath), content, function (err) {
      if (err) {
        FileSystemActions.save.failed(err);
      } else {
        FileSystemActions.save.completed();
      }
    });
  },

  create: function (dirPath) {
    // TODO: make it accept a node path and work out the default location
    Dialogs.promptForPath({
      title: "New file",
      defaultPath: _absolute(dirPath)
    }, function (savePath) {
      if (_validFilePath(savePath)) {
        fs.outputFile(savePath, "", function (err) {
          if (err) {
            FileSystemActions.create.failed(err);
          } else {
            FileSystemActions.create.completed(_relative(savePath));
          }
        });
      } else {
        FileSystemActions.create.completed(false);
      }
    });
  },

  delete: function (nodePath) {
    Dialogs.confirm({
      message: "Are you sure you want to delete this item?",
      detail: "Your are deleting '" + nodePath + "'.",
      buttons: ["Cancel", "Move to trash"]
    }, function (button) {
      if (button === 1) shell.moveItemToTrash(_absolute(nodePath));
    });
  },

  rename: function (nodePath, name) {
    var newPath = _absolute(path.join(path.dirname(nodePath), name));
    // TODO: validate file/folder name
    fs.exists(newPath, function (exists) {
      if (!exists) {
        fs.rename(_absolute(nodePath), newPath);
      }
    });
  },

  move: function (nodePath) {
    Dialogs.promptForDirectory({
      defaultPath: _absolute(path.dirname(nodePath))
    }, function (dir) {
      // TODO: validate destination
      if (dir && dir.indexOf(_rootPath) === 0) {
        fs.rename(_absolute(nodePath), path.join(dir, path.basename(nodePath)));
      }
    });
  },

  duplicate: function (filePath) {
    Dialogs.promptForPath({
      defaultPath: _absolute(filePath)
    }, function (savePath) {
      console.log(savePath);
      if (_validFilePath(savePath)) {
        fs.copy(_absolute(filePath), savePath, function (err) {
          if (err) {
            FileSystemActions.duplicate.failed(err);
          } else {
            FileSystemActions.duplicate.completed(_relative(savePath));
          }
        });
      } else {
        FileSystemActions.duplicate.failed(new Error("Invalid destination"));
      }
    });
  },

  duplicateDir: function (dirPath) {
    // TODO: not a proper duplicateDir, this copies the contents of dirPath
    // into the selected/created directory
    Dialogs.promptForDirectory({
      defaultPath: _absolute(path.dirname(dirPath))
    }, function (savePath) {
      if (_validDirPath(savePath)) {
        fs.copy(_absolute(dirPath), savePath, function (err) {
          if (err) {
            FileSystemActions.duplicateDir.failed(err);
          } else {
            FileSystemActions.duplicateDir.completed(_relative(savePath));
          }
        });
      } else {
        FileSystemActions.duplicateDir.failed(new Error("Invalid destination"));
      }
    });
  }
});

module.exports = FileSystemStore;


/* ======================================== *\
   Private properties
\* ======================================== */

var _rootPath;
var _ignoredFiles = [".DS_Store", "Thumbs.db", ".git"];
var _fileWatchers = {};
var _dirWatchers = {};


/* ======================================= *\
   PRIVATE METHODS
\* ======================================= */

function _watchFile(filePath) {
  if (_fileWatchers[filePath]) {
    _fileWatchers[filePath].close();
  }
  _fileWatchers[filePath] = PathWatcher.watch(_absolute(filePath),
    _onFileChange.bind(null, filePath));
}

function _unwatchFile(filePath) {
  if (_fileWatchers[filePath]) {
    _fileWatchers[filePath].close();
    delete _fileWatchers[filePath];
  }
}

function _watchDir(dirPath) {
  if (_dirWatchers[dirPath]) {
    _dirWatchers[dirPath].close();
  }
  _dirWatchers[dirPath] = PathWatcher.watch(_absolute(dirPath),
    _onDirChange.bind(null, dirPath));
}

function _unwatchDir(dirPath) {
  for (var watchPath in _dirWatchers) {
    if (dirPath === "." || watchPath.match("^" + dirPath + "(\/|$)")) {
      _dirWatchers[watchPath].close();
      delete _dirWatchers[watchPath];
    }
  }
}

function _onFileChange(filePath) {
  fs.readFile(_absolute(filePath), {
    encoding: "utf-8"
  }, function (err, content) {
    if (err) {
      _unwatchFile(filePath);
      FileSystemStore.trigger({
        nodePath: filePath,
        event: "deleted"
      });
    } else {
      FileSystemStore.trigger({
        nodePath: filePath,
        event: "changed",
        content: content
      });
    }
  });
}

function _onDirChange(dirPath, event) {
  if (event === "change") {
    FileSystemStore.trigger({
      nodePath: dirPath,
      event: "dir_change",
      content: _nodeList(dirPath)
    });
  }
}

function _absolute(nodePath) {
  return path.join(_rootPath, nodePath);
}

function _relative(nodePath) {
  return path.relative(_rootPath, nodePath);
}

function _validDirPath(dirPath) {
  return path.extname(dirPath) === "" && dirPath.indexOf(_rootPath) === 0;
}

function _validFilePath(filePath) {
  return path.extname(filePath) === ".md" && filePath.indexOf(_rootPath) === 0;
}

function _nodeList(nodePath) {
  return _.difference(fs.readdirSync(_absolute(nodePath)), _ignoredFiles).map(function (nodeName) {
    var s = fs.statSync(_absolute(path.join(nodePath, nodeName)));
    return {
      name : nodeName,
      path : path.join(nodePath, nodeName),
      type : s.isDirectory() ? "folder" : "file"
    };
  }).sort(function nodeCompare(a, b) {
    if (a.type == b.type) return a.name.localeCompare(b.name);
    return a.type == "folder" ? -1 : 1;
  });
}
