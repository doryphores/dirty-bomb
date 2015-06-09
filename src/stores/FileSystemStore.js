var jetpack           = require("fs-jetpack"),
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
      _contentDir = jetpack.cwd(_rootPath);
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
    _contentDir.readAsync(filePath).then(function (fileContent) {
      _watchFile(filePath);
      FileSystemActions.open.completed(fileContent);
    }).catch(function (err) {
      FileSystemActions.open.failed(err);
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
    _contentDir.writeAsync(filePath, content)
      .then(FileSystemActions.save.completed)
      .catch(FileSystemActions.save.failed);
  },

  create: function (dirPath) {
    // TODO: make it accept a node path and work out the default location
    Dialogs.promptForPath({
      title: "New file",
      defaultPath: _contentDir.path(dirPath)
    }, function (savePath) {
      if (_validFilePath(savePath)) {
        _contentDir.writeAsync(_relative(savePath), "").then(function () {
          FileSystemActions.create.completed(_relative(savePath));
        }).catch(FileSystemActions.create.failed);
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
      if (button === 1) shell.moveItemToTrash(_contentDir.path(nodePath));
    });
  },

  rename: function (nodePath, name) {
    // TODO: validate file/folder name
    if (!_contentDir.exists(path.join(path.dirname(nodePath), name))) {
      _contentDir.rename(nodePath, name);
    }
  },

  move: function (nodePath) {
    Dialogs.promptForDirectory({
      defaultPath: _contentDir.path(path.dirname(nodePath))
    }, function (dir) {
      // TODO: validate destination
      if (dir && dir.indexOf(_rootPath) === 0) {
        _contentDir.move(nodePath,
          _relative(path.join(dir, path.basename(nodePath))));
      }
    });
  },

  duplicate: function (filePath) {
    Dialogs.promptForPath({
      defaultPath: _contentDir.path(filePath)
    }, function (savePath) {
      if (_validFilePath(savePath)) {
        _contentDir.copyAsync(filePath, _relative(savePath))
          .then(function () {
            FileSystemActions.duplicate.completed(_relative(savePath));
          })
          .catch(FileSystemActions.duplicate.failed);
      } else {
        FileSystemActions.duplicate.failed(new Error("Invalid destination"));
      }
    });
  },

  duplicateDir: function (dirPath) {
    // TODO: not a proper duplicateDir, this merges the contents of dirPath
    // into the selected/created directory
    Dialogs.promptForDirectory({
      defaultPath: _contentDir.path(path.dirname(dirPath))
    }, function (savePath) {
      if (_validDirPath(savePath)) {
        _contentDir.copyAsync(dirPath, _relative(savePath), {
          overwrite: true
        }).then(function () {
          FileSystemActions.duplicateDir.completed(_relative(savePath));
        }).catch(FileSystemActions.duplicateDir.failed);
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

var _contentDir;
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
  _fileWatchers[filePath] = PathWatcher.watch(_contentDir.path(filePath),
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
  _dirWatchers[dirPath] = PathWatcher.watch(_contentDir.path(dirPath),
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
  _contentDir.readAsync(filePath).then(function (content) {
    FileSystemStore.trigger({
      nodePath: filePath,
      event: "changed",
      content: content
    });
  }).catch(function (err) {
    _unwatchFile(filePath);
    FileSystemStore.trigger({
      nodePath: filePath,
      event: "deleted"
    });
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

function _relative(nodePath) {
  return path.relative(_contentDir.path(), nodePath);
}

function _validDirPath(dirPath) {
  return path.extname(dirPath) === "" && dirPath.indexOf(_rootPath) === 0;
}

function _validFilePath(filePath) {
  return path.extname(filePath) === ".md" && filePath.indexOf(_rootPath) === 0;
}

function _nodeList(nodePath) {
  return _contentDir.list(nodePath, true).filter(function (node) {
    return !_.contains(_ignoredFiles, node.name);
  }).map(function (node) {
    return {
      name : node.name,
      path : path.join(nodePath, node.name),
      type : node.type == "dir" ? "folder" : "file"
    };
  }).sort(function nodeCompare(a, b) {
    if (a.type == b.type) return a.name.localeCompare(b.name);
    return a.type == "folder" ? -1 : 1;
  });
}
