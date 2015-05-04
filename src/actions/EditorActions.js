Reflux = require("reflux");

var EditorActions = Reflux.createActions([
  "open",
  "focus",
  "update",
  "close",
  "save",
  "delete"
]);

module.exports = EditorActions;
