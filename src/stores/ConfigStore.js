var Reflux = require("reflux"),
    Immutable = require("immutable"),
    _ = require("underscore"),
    app = require("remote").require("app"),
    fs = require("fs-extra"),
    path = require("path"),
    AppActions = require("../actions/AppActions");

var _keyPath = path.join(app.getPath("userData"), "keys");
var _configPath = path.join(app.getPath("userData"), "config.json");

var _config = {
  repoURL: "git@github.com:simplybusiness/seedy.git",
  publicKeyPath: path.join(_keyPath, "id_rsa.pub"),
  privateKeyPath: path.join(_keyPath, "id_rsa"),
  mediaRoot: "/media"
};

var _settings = {
  userName: "",
  userEmail: "",
  repoPath: ""
};

var ConfigStore = Reflux.createStore({
  init: function () {
    this.listenTo(AppActions.init, function () {
      fs.readJSON(_configPath, function (err, settings) {
        if (!err) {
          _.assign(_settings, settings);
        }
        this.emitChange();
      }.bind(this));
    });
  },

  emitChange: function () {
    _config.contentPath = path.join(_settings.repoPath, "content");
    _config.mediaPath = path.join(_settings.repoPath, "public", "media");
    this.trigger(Immutable.Map(_config).merge(_settings));
    fs.outputJSON(_configPath, _settings);
  }
});

module.exports = ConfigStore;
