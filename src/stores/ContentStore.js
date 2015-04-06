var fs            = require("fs"),
    assign        = require("object-assign"),
    EventEmitter  = require("events").EventEmitter,
    Immutable     = require("immutable"),
    FileTree      = require("fs-tree"),
    AppDispatcher = require("../dispatcher/AppDispatcher");

var contentDir = path.resolve(__dirname, "../../repo/content");

var _contentTree = new FileTree(contentDir);

var CHANGE_EVENT = "change";

var ContentStore = assign({}, EventEmitter.prototype, {
  getTree: function () {
    return _contentTree.tree;
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
