var Reflux = require("reflux");

var SetupActions = Reflux.createActions({
  setupGithub: {asyncResult: true}
});

module.exports = SetupActions;
