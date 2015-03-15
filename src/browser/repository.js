var promisify = require("promisify-node");
var fs        = promisify("fs-extra");
var path      = require("path");
var nodegit   = require("nodegit");
var forge     = require("node-forge");
var GithubAPI = new require("github");

var github  = new GithubAPI({
  version: "3.0.0"
});

var repoDir = path.resolve(__dirname, "../../repo");

var keyDir = path.resolve(__dirname, "../../keys");
var privateKeyPath = path.join(keyDir, "id_rsa");
var publicKeyPath  = path.join(keyDir, "id_rsa.pub");

var generateKeyPair = promisify(forge.pki.rsa.generateKeyPair);
var ensureDir = promisify(fs.ensureDir);

module.exports = {
  setup: function (callback) {
    ensureDir(repoDir).then(function () {
      return nodegit.Repository.open(repoDir);
    }).then(function () {
      callback(true);
    }).catch(function (err) {
      // TODO: check error code
      callback(false);
    });
  },

  clone: function (callback) {
    var self = this;

    nodegit.Clone("", repoDir, {
      remoteCallbacks: {
        credentials: function (url, userName) {
          return nodegit.Cred.sshKeyFromAgent(userName);
          // return nodegit.Cred.sshKeyNew(userName, publicKeyPath, privateKeyPath, "");
        },
        transferProgress: function (stats) {
          console.log("received: ", Math.round(stats.receivedObjects() / stats.totalObjects() * 100));
          if (stats.indexedObjects()) {
            console.log("indexed: ", Math.round(stats.indexedObjects() / stats.totalObjects() * 100));
          }
        }
      }
    }).done(function (repo) {
      console.log("Clone done");
      callback();
    });
  },

  setupAuthentication: function (email, password, callback) {
    var self = this;
    console.log("Setup authentication");
    fs.exists(publicKeyPath, function (exists) {
      console.log("Public key exists: ", exists);
      if (!exists) {
        self.generateKeys(email, password, callback);
      } else {
        callback();
      }
    });
  },

  generateKeys: function (email, password, callback) {
    var publicKey;

    console.log("Generate keys");

    generateKeyPair(2048).then(function (keypair) {
      var privateKey = forge.ssh.privateKeyToOpenSSH(keypair.privateKey, "");
      publicKey      = forge.ssh.publicKeyToOpenSSH(keypair.publicKey, email);

      // Write keys to disk
      return ensureDir(keyDir)
        .then(fs.writeFile(privateKeyPath, privateKey, {mode: 0400}))
        .then(fs.writeFile(publicKeyPath, publicKey));
    }).done(function () {
      console.log("Keys generated");

      github.authenticate({
        type     : "basic",
        username : email,
        password : password
      });

      // TODO: don't create if it already exists

      github.user.createKey({
        title : "Dirty bomb key",
        key   : publicKey
      }, function (err, result) {
        console.log("Keys sent to Github");

        callback();
      });
    });
  }
};
