var fs            = require("fs-extra"),
    filewalker    = require("filewalker"),
    path          = require("path"),
    _             = require("underscore"),
    assign        = require("object-assign"),
    EventEmitter  = require("events").EventEmitter,
    PathWatcher   = require("pathwatcher"),
    Immutable     = require("immutable"),
    shell         = require("shell"),
    app           = require("remote").require("app"),
    Dialogs       = require("../Dialogs"),
    AppDispatcher = require("../dispatcher/AppDispatcher");

var _imageDir = path.resolve(__dirname, "../../repo/public/media");

var _open = false;
var _images = [];
var _callback;

var CHANGE_EVENT = "change";

function load() {
  var images = [];

  filewalker(_imageDir, {
    matchRegExp: /\.(jpe?g|png|gif)$/
  })
    .on("file", function (p, s) {
      images.push({
        name: path.basename(p),
        path: p,
        size: s.size
      });
    })
    .on("done", function () {
      _images = _.sortBy(images, "name");
      ImageStore.emitChange();
    })
    .walk();
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

function open(callback) {
  _open = true;
  _callback = callback;
  ImageStore.emitChange();
  load();
}

function close() {
  _open = false;
  _callback = null;
  ImageStore.emitChange();
}

function selectImage(imagePath) {
  _callback("/media/" + imagePath);
  close();
}

var ImageStore = assign({}, EventEmitter.prototype, {
  getState: function () {
    return {
      images: _images,
      open: _open
    };
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


ImageStore.dispatchToken = AppDispatcher.register(function (action) {
  switch(action.actionType) {
    case "images_open":
      open(action.callback);
      break;
    case "images_close":
      close();
      break;
    case "images_add":
      Dialogs.promptForFile({
        title: "Select image",
        defaultPath: app.getPath("home"),
        filters: [
          { name: "Images", extensions: ["jpg", "jpeg", "png", "gif"] }
        ]
      }, function (imagePath) {
        if (imagePath) {
          selectImage(addImage(imagePath));
        }
      });
      break;
    case "images_select":
      selectImage(action.image.path);
      break;
    default:
      // no op
  }
});

module.exports = ImageStore;
