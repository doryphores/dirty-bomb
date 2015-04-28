var AppDispatcher = require("../dispatcher/AppDispatcher");

var AppActions = {
  init: function (callback) {
    AppDispatcher.dispatch({
      actionType: "app_init"
    });
  }
};

module.exports = AppActions;
