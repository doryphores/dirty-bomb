var fs                = require("fs-extra"),
    path              = require("path"),
    shell             = require("shell"),
    PathWatcher       = require("pathwatcher"),
    Reflux            = require("reflux"),
    SettingsStore     = require("./SettingsStore"),
    FileSystemActions = require("../actions/FileSystemActions");

var _contentDir = SettingsStore.getContentPath();
var _watchers = {};

function absolute(filePath) {
  return path.join(_contentDir, filePath);
}

var FileSystemStore = Reflux.createStore({
  listenables: FileSystemActions,

  onWatch: function (nodePath) {
    this._watch(nodePath);
  },

  onUnwatch: function (nodePath) {
    this._unwatch(nodePath);
  },

  onCreate: function (nodePath, content) {
    fs.outputFile(absolute(nodePath), content);
  },

  onOpen: function (nodePath) {
    fs.readFile(absolute(nodePath), {
      encoding: "utf-8"
    }, function (err, fileContent) {
      this.trigger({
        nodePath: nodePath,
        event: "opened",
        content: fileContent
      });
      this._watch(nodePath);
    }.bind(this));
  },

  onSave: function (nodePath, content) {
    this._unwatch(nodePath);
    fs.outputFile(absolute(nodePath), content, function (err) {
      if (err) return console.log(err);

      this.trigger({
        nodePath: nodePath,
        event: "changed",
        content: content
      });

      this._watch(nodePath);
    }.bind(this));
  },

  onDelete: function (nodePath) {
    shell.moveItemToTrash(absolute(nodePath));
  },

  _watch: function (nodePath) {
    if (_watchers[nodePath]) {
      _watchers[nodePath].close();
    }
    _watchers[nodePath] = PathWatcher.watch(absolute(nodePath),
      this._onNodeChange.bind(this, nodePath));
  },

  _unwatch: function (nodePath) {
    if (_watchers[nodePath]) {
      _watchers[nodePath].close();
      delete _watchers[nodePath];
    }
  },

  _onNodeChange: function (nodePath) {
    fs.readFile(absolute(nodePath), {
      encoding: "utf-8"
    }, function (err, content) {
      if (err) {
        this._unwatch(nodePath);
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
