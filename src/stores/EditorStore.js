var path              = require("path"),
    Immutable         = require("immutable"),
    FileSystemStore   = require("./FileSystemStore"),
    EditorActions     = require("../actions/EditorActions"),
    FileSystemActions = require("../actions/FileSystemActions");

var _files = Immutable.List();
var _activeFile = "";

var EditorStore = Reflux.createStore({
  listenables: EditorActions,

  init: function () {
    // Listen to file system changes
    this.listenTo(FileSystemStore, this._onFSChange);
  },

  getInitialState: function () {
    return _files;
  },

  emitChange: function () {
    this.trigger(_files);
  },

  onOpen: function (filePath) {
    var fileIndex = getFileIndex(filePath);
    if (fileIndex > -1) {
      setIndexAsActive(fileIndex);
      this.emitChange();
    } else {
      FileSystemActions.open(filePath);
    }
  },

  onUpdate: function (filePath, content) {
    _files = _files.update(getFileIndex(filePath), function (file) {
      return file.merge({
        content: content,
        clean: file.get("diskContent") === content
      });
    });
    this.emitChange();
  },

  onFocus: function (filePath) {
    setIndexAsActive(getFileIndex(filePath));
    this.emitChange();
  },

  onClose: function (filePath) {
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

    FileSystemActions.unwatch(filePath);

    this.emitChange();
  },

  onSave: function (filePath, close) {
    var content = _files.getIn([getFileIndex(filePath), "content"]);
    FileSystemActions.save(filePath, content);
    if (close) this.onClose(filePath);
    this.emitChange();
  },

  onDelete: function (filePath) {
    FileSystemActions.delete(filePath);
  },

  _onFSChange: function (fsEvent) {
    var filePath = fsEvent.nodePath;
    var fileIndex = getFileIndex(filePath);

    switch (fsEvent.event) {
      case "deleted":
        if (fileIndex === -1) return;
        if (_files.getIn([fileIndex, "clean"])) {
          // File is clean so close the file
          this.onClose(filePath);
        } else {
          // File was dirty so clear disk content and keep open
          _files = _files.update(fileIndex, function (file) {
            return file.merge({
              diskContent: "",
              clean: false
            });
          });
        }
        break;
      case "changed":
        if (fileIndex === -1) return;
        // File changed on disk so update disk content
        // and update content if file was clean
        _files = _files.update(fileIndex, function (file) {
          var newContent = file.get("clean") ? fsEvent.content : file.get("content");
          return file.merge({
            diskContent: fsEvent.content,
            content: newContent,
            clean: newContent === fsEvent.content
          });
        });
        break;
      case "opened":
        if (_activeFile) {
          _files = _files.setIn([getFileIndex(_activeFile), "active"], false);
        }

        _files = _files.push(Immutable.Map({
          name        : path.basename(filePath),
          path        : filePath,
          diskContent : fsEvent.content,
          content     : fsEvent.content,
          clean       : true,
          active      : true
        }));

        _activeFile = filePath;
        break;
      default:
        // no op
    }
    this.emitChange();
  }
});

module.exports = EditorStore;


/* ======================================== *\
   Private functions
\* ======================================== */

function getFileIndex(filePath) {
  return _files.findIndex(function (file) {
    return file.get("path") === filePath;
  });
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
