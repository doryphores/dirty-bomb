var fs            = require("fs"),
    path          = require("path"),
    assign        = require("object-assign"),
    EventEmitter  = require("events").EventEmitter,
    Immutable     = require("immutable"),
    _             = require("underscore"),
    PathWatcher   = require("pathwatcher"),
    AppDispatcher = require("../dispatcher/AppDispatcher");

var CHANGE_EVENT = "change";

var contentDir = path.resolve(__dirname, "../../repo/content");

var _tree;
var _nodeMap = {};
var _watchers = {};
var _expandedPaths = [];

function absolute(nodePath) {
  return path.join(_contentDir, nodePath);
}

function init() {
  unwatchNode(".");
  _nodeMap = {};
  _expandedPaths = [];
  _tree = makeNode({
    name: path.basename(_contentDir),
    path: ".",
    type: "folder"
  });
}

function makeNode(node, address) {
  address = address || [];

  _nodeMap[node.path] = address;

  if (node.type === undefined) {
    node.type = fs.statSync(absolute(node.path)).isDirectory() ? "folder" : "file";
  }

  if (node.type === "folder") {
    node.children = Immutable.List([]);
    node.expanded = false;
  }

  return Immutable.Map(node);
}

function expandNode(nodePath) {
  var nodePaths = ["."];

  if (nodePath !== ".") {
    nodePaths = _.reduce(nodePath.split("/"), function (nodePaths, p) {
      return nodePaths.concat(path.join(_.last(nodePaths), p));
    }, nodePaths);
  }

  nodePaths.forEach(function (p) {
    var address = _nodeMap[p];
    if (!_.contains(_expandedPaths, p)) {
      _tree = _tree.setIn(address.concat("expanded"), true);
      _expandedPaths.push(p);
    }
    reloadNode(p);
    watchNode(p);
  });
}

function collapseNode(nodePath) {
  var address = _nodeMap[nodePath];
  _tree = _tree.setIn(address.concat("expanded"), false);
  unwatchNode(nodePath);
  _expandedPaths = _.without(_expandedPaths, nodePath);
}

function reloadNode(nodePath) {
  var address = _nodeMap[nodePath];
  var node = _tree.getIn(address);
  var children = node.get("children");
  var entries;

  try {
    entries = folderContents(nodePath);
  } catch (e) {
    // Directory does not exist so do nothing
    if (e.code === 'ENOENT') return;
  }

  // Create an update function to remove deleted nodes
  var updateNode = function (children) {
    return children.filter(function (n) {
      var found = _.find(entries, {name: n.get("name"), type: n.get("type")});
      if (!found) {
        // This node has been removed so unwatch it
        // self.unwatchNode(n.get("path"));
        // Collapse it recursively
        // self.collapse(n.get("path"), true);
        // And delete from the map
        delete _nodeMap[n.get("path")];
      }
      return found;
    });
  };

  entries.forEach(function (n, index) {
    if(!children.findEntry(function (v) {
      return v.get("name") === n.name;
    })) {
      // New node so compose the update function to add the node
      updateNode = _.compose(function (children) {
        return children.splice(index, 0, makeNode(n, address.concat("children", index)));
      }, updateNode);
    }
  });

  _tree = _tree.updateIn(address.concat("children"), function (children) {
    return updateNode(children.asMutable()).asImmutable();
  });

  // Re-index node map
  reindexNode(address);
}

function reindexNode(address) {
  _tree.getIn(address.concat("children")).forEach(function (n, i) {
    var nodeAddress = address.concat("children", i);
    _nodeMap[n.get("path")] = nodeAddress;
    if (n.get("type") === "folder") {
      reindexNode(nodeAddress);
    }
  });
}

function findNode(nodePath) {
  return _tree.getIn(_nodeMap[nodePath]);
}

function folderContents(dirPath) {
  var absDirPath = absolute(dirPath);
  return fs.readdirSync(absDirPath).map(function (filename) {
    var s = fs.statSync(path.join(absDirPath, filename));
    return {
      name : filename,
      path : path.join(dirPath, filename),
      type : s.isDirectory() ? "folder" : "file"
    };
  }).sort(function nodeCompare(a, b) {
    if (a.type == b.type) return a.name.localeCompare(b.name);
    return a.type == "folder" ? -1 : 1;
  });
}

function watchNode(nodePath) {
  if (_watchers[nodePath]) {
    _watchers[nodePath].close();
    delete _watchers[nodePath];
  }

  _watchers[nodePath] = PathWatcher.watch(absolute(nodePath), _.debounce(function (event) {
    if (event === "change") {
      reloadNode(nodePath);
      TreeStore.emitChange();
    }
  }), 100);

  findNode(nodePath).get("children").filter(function (n) {
    return n.get("expanded");
  }).forEach(function (n) {
    watchNode(n.get("path"));
  });
}

function unwatchNode(nodePath) {
  for (var watchPath in _watchers) {
    if (nodePath === "." || watchPath.match("^" + nodePath + "(\/|$)")) {
      _watchers[watchPath].close();
      delete _watchers[watchPath];
    }
  }
}


var TreeStore = assign({}, EventEmitter.prototype, {
  getTree: function () {
    return _tree;
  },

  getNode: function (nodePath) {
    return findNode(nodePath || ".");
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
    case "tree_init":
      init();
      TreeStore.emitChange();
      break;
    case "tree_expand":
      expandNode(action.nodePath);
      TreeStore.emitChange();
      break;
    case "tree_collapse":
      collapseNode(action.nodePath);
      TreeStore.emitChange();
      break;
    default:
      // no op
  }
});

module.exports = TreeStore;
