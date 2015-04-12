var AppDispatcher = require("../dispatcher/AppDispatcher");

var EditorActions = {
  open: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "editor_open",
      nodePath: nodePath
    });
  },

  focusOn: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "editor_focus",
      nodePath: nodePath
    });
  },

  change: function (nodePath, content) {
    AppDispatcher.dispatch({
      actionType: "editor_change",
      nodePath: nodePath,
      content: content
    });
  },

  close: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "editor_close",
      nodePath: nodePath
    });
  },

  save: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "editor_save",
      nodePath: nodePath,
      close: false
    });
  },

  saveAndClose: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "editor_save",
      nodePath: nodePath,
      close: true
    });
  },

  delete: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "editor_delete",
      nodePath: nodePath
    });
  }
};

module.exports = EditorActions;
