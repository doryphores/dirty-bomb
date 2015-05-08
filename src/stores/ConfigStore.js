var Reflux       = require("reflux"),
    Immutable    = require("immutable"),
    _            = require("underscore"),
    app          = require("remote").require("app"),
    fs           = require("fs-extra"),
    path         = require("path"),
    github       = require("../apis/github"),
    RepoActions  = require("../actions/RepoActions"),
    SetupActions = require("../actions/SetupActions");

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
  listenables: SetupActions,

  init: function () {
    this.listenTo(RepoActions.setPath.completed, this.setRepoPath);

    if (fs.existsSync(_configPath)) {
      _.assign(_settings, fs.readJSONSync(_configPath));
      this.save();
    }
  },

  isUserReady: function () {
    return !!(_settings.userName && _settings.userEmail);
  },

  get: function (key) {
    return _config[key];
  },

  setRepoPath: function (repoPath) {
    _settings.repoPath = repoPath;
    this.save();
  },

  setupGithub: function (username, password) {
    github.setup(username, password, {
      publicKeyPath: _config.publicKeyPath,
      privateKeyPath: _config.privateKeyPath
    }, function (err, user) {
      if (err) {
        SetupActions.setupGithub.failed(err);
      } else {
        _settings.userName = user.name;
        _settings.userEmail = user.email;
        this.save();
        SetupActions.setupGithub.completed();
      }
    }.bind(this));
  },

  save: function () {
    _.assign(_config, _settings);
    this.trigger();
    fs.outputJSON(_configPath, _settings);
  }
});

module.exports = ConfigStore;
