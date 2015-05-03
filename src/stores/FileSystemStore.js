var fs = require("fs-extra"),
    path = require("path"),
    shell = require("shell"),
    PathWatcher = require("pathwatcher"),
    Reflux = require("reflux"),
    FileSystemActions = require("../actions/FileSystemActions");

var _watchers = {};

var FileSystemStore = Reflux.createStore({
  listenables: FileSystemActions,

  init: function () {

  },

  onWatch: function (nodePath) {
    if (_watchers[nodePath]) {
      _watchers[nodePath].close();
    }
    _watchers[nodePath] = PathWatcher.watch(nodePath,
      this._onNodeChange.bind(this, nodePath));
  },

  onUnwatch: function (nodePath) {
    if (_watchers[nodePath]) {
      _watchers[nodePath].close();
      delete _watchers[nodePath];
    }
  },

  onCreate: function (nodePath, content) {
    fs.outputFile(nodePath, content);
  },

  onSave: function (nodePath, content) {
    fs.outputFile(nodePath, content);
  },

  onDelete: function (nodePath) {
    shell.moveItemToTrash(nodePath);
  },

  _onNodeChange: function (nodePath) {
    console.log("CHANGED", nodePath);
    fs.readFile(nodePath, {
      encoding: "utf-8"
    }, function (err, content) {
      if (err) {
        _watchers[nodePath].close();
        delete _watchers[nodePath];
        this.trigger({
          nodePath: nodePath,
          event: "deleted"
        });
      } else {
        this.trigger({
          nodePath: nodePath,
          event: "changed",
          content: content
        });
      }
    }.bind(this));
  }
});

module.exports = FileSystemStore;
