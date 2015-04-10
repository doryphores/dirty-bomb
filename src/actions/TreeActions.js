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
  }
};

module.exports = TreeActions;
