var fs            = require("fs-extra"),
    path          = require("path"),
    assign        = require("object-assign"),
    EventEmitter  = require("events").EventEmitter,
    PathWatcher   = require("pathwatcher"),
    Immutable     = require("immutable"),
    shell         = require("shell"),
    AppDispatcher = require("../dispatcher/AppDispatcher");

var _contentDir = path.resolve(__dirname, "../../repo/content");

var _files = Immutable.List();
var _activeFile = "";
var _watchers = {};


function getFileIndex(filePath) {
  return _files.findIndex(function (file) {
    return file.get("path") === filePath;
  });
}

function openFile(filePath) {
  var fileIndex = getFileIndex(filePath);
  if (fileIndex > -1) {
    setIndexAsActive(fileIndex);
    EditorStore.emitChange();
  } else {
    fs.readFile(path.join(_contentDir, filePath), {
      encoding: "utf-8"
    }, function (err, fileContent) {
      if (_activeFile) {
        _files = _files.setIn([getFileIndex(_activeFile), "active"], false);
      }

      // Add new file to store and set it as active
      _files = _files.push(Immutable.Map({
        name        : path.basename(filePath),
        path        : filePath,
        diskContent : fileContent,
        content     : fileContent,
        clean       : true,
        active      : true
      }));

      _activeFile = filePath;

      // Start watching the file
      addWatcher(filePath);

      EditorStore.emitChange();
    });
  }
}

function setIndexAsActive(fileIndex) {
  if (_activeFile) {
    _files = _files.setIn([getFileIndex(_activeFile), "active"], false);
  }
  _files = _files.update(fileIndex, function (file) {
    _activeFile = file.get("path");
    return file.set("active", true);
  });
}

function setAsActive(filePath) {
  setIndexAsActive(getFileIndex(filePath));
  EditorStore.emitChange();
}

function closeFile(filePath) {
  var fileIndex = getFileIndex(filePath);

  if (fileIndex === -1) return;

  if (filePath === _activeFile) {
    if (_files.size === 1) {
      _activeFile = "";
    } else {
      setIndexAsActive(fileIndex ? fileIndex - 1 : 1);
    }
  }

  _files = _files.remove(fileIndex);

  removeWatcher(filePath);

  EditorStore.emitChange();
}

function updateFile(filePath, content) {
  _files = _files.update(getFileIndex(filePath), function (file) {
    return file.set("content", content)
      .set("clean", file.get("diskContent") === content);
  });

  EditorStore.emitChange();
}

function saveFile(filePath, close) {
  var fileIndex = getFileIndex(filePath);
  var content = _files.getIn([fileIndex, "content"]);

  // Stop the watcher while we save
  removeWatcher(filePath);

  fs.outputFile(
    path.join(_contentDir, filePath),
    content,
    function (err) {
      if (err) {
        console.log(err);
      } else {
        if (close) {
          closeFile(filePath);
        } else {
          _files = _files.update(fileIndex, function (file) {
            return file.set("diskContent", content).set("clean", true);
          });
          // Restart the watcher
          addWatcher(filePath);
          EditorStore.emitChange();
        }
      }
    }
  );
}

function deleteFile(filePath) {
  closeFile(filePath);
  shell.moveItemToTrash(path.join(_contentDir, filePath));
}

var CHANGE_EVENT = "change";

var EditorStore = assign({}, EventEmitter.prototype, {
  getFiles: function () {
    return _files;
  },

  getFile: function (filePath) {
    return _files.get(getFileIndex(filePath));
  },

  emitChange: function () {
    this.emit(CHANGE_EVENT);
  },

  addChangeListener: function (listener) {
    this.on(CHANGE_EVENT, listener);
  },

  removeChangeListener: function (listener) {
    this.removeListener(CHANGE_EVENT, listener);
  }
});

EditorStore.dispatchToken = AppDispatcher.register(function (action) {
  switch(action.actionType) {
    case "editor_open":
      openFile(action.nodePath);
      break;
    case "editor_change":
      updateFile(action.nodePath, action.content);
      break;
    case "editor_focus":
      setAsActive(action.nodePath);
      break;
    case "editor_close":
      closeFile(action.nodePath);
      break;
    case "editor_save":
      saveFile(action.nodePath, action.close);
      break;
    case "editor_delete":
      deleteFile(action.nodePath);
      break;
    default:
      // no op
  }
});


var Watcher = function (filePath) {
  this.filePath = filePath;
  this.start();
};

Watcher.prototype.start = function () {
  this.watcher = PathWatcher.watch(path.join(_contentDir, this.filePath),
    this.updateFromDisk.bind(this));
};

Watcher.prototype.stop = function () {
  this.watcher.close();
  delete this.watcher;
};

Watcher.prototype.updateFromDisk = function () {
  fs.readFile(path.join(_contentDir, this.filePath), {
    encoding: "utf-8"
  }, function (err, fileContent) {
    var fileIndex = getFileIndex(this.filePath);
    if (err) {
      // File was deleted
      if (_files.getIn([fileIndex, "clean"])) {
        // File is clean so close the tab
        closeFile(this.filePath);
      } else {
        // File was dirty so clear disk content
        _files = _files.update(fileIndex, function (file) {
          return file.set("diskContent", "").set("clean", false);
        });

        // Remove the watcher
        removeWatcher(this.filePath);

        EditorStore.emitChange();
      }
    } else {
      // File changed on disk so update disk content and update
      // content if file was clean
      _files = _files.update(fileIndex, function (file) {
        return file.set("diskContent", fileContent)
          .set("content", file.get("clean") ? fileContent : file.get("content"));
      }).update(fileIndex, function (file) {
        return file.set("clean", file.get("content") === fileContent);
      });
      EditorStore.emitChange();
    }
  }.bind(this));
};

function removeWatcher(filePath) {
  if (_watchers[filePath]) {
    _watchers[filePath].stop();
    delete _watchers[filePath];
  }
}

function addWatcher(filePath) {
  if (_watchers[filePath]) {
    removeWatcher(filePath);
  }
  _watchers[filePath] = new Watcher(filePath);
}

module.exports = EditorStore;
