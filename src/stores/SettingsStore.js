var fs            = require("fs-extra"),
    path          = require("path"),
    assign        = require("object-assign"),
    EventEmitter  = require("events").EventEmitter,
    Immutable     = require("immutable"),
    app           = require("remote").require("app"),
    AppDispatcher = require("../dispatcher/AppDispatcher");

var _settingsPath = path.join(app.getPath("userData"), "settings.json");

var _ready = false;

var _settings = Immutable.fromJS({
  repoPath: path.join(app.getPath("home"), "dirty-bomb"),
  user: {
    name: "",
    email: ""
  }
});

var CHANGE_EVENT = "change";

function init() {
  fs.readJson(_settingsPath, function (err, settings) {
    if (err && err.code === "ENOENT") {
      saveToDisk(function () {
        _ready = true;
        SettingsStore.emitChange();
      });
    } else {
      _settings = Immutable.fromJS(assign({}, _settings.toJS(), settings));
      _ready = true;
      SettingsStore.emitChange();
    }
  });
}

function saveToDisk(done) {
  fs.writeJson(_settingsPath, _settings.toJS(), done);
}

function setRepoPath(repoPath) {
  _settings = _settings.set("repoPath", repoPath);
  SettingsStore.emitChange();
}

function setUser(name, email) {
  _settings = _settings.update("user", function (user) {
    return user
      .set("name", name)
      .set("email", email);
  });
  saveToDisk();
  SettingsStore.emitChange();
}

var SettingsStore = assign({}, EventEmitter.prototype, {
  getSettings: function () {
    return _settings;
  },

  isReady: function () {
    return _ready;
  },

  getUser: function () {
    var user = _settings.get("user");
    if (user.get("name") && user.get("email")) {
      return user;
    } else {
      return undefined;
    }
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
    case "app_init":
      init();
      break;
    case "setup_repo":
      setRepoPath(action.repoPath);
      break;
    case "setup_authenticated":
      setUser(action.name, action.email);
      break;
    default:
      // no op
  }
});

module.exports = SettingsStore;
