var fs            = require("fs"),
    path          = require("path"),
    assign        = require("object-assign"),
    EventEmitter  = require("events").EventEmitter,
    Immutable     = require("immutable"),
    AppDispatcher = require("../dispatcher/AppDispatcher");

var contentDir = path.resolve(__dirname, "../../repo/content");

var _files = Immutable.List();
var _activeFile = "";

function getFileIndex(filePath) {
  return _files.findIndex(function (file) {
    return file.get("path") === filePath;
  });
}

function openFile(filePath) {
  var fileIndex = getFileIndex(filePath);
  if (fileIndex > -1) {
    setIndexAsActive(fileIndex);
    EditorStore.emitChange();
  } else {
    fs.readFile(path.join(contentDir, filePath), {
      encoding: "utf-8"
    }, function (err, fileContent) {
      if (_activeFile) {
        _files = _files.setIn([getFileIndex(_activeFile), "active"], false);
      }

      // Add new file to store and set it as active
      _files = _files.push(Immutable.Map({
        name            : path.basename(filePath),
        path            : filePath,
        originalContent : fileContent,
        content         : fileContent,
        clean           : true,
        active          : true
      }));

      _activeFile = filePath;

      EditorStore.emitChange();
    });
  }
}

function setIndexAsActive(fileIndex) {
  if (_activeFile) {
    _files = _files.setIn([getFileIndex(_activeFile), "active"], false);
  }
  _files = _files.update(fileIndex, function (file) {
    _activeFile = file.get("path");
    return file.set("active", true);
  });
}

function setAsActive(filePath) {
  setIndexAsActive(getFileIndex(filePath));
  EditorStore.emitChange();
}

function closeFile(filePath) {
  var fileIndex = getFileIndex(filePath);

  if (fileIndex === -1) return;

  if (filePath === _activeFile) {
    if (_files.size === 1) {
      _activeFile = "";
    } else {
      setIndexAsActive(fileIndex ? fileIndex - 1 : 1);
    }
  }

  _files = _files.remove(fileIndex);

  EditorStore.emitChange();
}

function updateFile(filePath, content) {
  _files = _files.update(getFileIndex(filePath), function (file) {
    return file.set("content", content)
      .set("clean", file.get("originalContent") === content);
  });

  EditorStore.emitChange();
}

function saveFile(filePath, close) {
  var fileIndex = getFileIndex(filePath);
  var content = _files.getIn([fileIndex, "content"]);

  fs.writeFile(
    path.join(contentDir, filePath),
    content,
    function (err) {
      if (err) {
        console.log(err);
      } else {
        if (close) {
          closeFile(filePath);
        } else {
          _files = _files.update(fileIndex, function (file) {
            return file.set("originalContent", content).set("clean", true);
          });
          EditorStore.emitChange();
        }
      }
    }
  );
}

var CHANGE_EVENT = "change";

var EditorStore = assign({}, EventEmitter.prototype, {
  getFiles: function () {
    return _files;
  },

  getFile: function (filePath) {
    return _files.get(getFileIndex(filePath));
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

AppDispatcher.register(function (action) {
  switch(action.actionType) {
    case "editor_open":
      openFile(action.nodePath);
      break;
    case "editor_change":
      updateFile(action.nodePath, action.content);
      break;
    case "editor_focus":
      setAsActive(action.nodePath);
      break;
    case "editor_close":
      closeFile(action.nodePath);
      break;
    case "editor_save":
      saveFile(action.nodePath, action.close);
      break;
    default:
      // no op
  }
});

module.exports = EditorStore;
