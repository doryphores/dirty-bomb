var fs            = require("fs-extra"),
    path          = require("path"),
    _             = require("underscore"),
    shell         = require("shell"),
    PathWatcher   = require("pathwatcher"),
    Dialogs       = require("../Dialogs"),
    Reflux        = require("reflux"),
    SettingsStore = require("../stores/SettingsStore");

var _contentDir = SettingsStore.getContentPath();
var _ignoredFiles = [".DS_Store", "Thumbs.db", ".git"];
var _fileWatchers = {};
var _dirWatchers = {};

var FileSystem = {
  fileChange: Reflux.createAction(),

  dirChange: Reflux.createAction(),

  getRootName: function () {
    return path.basename(_contentDir);
  },

  create: function (dirPath, done) {
    Dialogs.promptForPath({
      title: "New file",
      defaultPath: absolute(dirPath)
    }, function (savedPath) {
      if (savedPath) {
        fs.outputFile(savedPath, "", function (err) {
          if (err) return done(err);
          done(null, path.relative(_contentDir, savedPath));
        });
      }
    });
  },

  open: function (nodePath, done) {
    fs.readFile(absolute(nodePath), {
      encoding: "utf-8"
    }, function (err, fileContent) {
      if (err) return console.log(err);
      this._watchFile(nodePath);
      done(fileContent);
    }.bind(this));
  },

  close: function (nodePath) {
    this._unwatchFile(nodePath);
  },

  openDir: function (nodePath) {
    this._watchDir(nodePath);
    return nodeList(nodePath);
  },

  closeDir: function (nodePath) {
    this._unwatchDir(nodePath);
  },

  save: function (nodePath, content) {
    fs.outputFile(absolute(nodePath), content, function (err) {
      if (err) return console.log(err);
    });
  },

  rename: function (nodePath, name) {
    var newPath = absolute(path.join(path.dirname(nodePath), name));
    fs.exists(newPath, function (exists) {
      if (!exists) fs.rename(absolute(nodePath), newPath);
    });
  },

  move: function (nodePath) {
    Dialogs.promptForDirectory({
      defaultPath: absolute(path.dirname(nodePath))
    }, function (dir) {
      if (dir) {
        if (dir.indexOf(_contentDir) === 0) {
          fs.rename(absolute(nodePath), path.join(dir, path.basename(nodePath)));
        }
      }
    }.bind(this));
  },

  duplicate: function (nodePath, done) {
    Dialogs.promptForPath({
      defaultPath: absolute(nodePath)
    }, function (savePath) {
      if (savePath) {
        if (savePath.indexOf(_contentDir) === 0) {
          fs.copy(absolute(nodePath), savePath, {replace: false}, function (err) {
            if (err) done(err);
            done(null, path.relative(_contentDir, savePath));
          });
        } else {
          done(new Error("Location is outside the content root"));
        }
      }
    }.bind(this));
  },

  duplicateDir: function (nodePath, done) {
    Dialogs.promptForDirectory({
      defaultPath: absolute(path.dirname(nodePath))
    }, function (savePath) {
      if (savePath) {
        if (savePath.indexOf(_contentDir) === 0) {
          fs.copy(absolute(nodePath), savePath, function (err) {
            if (err) done(err);
            done(null, path.relative(_contentDir, savePath));
          });
        } else {
          done(new Error("Folder is outside the content root"));
        }
      }
    }.bind(this));
  },

  delete: function (nodePath) {
    Dialogs.confirm({
      message: "Are you sure you want to delete this item?",
      detail: "Your are deleting '" + nodePath + "'.",
      buttons: ["Cancel", "Move to trash"]
    }, function (button) {
      if (button === 1) shell.moveItemToTrash(absolute(nodePath));
    });
  },

  _watchFile: function (nodePath) {
    if (_fileWatchers[nodePath]) {
      _fileWatchers[nodePath].close();
    }
    _fileWatchers[nodePath] = PathWatcher.watch(absolute(nodePath),
      this._onFileChange.bind(this, nodePath));
  },

  _watchDir: function (nodePath) {
    if (_dirWatchers[nodePath]) {
      _dirWatchers[nodePath].close();
    }
    _dirWatchers[nodePath] = PathWatcher.watch(absolute(nodePath),
      this._onDirChange.bind(this, nodePath));
  },

  _unwatchFile: function (nodePath) {
    if (_fileWatchers[nodePath]) {
      _fileWatchers[nodePath].close();
      delete _fileWatchers[nodePath];
    }
  },

  _unwatchDir: function (nodePath) {
    for (var watchPath in _dirWatchers) {
      if (nodePath === "." || watchPath.match("^" + nodePath + "(\/|$)")) {
        _dirWatchers[watchPath].close();
        delete _dirWatchers[watchPath];
      }
    }
  },

  _onFileChange: function (nodePath) {
    fs.readFile(absolute(nodePath), {
      encoding: "utf-8"
    }, function (err, content) {
      if (err) {
        this._unwatchFile(nodePath);
        this.fileChange({
          nodePath: nodePath,
          event: "deleted"
        });
      } else {
        this.fileChange({
          nodePath: nodePath,
          event: "changed",
          content: content
        });
      }
    }.bind(this));
  },

  _onDirChange: function (nodePath, event) {
    if (event === "change") {
      this.dirChange({
        nodePath: nodePath,
        nodeList: nodeList(nodePath)
      });
    }
  }
};

module.exports = FileSystem;

function absolute(filePath) {
  return path.join(_contentDir, filePath);
}

function nodeList(nodePath) {
  return _.difference(fs.readdirSync(absolute(nodePath)), _ignoredFiles).map(function (filename) {
    var s = fs.statSync(absolute(path.join(nodePath, filename)));
    return {
      name : filename,
      path : path.join(nodePath, filename),
      type : s.isDirectory() ? "folder" : "file"
    };
  }).sort(function nodeCompare(a, b) {
    if (a.type == b.type) return a.name.localeCompare(b.name);
    return a.type == "folder" ? -1 : 1;
  });
}
