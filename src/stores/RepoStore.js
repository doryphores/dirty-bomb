var fs            = require("fs-extra"),
    path          = require("path"),
    assign        = require("object-assign"),
    EventEmitter  = require("events").EventEmitter,
    app           = require("remote").require("app"),
    nodegit       = require("nodegit"),
    SettingsStore = require("./SettingsStore"),
    ConfigStore   = require("./ConfigStore"),
    AppDispatcher = require("../dispatcher/AppDispatcher");

var _ready = false;
var _repoPath;

function initRepo(done) {
  console.log("INIT REPO");
  nodegit.Repository.open(_repoPath).then(function () {
    console.log("REPO EXISTS");
    _ready = true;
    done();
  });
}

function setupRepo(done) {
  console.log("CLONING REPO");
  nodegit.Clone(SettingsStore.get("repositoryURL"), _repoPath, {
    remoteCallbacks: {
      credentials: function (url, userName) {
        return nodegit.Cred.sshKeyNew(
          userName,
          SettingsStore.get("publicKeyPath"),
          SettingsStore.get("privateKeyPath"),
          ""
        );
      },
      transferProgress: function (stats) {
        var processedObjects = (stats.receivedObjects() + (stats.indexedObjects() || 0));
        var progress = processedObjects / stats.totalObjects() * 50;
        RepoStore.emitProgress(Math.round(progress));
      }
    }
  }).then(function (repo) {
    console.log("DONE CLONING REPO");
    _ready = true;
    done();
  }).catch(function (err) {
    console.log("ERROR CLONING REPO", err);
    done(err);
  });
}

var CHANGE_EVENT = "change";
var PROGRESS_EVENT = "progress";

var RepoStore = assign({}, EventEmitter.prototype, {
  isReady: function () {
    return _ready;
  },

  emitChange: function () {
    this.emit(CHANGE_EVENT);
  },

  addChangeListener: function (listener) {
    this.on(CHANGE_EVENT, listener);
  },

  removeChangeListener: function (listener) {
    this.removeListener(CHANGE_EVENT, listener);
  },

  emitProgress: function (progress) {
    this.emit(PROGRESS_EVENT, progress);
  },

  addProgressListener: function (listener) {
    this.on(PROGRESS_EVENT, listener);
  },

  removeProgressListener: function (listener) {
    this.removeListener(PROGRESS_EVENT, listener);
  }
});

ConfigStore.listen(function (config) {
  if (config.get("repoPath") !== _repoPath) {
    _repoPath = config.get("repoPath");
    console.log(_repoPath);
    initRepo(function () {
      RepoStore.emitChange();
    });
  }
});

RepoStore.dispatchToken = AppDispatcher.register(function (action) {
  switch(action.actionType) {
    case "setup_repo":
      AppDispatcher.waitFor([SettingsStore.dispatchToken]);
      setupRepo(function () {
        RepoStore.emitChange();
      });
      break;
    default:
      // no op
  }
});

module.exports = RepoStore;
