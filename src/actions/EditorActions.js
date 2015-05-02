Reflux = require("reflux");

var EditorActions = Reflux.createActions([
  "open",
  "focus",
  "change",
  "close",
  "save",
  "delete"
]);

module.exports = EditorActions;
