var fs        = require("fs");
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

module.exports = {
  generateKeys: function (email, password, callback) {
    var keypair = forge.pki.rsa.generateKeyPair(2048);

    var publicKey  = forge.ssh.publicKeyToOpenSSH(keypair.publicKey, email);
    var privateKey = forge.ssh.privateKeyToOpenSSH(keypair.privateKey, "");

    // Write private key to disk
    fs.writeFile(privateKeyPath, privateKey, {mode: 0400});

    // Write public key to disk
    fs.writeFile(publicKeyPath, publicKey);

    github.authenticate({
      type: "basic",
      username: email,
      password: password
    });

    // TODO: don't create if it already exists

    github.user.createKey({
      title: "Dirty bomb key",
      key: publicKey
    });

    callback();
  },

  clone: function (callback) {
    nodegit.Clone.clone("", repoDir, {
      remoteCallbacks: {
        credentials: function (url, userName) {
          return nodegit.Cred.sshKeyNew(userName, publicKeyPath, privateKeyPath, "");
        }
      }
    }).done(function () {
      callback();
    });
  }
};
