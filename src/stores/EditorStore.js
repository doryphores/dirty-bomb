var path              = require("path"),
    Immutable         = require("immutable"),
    EditorActions     = require("../actions/EditorActions"),
    TreeActions       = require("../actions/TreeActions"),
    FileSystemActions = require("../actions/FileSystemActions"),
    FileSystemStore   = require("../stores/FileSystemStore");


var EditorStore = Reflux.createStore({
  listenables: EditorActions,

  init: function () {
    // Listen to file system changes
    this.listenTo(FileSystemStore, this._onFSChange);
  },

  getInitialState: function () {
    return _files;
  },

  emitChange: function () {
    this.trigger(_files);
  },

  open: function (filePath) {
    if (_getFileIndex(filePath) > -1) {
      this.focus(filePath);
    } else {
      FileSystemActions.open(filePath).then(function (content) {
        _files = _files.push(Immutable.Map({
          name        : path.basename(filePath),
          path        : filePath,
          diskContent : content,
          content     : content,
          clean       : true,
          active      : true
        }));

        this.focus(filePath);
      }.bind(this));
    }
  },

  update: function (filePath, content) {
    _files = _files.update(_getFileIndex(filePath), function (file) {
      return file.merge({
        content: content,
        clean: file.get("diskContent") === content
      });
    });
    this.emitChange();
  },

  focus: function (filePath) {
    _setIndexAsActive(_getFileIndex(filePath));
    this.emitChange();
  },

  close: function (filePath) {
    var fileIndex = _getFileIndex(filePath);

    if (fileIndex === -1) return;

    if (filePath === _activeFile) {
      if (_files.size === 1) {
        _setActiveFile("");
      } else {
        _setIndexAsActive(fileIndex ? fileIndex - 1 : 1);
      }
    }

    _files = _files.remove(fileIndex);

    FileSystemActions.close(filePath);

    this.emitChange();
  },

  save: function (filePath, close) {
    var content = _files.getIn([_getFileIndex(filePath), "content"]);
    FileSystemActions.save(filePath, content);
    if (close) this.close(filePath);
    this.emitChange();
  },

  _onFSChange: function (fsEvent) {
    var filePath = fsEvent.nodePath;
    var fileIndex = _getFileIndex(filePath);

    switch (fsEvent.event) {
      case "deleted":
        if (fileIndex === -1) return;
        if (_files.getIn([fileIndex, "clean"])) {
          // File is clean so close the file
          this.close(filePath);
        } else {
          // File was dirty so clear disk content and keep open
          _files = _files.update(fileIndex, function (file) {
            return file.merge({
              diskContent: "",
              clean: false
            });
          });
        }
        break;
      case "changed":
        if (fileIndex === -1) return;
        // File changed on disk so update disk content
        // and update content if file was clean
        _files = _files.update(fileIndex, function (file) {
          var newContent = file.get("clean") ? fsEvent.content : file.get("content");
          return file.merge({
            diskContent: fsEvent.content,
            content: newContent,
            clean: newContent === fsEvent.content
          });
        });
        break;
      default:
        // no op
    }
    this.emitChange();
  }
});

module.exports = EditorStore;


/* ======================================== *\
   Private properties
\* ======================================== */

var _files = Immutable.List();
var _activeFile = "";


/* ======================================== *\
   Private methods
\* ======================================== */

function _getFileIndex(filePath) {
  return _files.findIndex(function (file) {
    return file.get("path") === filePath;
  });
}

function _setIndexAsActive(fileIndex) {
  if (_activeFile) {
    _files = _files.setIn([_getFileIndex(_activeFile), "active"], false);
  }
  _files = _files.update(fileIndex, function (file) {
    _setActiveFile(file.get("path"));
    return file.set("active", true);
  });
}

function _setActiveFile(filePath) {
  if (_activeFile !== filePath) {
    _activeFile = filePath;
    if (_activeFile) TreeActions.select(_activeFile);
  }
}
