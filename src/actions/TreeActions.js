var Reflux = require("reflux");

var TreeActions = Reflux.createActions([
  "expand",
  "collapse",
  "toggle",
  "select"
]);

module.exports = TreeActions;
