var fs                = require("fs-extra"),
    path              = require("path"),
    Immutable         = require("immutable"),
    shell             = require("shell"),
    SettingsStore     = require("./SettingsStore"),
    EditorActions     = require("../actions/EditorActions"),
    FileSystemStore   = require("./FileSystemStore"),
    FileSystemActions = require("../actions/FileSystemActions");

var _contentDir = SettingsStore.getContentPath();;

var _files = Immutable.List();
var _activeFile = "";

var EditorStore = Reflux.createStore({
  listenables: EditorActions,

  init: function () {
    this.listenTo(FileSystemStore, this.onFSChange);
  },

  onFSChange: function (fsEvent) {
    var nodePath = path.relative(_contentDir, fsEvent.nodePath);
    var fileIndex = getFileIndex(nodePath);
    if (fileIndex === -1) return;
    if (fsEvent.event === "deleted") {
      // File was deleted
      if (_files.getIn([fileIndex, "clean"])) {
        // File is clean so close the tab
        closeFile(nodePath);
      } else {
        // File was dirty so clear disk content
        _files = _files.update(fileIndex, function (file) {
          return file.merge({
            diskContent: "",
            clean: false
          });
        });
      }
    } else {
      // File changed on disk so update disk content and update
      // content if file was clean
      _files = _files.update(fileIndex, function (file) {
        var newContent = file.get("clean") ? fsEvent.content : file.get("content");
        return file.merge({
          diskContent: fsEvent.content,
          content: newContent,
          clean: newContent === fsEvent.content
        });
      });
    }
    this.emitChange();
  },

  getInitialState: function () {
    return _files;
  },

  getFile: function (filePath) {
    return _files.get(getFileIndex(filePath));
  },

  onOpen: function (filePath) {
    openFile(filePath, this.emitChange.bind(this));
  },

  onChange: function (filePath, content) {
    updateFile(filePath, content);
    this.emitChange();
  },

  onFocus: function (filePath) {
    setAsActive(filePath);
    this.emitChange();
  },

  onClose: function (filePath) {
    closeFile(filePath);
    this.emitChange();
  },

  onSave: function (filePath, close) {
    saveFile(filePath, function (err) {
      if (err) {
        console.log(err);
      } else {
        if (close) {
          closeFile(filePath);
        }
        this.emitChange();
      }
    }.bind(this));
  },

  onDelete: function (filePath) {
    deleteFile(filePath);
    this.emitChange();
  },

  emitChange: function () {
    this.trigger(_files);
  }
});

module.exports = EditorStore;

/* ======================================== *\
   Private functions
\* ======================================== */

function absolute(filePath) {
  return path.join(_contentDir, filePath);
}

function getFileIndex(filePath) {
  return _files.findIndex(function (file) {
    return file.get("path") === filePath;
  });
}

function openFile(filePath, done) {
  var fileIndex = getFileIndex(filePath);
  if (fileIndex > -1) {
    setIndexAsActive(fileIndex);
    done();
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
      FileSystemActions.watch(absolute(filePath));
      done();
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

  FileSystemActions.unwatch(absolute(filePath));
}

function updateFile(filePath, content) {
  _files = _files.update(getFileIndex(filePath), function (file) {
    return file.merge({
      content: content,
      clean: file.get("diskContent") === content
    });
  });
}

function saveFile(filePath, done) {
  var fileIndex = getFileIndex(filePath);
  var content = _files.getIn([fileIndex, "content"]);

  // Stop the watcher while we save
  FileSystemActions.unwatch(absolute(filePath));

  fs.outputFile(
    path.join(_contentDir, filePath),
    content,
    function (err) {
      if (err) return done(err);
      _files = _files.update(fileIndex, function (file) {
        return file.merge({
          diskContent: content,
          clean:true
        });
      });
      // Restart the watcher
      FileSystemActions.watch(absolute(filePath));
      done();
    }
  );
}

function deleteFile(filePath) {
  closeFile(filePath);
  shell.moveItemToTrash(path.join(_contentDir, filePath));
}
