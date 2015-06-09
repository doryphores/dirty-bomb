var jetpack      = require("fs-jetpack"),
    filewalker   = require("filewalker"),
    path         = require("path"),
    _            = require("underscore"),
    app          = require("remote").require("app"),
    Dialogs      = require("../Dialogs"),
    RepoStore    = require("./RepoStore"),
    ConfigStore  = require("./ConfigStore"),
    ImageActions = require("../actions/ImageActions");

var _imageDir;
var _open = false;
var _images = [];

var ImageStore = Reflux.createStore({
  listenables: ImageActions,

  init: function () {
    this.listenTo(RepoStore, load);
    load();
  },

  getInitialState: function () {
    return {
      open: _open,
      images: _images
    }
  },

  onOpen: function () {
    _open = true;
    load();
    this.emitChange();
  },

  onClose: function () {
    _open = false;
    ImageActions.open.completed();
    this.emitChange();
  },

  onSelect: function (imagePath) {
    _open = false;
    ImageActions.open.completed(ConfigStore.get("mediaRoot") + "/" + imagePath);
    this.emitChange();
  },

  onAdd: function () {
    Dialogs.promptForFile({
      title: "Select image",
      defaultPath: app.getPath("home"),
      filters: [
        { name: "Images", extensions: ["jpg", "jpeg", "png", "gif"] }
      ]
    }, function (imagePath) {
      if (imagePath) {
        this.onSelect(addImage(imagePath));
      }
    }.bind(this));
  },

  emitChange: function () {
    this.trigger({
      open: _open,
      images: _images
    });
  }
});

module.exports = ImageStore;

function load() {
  var images = [];

  if (RepoStore.isReady() && _imageDir && _imageDir.cwd() !== RepoStore.getMediaPath()) {
    _imageDir = jetpack.cwd(RepoStore.getMediaPath());
  } else {
    return;
  }

  if (_imageDir.exists(".")) {
    filewalker(_imageDir.cwd(), {
      matchRegExp: /\.(jpe?g|png|gif)$/
    })
      .on("file", function (p, s) {
        images.push({
          name: path.basename(p),
          path: p,
          absolutePath: _imageDir.path(p),
          size: s.size
        });
      })
      .on("done", function () {
        _images = _.sortBy(images, "name");
        ImageStore.emitChange();
      })
      .on("error", function (err) {
        console.log(err);
      })
      .walk();
  }
}

function addImage(imagePath) {
  var newPath = path.join(
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
    path.basename(imagePath)
  );
  _imageDir.copy(imagePath, newPath);
  load();
  return path.relative(_imageDir.cwd(), newPath);
}
