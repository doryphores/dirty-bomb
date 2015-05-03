var Reflux = require("reflux");

var FileSystemActions = Reflux.createActions([
  "watch",
  "unwatch",
  "create",
  "save",
  "delete"
]);

module.exports = FileSystemActions;
