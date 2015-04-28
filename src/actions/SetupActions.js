var AppDispatcher = require("../dispatcher/AppDispatcher"),
    githubAPI     = require("../apis/github");

var SetupActions = {
  setupGithub: function (email, password) {
    githubAPI.setup(email, password, function (err, user) {
      console.log("GITHUB SETUP COMPLETE");
      if (err) {
        console.log(err);
      } else {
        SetupActions.authenticated(user);
      }
    });
  },

  authenticated: function (user) {
    AppDispatcher.dispatch({
      actionType: "setup_authenticated",
      user: user
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
