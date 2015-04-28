var app          = require("remote").require("app"),
    fs           = require("fs-extra"),
    path         = require("path"),
    _            = require("underscore"),
    SetupActions = require("./actions/SetupActions"),
    GithubAPI    = require("github");

var api = new GithubAPI({version: "3.0.0"});

// Private variables
var _keyDir         = path.resolve(app.getPath("userData"), "keys");
var _privateKeyPath = path.join(_keyDir, "id_rsa");
var _publicKeyPath  = path.join(_keyDir, "id_rsa.pub");

// Authenticate with Github
// This needs to be done synchronously before each API call
function authenticate(email, password) {
  api.authenticate({
    type     : "basic",
    username : email,
    password : password
  });
}

// Does the following:
//  - Generates a new key pair if one does not exist
//  - Uploads it to Github if necessary
//  - Retrieves the user's name and passes it to the callback
function setupKey(email, password, done) {
  console.log("SETUP KEY");
  fs.readFile(_publicKeyPath, {
    encoding: "utf8"
  }, function (_err, publicKey) {
    if (publicKey) {
      console.log("A KEY ALREADY EXISTS");
      authenticate(email, password);
      api.user.getKeys({}, function (err, keys) {
        if (err) return done(err);
        if (_.findWhere(keys, {key: publicKey.trim()})) {
          console.log("AND GITHUB KNOWS ABOUT IT");
          authenticate(email, password);
          getUserName(done);
        } else {
          authenticate(email, password);
          sendKeyToGithub(publicKey, function (err) {
            if (err) return done(err);
            authenticate(email, password);
            getUserName(done);
          });
        }
      });
    } else {
      generateKeyPair(function (publicKey) {
        authenticate(email, password);
        sendKeyToGithub(publicKey, function (err) {
          if (err) return done(err);
          authenticate(email, password);
          getUserName(done);
        });
      });
    }
  });
}

/**
 * Generates a new OpenSSH key pair
 * @param {Function} done  callback
 */
function generateKeyPair(done) {
  // Forge doesn't work well in the renderer process
  // so require it from the "browser" process
  var forge= require("remote").require("node-forge");

  console.log("Setup: generating a new key");

  forge.pki.rsa.generateKeyPair(2048, function (err, keypair) {
    if (err) return done(err);

    // Convert key pair to OpenSSH format
    var privateKey = forge.ssh.privateKeyToOpenSSH(keypair.privateKey, "");
    var publicKey  = forge.ssh.publicKeyToOpenSSH(keypair.publicKey);

    // Write keys to disk
    fs.ensureDir(_keyDir, function (err) {
      if (err) return done(err);

      fs.writeFileSync(_privateKeyPath, privateKey, {mode: 0400});
      fs.writeFileSync(_publicKeyPath, publicKey);

      done(null, publicKey);
    });
  });
}

/**
 * Uploads the given public key to Github
 * @param {string}   publicKey
 * @param {Function} done
 */
function sendKeyToGithub(publicKey, done) {
  api.user.createKey({
    title : "Dirty bomb key",
    key   : publicKey
  }, function (err) {
    if (err) return done(err);
    done();
  });
}

function getUserName(done) {
  api.user.get({}, function (err, result) {
    if (err) return done(err);
    done(null, result.name);
  });
}

var Github = {
  setup: function (email, password) {
    setupKey(email, password, function (err, name) {
      if (err) console.log(err);
      else {
        SetupActions.authenticated(name, email);
      }
    });
  }
};

module.exports = Github;
