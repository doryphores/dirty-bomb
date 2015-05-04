var Reflux            = require("reflux"),
    Immutable         = require("immutable"),
    _                 = require("underscore"),
    AppDispatcher     = require("../dispatcher/AppDispatcher"),
    SettingsStore     = require("../stores/SettingsStore"),
    FileSystem        = require("../services/FileSystem"),
    TreeActions       = require("../actions/TreeActions"),
    LocalStorageStore = require("./LocalStorageStore");

var _tree;
var _expandedPaths = ["."];
var _nodeMap = {};
var _selectedNodePath = ""; // The currently selected node

var TreeStore = Reflux.createStore({
  listenables: TreeActions,

  init: function () {
    this.listenTo(FileSystem.dirChange, this._onFSChange);
    AppDispatcher.register(function (action) {
      if (action.actionType === "app_init") {
        AppDispatcher.waitFor([SettingsStore.dispatchToken]);
        init();
      }
    });
    // this.listenTo(LocalStorageStore, this._init);
  },

  getInitialState: function () {
    return _tree;
  },

  onExpand: function (nodePath) {
    expandNode(nodePath);
    this.emitChange();
  },

  onCollapse: function (nodePath) {
    collapseNode(nodePath);
    this.emitChange();
  },

  onToggle: function (nodePath) {
    if (findNode(nodePath).get("expanded")) {
      this.onCollapse(nodePath);
    } else {
      this.onExpand(nodePath);
    }
  },

  onSelect: function (nodePath) {
    selectNode(nodePath);
    this.emitChange();
  },

  onCreate: function (dirPath) {
    FileSystem.create(dirPath, function (filePath) {
      TreeActions.create.completed(filePath);
    });
  },

  onRename: function (nodePath, name) {
    FileSystem.rename(nodePath, name);
  },

  onMove: function (nodePath) {
    FileSystem.move(nodePath);
  },

  onDelete: function (filePath) {
    FileSystem.delete(filePath);
  },

  _onFSChange: function (fsEvent) {
    reloadNode(fsEvent.nodePath, fsEvent.nodeList);
    this.emitChange();
  },

  emitChange: function () {
    // TODO: this is a hack, use a service if possible
    LocalStorageStore.set("tree.expandedPaths", _expandedPaths);

    this.trigger(_tree);
  }
});

module.exports = TreeStore;

// Private methods

/**
 * Initialises the root node
 */
function init() {
  // TODO: get this from AppInit action
  _expandedPaths = LocalStorageStore.get("tree.expandedPaths") || ["."];

  _tree = makeNode({
    name: FileSystem.getRootName(),
    path: ".",
    type: "folder"
  });

  // Restore expanded nodes
  _.reduce(_expandedPaths.sort(), function (parents, p) {
    if (_.contains(parents, path.dirname(p))) {
      expandNode(p);
      parents.push(p);
    }
    return parents;
  }, ["."]);
}

function findNode(nodePath) {
  return _tree.getIn(_nodeMap[nodePath]);
}

/**
 * Creates an immutable version of the give node:
 *  - gets its type if unknown
 *  - stores the node's address for fast retrieval
 * @param {String} node
 * @param {Array}  address
 */
function makeNode(node, address) {
  // Map the node's address
  _nodeMap[node.path] = address || [];

  node.selected = false;

  if (node.type === "folder") {
    node.children = Immutable.List([]);
    node.expanded = _.contains(_expandedPaths, node.path);
  }

  return Immutable.Map(node);
}

/**
 * Reloads the children of the given path from the file system:
 *  - removes deleted nodes
 *  - adds new nodes
 * @param {String} nodePath
 */
function reloadNode(nodePath, nodeList) {
  var address = _nodeMap[nodePath];
  var node = _tree.getIn(address);
  var children = node.get("children");

  // Create an update function to remove deleted nodes
  var updateNode = function (children) {
    return children.filter(function (child) {
      var found = _.find(nodeList, {name: child.get("name"), type: child.get("type")});
      return !!found || tidyDeletedNode(child.get("path"));
    });
  };

  nodeList.forEach(function (n, index) {
    if(!children.findEntry(function (child) {
      return child.get("name") === n.name;
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
 *  - remove node and all children from node map
 * @param {String} nodePath
 */
function tidyDeletedNode(nodePath) {
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
 * Expands a node:
 *  - marks it as expanded
 *  - reloads its children
 *  - starts watching file system for changes
 * @param {String} nodePath
 */
function expandNode(nodePath) {
  if (!_.contains(_expandedPaths, nodePath)) {
    _expandedPaths.push(nodePath);
  }

  _tree = _tree.setIn(_nodeMap[nodePath].concat("expanded"), true);

  reloadNode(nodePath, FileSystem.openDir(nodePath));

  // Reload expanded children recursively
  findNode(nodePath).get("children").forEach(function (n) {
    if (n.get("expanded")) {
      expandNode(n.get("path"));
    }
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
  FileSystem.closeDir(nodePath);
  _expandedPaths = _.without(_expandedPaths, nodePath);
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
