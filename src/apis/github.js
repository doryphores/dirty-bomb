var app          = require("remote").require("app"),
    fs           = require("fs-extra"),
    path         = require("path"),
    _            = require("underscore"),
    GithubAPI    = require("github");

var githubAPI = new GithubAPI({version: "3.0.0"});

// Private variables
var _keyDir         = path.resolve(app.getPath("userData"), "keys");
var _privateKeyPath = path.join(_keyDir, "id_rsa");
var _publicKeyPath  = path.join(_keyDir, "id_rsa.pub");

/**
 * Sets up basic authentication for the next Github API call
 * @param  {string} email    [description]
 * @param  {string} password [description]
 */
function _authenticate(email, password, operation) {
  githubAPI.authenticate({
    type     : "basic",
    username : email,
    password : password
  });
  // Deferring the actual operation works best for some reason
  _.defer(operation);
}

/**
 * Does the following:
 *  - Generates a new key pair if one does not exist
 *  - Uploads it to Github if necessary
 *  - Retrieves the user's name and passes it to the callback
 * @param {string}   email    Github account email address
 * @param {string}   password Github password
 * @param {Function} done     Callback
 */
function _setup(email, password, done) {
  console.log("SETUP KEY");
  fs.readFile(_publicKeyPath, {
    encoding: "utf8"
  }, function (_err, publicKey) {
    if (publicKey) {
      console.log("A KEY ALREADY EXISTS");
      _authenticate(email, password, function () {
        githubAPI.user.getKeys({}, function (err, keys) {
          if (err) return done(err);
          if (_.findWhere(keys, {key: publicKey.trim()})) {
            console.log("AND GITHUB KNOWS ABOUT IT");
            _authenticate(email, password, function () {
              _getUserName(done);
            });
          } else {
            _authenticate(email, password, function () {
              _sendKeyToGithub(publicKey, function (err) {
                if (err) return done(err);
                _authenticate(email, password, function () {
                  _getUserName(done);
                });
              });
            });
          }
        });
      });
    } else {
      _generateKeyPair(function (err, publicKey) {
        if (err) return done(err);
        _authenticate(email, password, function () {
          _sendKeyToGithub(publicKey, function (err) {
            if (err) return done(err);
            _authenticate(email, password, function () {
              _getUserName(done);
            });
          });
        });
      });
    }
  });
}

/**
 * Generates a new OpenSSH key pair and saves to disk
 * @param {Function} done  callback
 */
function _generateKeyPair(done) {
  // Forge doesn't work well in the renderer process
  // so require it from the "browser" process
  var forge = require("remote").require("node-forge")

  console.log("GENERATING A NEW KEY");

  forge.pki.rsa.generateKeyPair(2048, function (err, keypair) {
    console.log("KEY GENERATED");
    if (err) return done(err);

    // Convert key pair to OpenSSH format
    var privateKey = forge.ssh.privateKeyToOpenSSH(keypair.privateKey, "");
    var publicKey  = forge.ssh.publicKeyToOpenSSH(keypair.publicKey);

    // Write keys to disk
    fs.ensureDir(_keyDir, function (err) {
      console.log("WRITING KEYS TO DISK");
      if (err) return done(err);

      fs.writeFileSync(_privateKeyPath, privateKey, {mode: 0400});
      fs.writeFileSync(_publicKeyPath, publicKey);

      console.log("KEYS WRITTEN TO DISK");

      done(null, publicKey);
    });
  });
}

/**
 * Uploads the given public key to Github
 * @param {string}   publicKey
 * @param {Function} done
 */
function _sendKeyToGithub(publicKey, done) {
  console.log("SENDING KEYS TO GITHUB");
  githubAPI.user.createKey({
    title : "Dirty bomb key",
    key   : publicKey
  }, function (err) {
    console.log("KEYS SENT TO GITHUB");
    if (err) return done(err);
    done();
  });
}

function _getUserName(done) {
  console.log("GETTING USER NAME FROM GITHUB");
  githubAPI.user.get({}, function (err, result) {
    if (err) return done(err);
    done(null, result.name);
  });
}

module.exports = {
  setup: function (email, password, done) {
    _setup(email, password, function (err, name) {
      console.log("ALL DONE");
      if (err) return done(err);

      done(null, {
        name: name,
        email: email
      });
    });
  }
};
