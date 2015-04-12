var fs            = require("fs"),
    path          = require("path"),
    assign        = require("object-assign"),
    EventEmitter  = require("events").EventEmitter,
    Immutable     = require("immutable"),
    _             = require("underscore"),
    PathWatcher   = require("pathwatcher"),
    AppDispatcher = require("../dispatcher/AppDispatcher");
    ipc           = require("ipc"),
    shell         = require("shell");


/*=============================================*\
  Private properties
\*=============================================*/

// TODO: this should go come from some json config
var _contentDir = path.resolve(__dirname, "../../repo/content");
var _ignoredFiles = [".DS_Store", "Thumbs.db", ".git"];

var _tree;                  // The immutable node tree
var _nodeMap = {};          // To store path -> address mappings
var _watchers = {};         // To store pathwatchers
var _expandedPaths = [];    // To keep track of which paths are expanded
var _selectedNodePath = ""; // The currently selected node

var CHANGE_EVENT = "change";


/*=============================================*\
  Private methods
\*=============================================*/

/**
 * Initialises the root node
 * @param  {String|Array} pathsToExpand List of paths to expand
 */
function init(pathsToExpand) {
  _tree = makeNode({
    name: path.basename(_contentDir),
    path: ".",
    type: "folder"
  });

  if (pathsToExpand) {
    _.flatten([pathsToExpand]).forEach(expandNode);
  }
}

/**
 * Creates an immutable version of the give node:
 *  - gets its type if unknown
 *  - stores the node's address for fast retrieval
 * @param {String} node
 * @param {Array}  address
 */
function makeNode(node, address) {
  address = address || [];

  // Map the node's address
  _nodeMap[node.path] = address;

  // Get node type from disk if unknown
  if (node.type === undefined) {
    node.type = fs.statSync(absolute(node.path)).isDirectory() ? "folder" : "file";
  }

  if (node.type === "folder") {
    node.children = Immutable.List([]);
    node.expanded = false;
  }

  node.selected = false;

  return Immutable.Map(node);
}

/**
 * Reloads the children of the given path from the file system:
 *  - removes deleted nodes
 *  - adds new nodes
 * @param {String} nodePath
 */
