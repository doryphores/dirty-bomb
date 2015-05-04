var fs            = require("fs-extra"),
    filewalker    = require("filewalker"),
    path          = require("path"),
    _             = require("underscore"),
    app           = require("remote").require("app"),
    Dialogs       = require("../Dialogs"),
    AppDispatcher = require("../dispatcher/AppDispatcher"),
    SettingsStore = require("./SettingsStore"),
    ImageActions  = require("../actions/ImageActions");

var _imageDir;
var _open = false;
var _images = [];

var ImageStore = Reflux.createStore({
  listenables: ImageActions,

  init: function () {
    AppDispatcher.register(function (action) {
      if (action.actionType === "app_init") {
        AppDispatcher.waitFor([SettingsStore.dispatchToken]);
        _imageDir = SettingsStore.getMediaPath();
        load();
      }
    });
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
    this.emitChange();
    ImageActions.open.completed();
  },

  onSelect: function (image) {
    _open = false;
    this.emitChange();
    ImageActions.open.completed("/media/" + image.path);
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

  fs.exists(_imageDir, function () {
    filewalker(_imageDir, {
      matchRegExp: /\.(jpe?g|png|gif)$/
    })
      .on("file", function (p, s) {
        images.push({
          name: path.basename(p),
          path: p,
          absolutePath: path.join(_imageDir, p),
          size: s.size
        });
      })
      .on("done", function () {
        _images = _.sortBy(images, "name");
        ImageStore.emitChange();
      })
      .walk();
  });
}

function addImage(imagePath) {
  var newPath = path.join(
    _imageDir,
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
    path.basename(imagePath)
  );
  fs.copySync(imagePath, newPath);
  return path.relative(_imageDir, newPath);
}
