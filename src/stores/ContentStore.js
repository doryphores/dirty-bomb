var fs            = require("fs"),
    assign        = require("object-assign"),
    EventEmitter  = require("events").EventEmitter,
    Immutable     = require("immutable"),
    FileTree      = require("fs-tree"),
    AppDispatcher = require("../dispatcher/AppDispatcher");

var contentDir = path.resolve(__dirname, "../../repo/content");

var _contentTree = new FileTree(contentDir);

var _openFiles = Immutable.List();

var CHANGE_EVENT = "change";

var ContentStore = assign({}, EventEmitter.prototype, {
  getTree: function () {
    return _contentTree.tree;
  },

  getOpenFiles: function () {
    return _openFiles;
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
    case "content_expand":
      _contentTree.expand(action.nodePath);
      break;
    case "content_collapse":
      _contentTree.collapse(action.nodePath);
      break;
    case "content_open":
      fs.readFile(_contentTree.absolute(action.nodePath), {
        encoding: "utf-8"
      }, function (err, fileContent) {
        _openFiles = _openFiles.push({
          name: path.basename(action.nodePath),
          path: action.nodePath,
          content: fileContent
        });
        ContentStore.emitChange();
      });
      break;
    case "content_close":
      _openFiles = _openFiles.filter(function (f) {
        return f.path !== action.nodePath;
      });
      ContentStore.emitChange();
      break;
    default:
      // no op
  }
});

_contentTree.build();
_contentTree.expand("");
_contentTree.on("change", function () {
  ContentStore.emitChange();
});

module.exports = ContentStore;
