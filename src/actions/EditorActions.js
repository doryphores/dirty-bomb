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

  close: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "editor_close",
      nodePath: nodePath
    });
  }
};

module.exports = EditorActions;
