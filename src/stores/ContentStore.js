var AppDispatcher = require("../dispatcher/AppDispatcher");
var EventEmitter = require("events").EventEmitter;
var assign = require("object-assign");
var FileTree = require("fs-tree");
var fs = require("fs");

var contentDir = path.resolve(__dirname, "../../repo/content");

var _contentTree = new FileTree(contentDir);

var _openFile = "";

var CHANGE_EVENT = "change";

var ContentStore = assign({}, EventEmitter.prototype, {
  getTree: function () {
    return _contentTree.tree;
  },

  getOpenFile: function () {
    return _openFile;
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
        _openFile = fileContent;
        ContentStore.emitChange();
      });
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
