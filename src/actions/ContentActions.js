var AppDispatcher = require("../dispatcher/AppDispatcher");

var ContentActions = {
  expand: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "content_expand",
      nodePath: nodePath
    });
  },

  collapse: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "content_collapse",
      nodePath: nodePath
    });
  },

  open: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "content_open",
      nodePath: nodePath
    });
  },

  close: function (nodePath) {
    AppDispatcher.dispatch({
      actionType: "content_close",
      nodePath: nodePath
    });
  }
};

module.exports = ContentActions;
