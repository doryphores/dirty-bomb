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
  }
};

module.exports = ContentActions;
