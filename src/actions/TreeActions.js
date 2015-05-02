var AppDispatcher = require("../dispatcher/AppDispatcher");

var TreeActions = {
  init: function (pathsToExpand) {
    AppDispatcher.dispatch({
      actionType: "tree_init",
      pathsToExpand: pathsToExpand
    });
  },

  expand: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "tree_expand",
      nodePath: nodePath
    });
  },

  collapse: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "tree_collapse",
      nodePath: nodePath
    });
  },

  toggle: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "tree_toggle",
      nodePath: nodePath
    });
  },

  select: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "tree_select",
      nodePath: nodePath
    });
  },

  create: function (savePath) {
    AppDispatcher.dispatch({
      actionType: "tree_create",
      savePath: savePath
    });
  },

  delete: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "tree_delete",
      nodePath: nodePath
    });
  },

  rename: function (nodePath, filename) {
    AppDispatcher.dispatch({
      actionType: "tree_rename",
      nodePath: nodePath,
      filename: filename
    });
  },

  move: function (nodePath, newPath) {
    AppDispatcher.dispatch({
      actionType: "tree_move",
      nodePath: nodePath,
      newPath: newPath
    });
  }
};

module.exports = TreeActions;
