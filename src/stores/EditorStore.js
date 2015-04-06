var fs            = require("fs"),
    path          = require("path"),
    assign        = require("object-assign"),
    EventEmitter  = require("events").EventEmitter,
    Immutable     = require("immutable"),
    AppDispatcher = require("../dispatcher/AppDispatcher");

var contentDir = path.resolve(__dirname, "../../repo/content");

var _store = Immutable.fromJS({
  files      : [],
  activeFile : ""
});

function getActiveFile() {
  return _store.get("activeFile");
}

function getFiles() {
  return _store.get("files");
}

function getFileIndex(nodePath) {
  return _store.get("files").findIndex(function (f) {
    return f.path === nodePath;
  });
}

var CHANGE_EVENT = "change";

var EditorStore = assign({}, EventEmitter.prototype, {
  getStore: function () {
    return _store;
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

AppDispatcher.register(function (action) {
  switch(action.actionType) {
    case "editor_open":
      if (getFileIndex(action.nodePath) > -1) {
        _store = _store.set("activeFile", action.nodePath);
        EditorStore.emitChange();
      } else {
        fs.readFile(path.join(contentDir, action.nodePath), {
          encoding: "utf-8"
        }, function (err, fileContent) {
          _store = _store.withMutations(function (store) {
            return store.update("files", function (files) {
              return files.push({
                name    : path.basename(action.nodePath),
                path    : action.nodePath,
                content : fileContent
              });
            }).set("activeFile", action.nodePath);
          });
          EditorStore.emitChange();
        });
      }
      break;
    case "editor_focus":
      _store = _store.set("activeFile", action.nodePath);
      EditorStore.emitChange();
      break;
    case "editor_close":
      var activeFile = getActiveFile();
      var fileIndex = getFileIndex(action.nodePath);
      var files = getFiles();

      if (fileIndex === -1) return;

      if (files.size < 2) {
        activeFile = "";
      } else {
        activeFile = files.get(fileIndex === 0 ? 1 : fileIndex - 1).path;
      }

      _store = _store.withMutations(function (store) {
        return store.update("files", function (files) {
          return files.filter(function (f) {
            return f.path !== action.nodePath;
          });
        }).set("activeFile", activeFile);
      });
      EditorStore.emitChange();
      break;
    default:
      // no op
  }
});

module.exports = EditorStore;