function reloadNode(nodePath) {
  var address = _nodeMap[nodePath];
  var node = _tree.getIn(address);
  var children = node.get("children");
  var entries;

  try {
    entries = folderContents(nodePath);
  } catch (e) {
    // Directory does not exist so do nothing
    if (e.code === "ENOENT") return;
  }

  // Create an update function to remove deleted nodes
  var updateNode = function (children) {
    return children.filter(function (n) {
      var found = _.find(entries, {name: n.get("name"), type: n.get("type")});
      return !!found || tidyDeletedNode(n.get("path"));
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

/**
 * Recursively re-maps the given node's children
 * @param {Array} address
 */
function reindexNode(address) {
  _tree.getIn(address.concat("children")).forEach(function (n, i) {
    var nodeAddress = address.concat("children", i);
    _nodeMap[n.get("path")] = nodeAddress;
    if (n.get("type") === "folder") {
      reindexNode(nodeAddress);
    }
  });
}

/**
 * Clean up after deleting a node:
 *  - remove expanded paths
 *  - unwatch path
 *  - remove node and all children from node map
 * @param {String} nodePath
 */
function tidyDeletedNode(nodePath) {
  unwatchNode(nodePath);
  _expandedPaths = _.reject(_expandedPaths, function (p) {
    return p.match("^" + nodePath + "(\/|$)");
  });
  _nodeMap = _.omit(_nodeMap, function (address, p) {
    return p.match("^" + nodePath + "(\/|$)");
  });

  if (_selectedNodePath.indexOf(nodePath) === 0) {
    _selectedNodePath = "";
  }

  return false;
}

/**
 * Returns the node for the given path or undefined
 * @param {String} nodePath
 */
function findNode(nodePath) {
  return _nodeMap[nodePath] && _tree.getIn(_nodeMap[nodePath]);
}

function selectNode(nodePath) {
  if (_selectedNodePath.length && _selectedNodePath !== nodePath) {
    _tree = _tree.setIn(_nodeMap[_selectedNodePath].concat("selected"), false);
  }

  if (_selectedNodePath !== nodePath) {
    _tree = _tree.setIn(_nodeMap[nodePath].concat("selected"), true);
    _selectedNodePath = nodePath;
  }
}

/**
 * Expands a node:
 *  - ensures the node's parents are expanded
 *  - marks it as expanded
 *  - reloads its children
 *  - starts watching file system for changes
 * @param {String} nodePath
 */
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

/**
 * Collapses the given node:
 *  - marks the node as collapsed
 *  - stops watching file system for changes
 * @param {String} nodePath
 */
function collapseNode(nodePath) {
  var address = _nodeMap[nodePath];
  _tree = _tree.setIn(address.concat("expanded"), false);
  unwatchNode(nodePath);
  _expandedPaths = _.without(_expandedPaths, nodePath);
}

/**
 * Convenience method for toggling the node's expanded state
 * @param {String} nodePath
 */
function toggleNode(nodePath) {
  var node = findNode(nodePath);
  if (!node || !node.get("expanded")) {
    expandNode(nodePath);
  } else {
    collapseNode(nodePath);
  }
}

/**
 * Starts a file system watcher on the given node
 *  - closes any previous watchers on the node
 *  - starts a watcher on the node
 *  - restarts watchers on its expanded children
 * @param {String} nodePath
 */
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

  findNode(nodePath).get("children").forEach(function (n) {
    if (n.get("expanded")) watchNode(n.get("path"));
  });
}

/**
 * Stops file system watchers on the given node and all its children
 * @param {String} nodePath
 */
function unwatchNode(nodePath) {
  for (var watchPath in _watchers) {
    if (nodePath === "." || watchPath.match("^" + nodePath + "(\/|$)")) {
      _watchers[watchPath].close();
      delete _watchers[watchPath];
    }
  }
}

/**
 * Returns an array of node objects for the given directory path:
 *  - ignores names from _ignoredFiles
 *  - sorts folders first
 *  - each node in array has the following keys: name, path, type
 * @param {String} dirPath
 */
function folderContents(dirPath) {
  var absDirPath = absolute(dirPath);
  return _.difference(fs.readdirSync(absDirPath), _ignoredFiles).map(function (filename) {
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

/**
 * Returns absolute version of given node path
 * @param  {String} nodePath
 */
function absolute(nodePath) {
  return path.join(_contentDir, nodePath);
}


/*=============================================*\
  Public API
\*=============================================*/

var TreeStore = assign({}, EventEmitter.prototype, {
  getNode: function (nodePath) {
    return findNode(nodePath || ".");
  },

  reset: function () {
    unwatchNode(".");
    _nodeMap = {};
    _expandedPaths = [];
    _tree = undefined;
    _selectedNodePath = "";
    this.removeAllListeners(CHANGE_EVENT);
  },

  emitChange: _.debounce(function () {
    this.emit(CHANGE_EVENT);
  }, 50),

  addChangeListener: function (listener) {
    this.on(CHANGE_EVENT, listener);
  },

  removeChangeListener: function (listener) {
    this.removeListener(CHANGE_EVENT, listener);
  }
});


/*=============================================*\
  Register actions
\*=============================================*/

AppDispatcher.register(function (action) {
  switch(action.actionType) {
    case "tree_init":
      init(action.pathsToExpand);
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
    case "tree_toggle":
      toggleNode(action.nodePath);
      TreeStore.emitChange();
      break;
      case "tree_select":
        selectNode(action.nodePath);
        TreeStore.emitChange();
        break;
    case "tree_delete":
      ipc.on("dialog.message.callback", function (button) {
        if (button === 1) {
          shell.moveItemToTrash(absolute(action.nodePath));
        }
      });
      ipc.send("dialog.message", {
        type: "warning",
        message: "Are you sure you want to delete the selected item?",
        detail: "Your are deleting '" + action.nodePath + "'.",
        buttons: ["Cancel", "Move to trash"]
      });
      break;
    default:
      // no op
  }
});

module.exports = TreeStore;
