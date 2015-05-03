var Reflux = require("reflux");

var FileSystemActions = Reflux.createActions([
  "watch",
  "unwatch",
  "open",
  "create",
  "save",
  "delete"
]);

module.exports = FileSystemActions;
