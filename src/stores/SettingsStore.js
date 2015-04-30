var fs            = require("fs-extra"),
    path          = require("path"),
    assign        = require("object-assign"),
    EventEmitter  = require("events").EventEmitter,
    Immutable     = require("immutable"),
    app           = require("remote").require("app"),
    AppDispatcher = require("../dispatcher/AppDispatcher");

var _settingsPath = path.join(app.getPath("userData"), "settings.json");
var _keyPath      = path.resolve(app.getPath("userData"), "keys");

var _settings = Immutable.fromJS({
  repositoryURL: "git@github.com:simplybusiness/seedy.git",
  contentPath: "content",
  mediaPath: path.join("public", "media"),
  publicKeyPath: path.join(_keyPath, "id_rsa.pub"),
  privateKeyPath: path.join(_keyPath, "id_rsa"),
  userSettings: {
    repoPath: "",
    user: {}
  }
});

try {
  var savedSettings = fs.readJsonSync(_settingsPath);
  _settings = _settings.update("userSettings", function (userSettings) {
    return userSettings.merge(savedSettings);
  });
} catch(err) {
  saveToDisk();
}

function saveToDisk() {
  fs.outputJson(_settingsPath, _settings.get("userSettings").toJS());
}

function setRepoPath(repoPath) {
  _settings = _settings.setIn(["userSettings", "repoPath"], repoPath);
  saveToDisk();
  SettingsStore.emitChange();
}

function setUser(newUser) {
  _settings = _settings.updateIn(["userSettings", "user"], function (user) {
    return user.merge(newUser);
  });
  saveToDisk();
  SettingsStore.emitChange();
}

var CHANGE_EVENT = "change";

var SettingsStore = assign({}, EventEmitter.prototype, {
  isReady: function () {
    var user = this.getUser();
    return user.get("name") && user.get("email") &&
      fs.existsSync(this.get("publicKeyPath")) &&
      fs.existsSync(this.get("privateKeyPath"));
  },

  getSettings: function () {
    return _settings;
  },

  get: function (key) {
    return _settings.getIn(key.split("."));
  },

  getContentPath: function () {
    var repoPath = this.get("userSettings.repoPath");
    if (repoPath) {
      return path.join(
        repoPath,
        this.get("contentPath")
      );
    } else {
      return undefined;
    }
  },

  getMediaPath: function () {
    var repoPath = this.get("userSettings.repoPath");
    if (repoPath) {
      return path.join(repoPath, this.get("mediaPath"));
    } else {
      return undefined;
    }
  },

  getUser: function () {
    return _settings.getIn(["userSettings", "user"]);
  },

  emitChange: function () {
    this.emit(CHANGE_EVENT);
  },

  addChangeListener: function (listener) {
    this.on(CHANGE_EVENT, listener);
  },

  removeChangeListener: function (listener) {
    this.removeListener(CHANGE_EVENT, listener);
  }
});

SettingsStore.dispatchToken = AppDispatcher.register(function (action) {
  switch(action.actionType) {
    case "setup_repo":
      setRepoPath(action.repoPath);
      break;
    case "setup_authenticated":
      setUser(action.user);
      break;
    default:
      // no op
  }
});

module.exports = SettingsStore;
