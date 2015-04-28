var AppDispatcher = require("../dispatcher/AppDispatcher");

var SetupActions = {
  authenticated: function (name, email) {
    AppDispatcher.dispatch({
      actionType: "setup_authenticated",
      name: name,
      email: email
    });
  },

  setupRepo: function (repoPath) {
    AppDispatcher.dispatch({
      actionType: "setup_repo",
      repoPath: repoPath
    });
  }
};

module.exports = SetupActions;
