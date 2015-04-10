var AppDispatcher = require("../dispatcher/AppDispatcher");

var TreeActions = {
  init: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "tree_init",
      nodePath: nodePath
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
  }
};

module.exports = TreeActions;
