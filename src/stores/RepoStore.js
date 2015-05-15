var fs          = require("fs-extra"),
    path        = require("path"),
    _           = require("underscore"),
    app         = require("remote").require("app"),
    nodegit     = require("nodegit"),
    Reflux      = require("reflux"),
    Immutable   = require("immutable"),
    ConfigStore = require("./ConfigStore"),
    RepoActions = require("../actions/RepoActions");

var RepoStore = Reflux.createStore({
  listenables: [RepoActions],

  init: function () {
    if (ConfigStore.get("repoPath")) {
      initRepo(ConfigStore.get("repoPath"));
    }
  },

  getInitialState: function () {
    return Immutable.fromJS(_repoState);
  },

  isReady: function () {
    return _ready;
  },

  getRepo: function () {
    return _repo;
  },

  checkout: function (branchName) {
    checkoutRemoteBranch(branchName);
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
      } else {
        setupRepo(function (err) {
          if (err) RepoActions.setPath.failed();
          else {
            RepoActions.setPath.completed(repoPath);
          }
        });
      }
    });
  },

  emitChange: function () {
    this.trigger(Immutable.fromJS(_repoState));
  }
});

module.exports = RepoStore;

var _ready = false;
var _repo;
var _repoPath;

var _repoState = {
  currentBranch: "",
  branches: [],
  status: []
};

function reset() {
  _repo = null;
  _ready = false;
  _repoState = {
    currentBranch: "",
    branches: [],
    status: []
  };
}

function initRepo(repoPath, done) {
  _repoPath = repoPath;

  console.log("INIT REPO", repoPath);
  nodegit.Repository.open(repoPath).then(function (repo) {
    console.log("REPO EXISTS");
    _repo = repo;
    _ready = true;
    RepoStore.emitChange();
    updateBranches();
    if (done) done();
  }).catch(function (err) {
    console.log(err);
    reset();
    RepoStore.emitChange();
    if (done) done();
  });
}

function credentials(url, userName) {
  return nodegit.Cred.sshKeyNew(
    userName,
    ConfigStore.get("publicKeyPath"),
    ConfigStore.get("privateKeyPath"),
    ""
  );
}

function signature() {
  return nodegit.Signature.now(ConfigStore.get("userName"), ConfigStore.get("userEmail"));
}

function setupRepo(done) {
  console.log("CLONING REPO");
  nodegit.Clone(ConfigStore.get("repoURL"), _repoPath, {
    remoteCallbacks: {
      credentials: credentials,
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

function checkoutRemoteBranch(branchName) {
  console.time("FETCH");
  _repo.fetchAll({
    credentials: credentials
  }).then(function () {
    console.timeEnd("FETCH");
    _repo.getBranch(branchName, function (err, branch) {
      if (err) {
        _repo.getBranch("origin/" + branchName, function (err, branch) {

        })
      }
    })
    nodegit.Reference.dwim(branchName).then(function () {

    }).catch(function () {

    });

    _repo.getBranchCommit("origin/" + branchName).then(function (commit) {
      return _repo.createBranch(
        branchName,
        commit,
        0,
        signature(),
        "Created " + branchName
      );
    }).then(function (branch) {
      nodegit.Branch.setUpstream(branch, "origin/" + branchName);
      _repo.checkoutBranch(branchName);
    });
  }).catch(function (err) {
    console.log(err);
  });
}

function createBranch(branchName) {
  _repo.getHeadCommit().then(function (commit) {
    return _repo.createBranch(
      branchName,
      commit,
      0,
      signature(),
      "Created " + branchName + " on HEAD"
    );
  }).then(function (branch) {
    nodegit.Branch.setUpstream(branch, "origin/" + branchName);
    _repo.checkoutBranch(branchName);
  });
}

function updateBranches() {
  _repo.getCurrentBranch().then(function (branch) {
    _repoState.currentBranch = branch.shorthand();

    _repo.getReferences().then(function (refs) {
      _repoState.branches = _.uniq(refs.filter(function (r) {
        return !r.isTag();
      }).map(function (r) {
        return r.shorthand().replace(/origin\//, "");
      }).sort(), true);
      RepoStore.emitChange();
    });
  });
}

function updateStatus() {
  _repoState.status = _repo.getStatusExt().map(function (s) {
    return {
      path: path.relative("content", s.path()),
      isModified: !!s.isModified(),
      isNew: !!s.isModified(),
      isDeleted: !!s.isDeleted()
    };
  });
  RepoStore.emitChange();
}
