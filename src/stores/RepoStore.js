var fs          = require("fs-extra"),
    path        = require("path"),
    app         = require("remote").require("app"),
    nodegit     = require("nodegit"),
    Reflux      = require("reflux"),
    ConfigStore = require("./ConfigStore"),
    RepoActions = require("../actions/RepoActions");

var RepoStore = Reflux.createStore({
  listenables: [RepoActions],

  init: function () {
    if (ConfigStore.get("repoPath")) {
      initRepo(ConfigStore.get("repoPath"), function () {
        if (_ready) this.trigger();
      }.bind(this));
    }
  },

  isReady: function () {
    return _ready;
  },

  getContentPath: function () {
    return path.join(_repoPath, "content");
  },

  getMediaPath: function () {
    return path.join(_repoPath, "public", "media");
  },

  setPath: function (repoPath) {
    initRepo(repoPath, function () {
      if (_ready) {
        RepoActions.setPath.completed(repoPath);
        this.trigger();
      } else {
        setupRepo(function (err) {
          if (err) RepoActions.setPath.failed();
          else {
            RepoActions.setPath.completed(repoPath);
            this.trigger();
          }
        }.bind(this));
      }
    }.bind(this));
  },

  emitChange: function () {
    this.trigger();
  }
});

module.exports = RepoStore;

var _ready = false;
var _repo;
var _repoPath;

function initRepo(repoPath, done) {
  _repoPath = repoPath;

  console.log("INIT REPO", repoPath);
  nodegit.Repository.open(repoPath).then(function (repo) {
    console.log("REPO EXISTS");
    _repo = repo;
    _ready = true;
    done();
  }).catch(function (err) {
    console.log(err);
    _repo = null;
    _ready = false;
    done();
  });
}

function setupRepo(done) {
  console.log("CLONING REPO");
  nodegit.Clone(ConfigStore.get("repoURL"), _repoPath, {
    remoteCallbacks: {
      credentials: function (url, userName) {
        return nodegit.Cred.sshKeyNew(
          userName,
          ConfigStore.get("publicKeyPath"),
          ConfigStore.get("privateKeyPath"),
          ""
        );
      },
      transferProgress: function (stats) {
        var processedObjects = (stats.receivedObjects() + (stats.indexedObjects() || 0));
        var progress = processedObjects / stats.totalObjects() * 50;
        RepoActions.setPath.progressed(Math.round(progress));
      }
    }
  }).then(function (repo) {
    console.log("DONE CLONING REPO");
    _ready = true;
    _repo = repo;
    done();
  }).catch(function (err) {
    console.log("ERROR CLONING REPO", err);
    done(err);
  });
}
