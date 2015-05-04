var Reflux = require("reflux");

var TreeActions = Reflux.createActions([
  "expand",
  "collapse",
  "toggle",
  "select",
  "rename",
  "move",
  "delete"
]);

TreeActions.create = Reflux.createAction({asyncResult: true});
TreeActions.duplicate = Reflux.createAction({asyncResult: true});

module.exports = TreeActions;
