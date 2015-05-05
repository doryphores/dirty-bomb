var Reflux            = require("reflux"),
    Immutable         = require("immutable"),
    _                 = require("underscore"),
    FileSystemStore   = require("./FileSystemStore"),
    TreeActions       = require("../actions/TreeActions"),
    FileSystemActions = require("../actions/FileSystemActions"),
    LocalStorageStore = require("./LocalStorageStore");

var _tree;
var _expandedPaths = ["."];
var _nodeMap = {};
var _selectedNodePath = ""; // The currently selected node

var TreeStore = Reflux.createStore({
  listenables: TreeActions,

  init: function () {
    this.listenTo(FileSystemStore, this._onFSChange);
    // this.listenTo(LocalStorageStore, this._init);
  },

  getInitialState: function () {
    return _tree;
  },

  expand: function (nodePath) {
    expandNode(nodePath);
    this.emitChange();
  },

  collapse: function (nodePath) {
    collapseNode(nodePath);
    this.emitChange();
  },

  toggle: function (nodePath) {
    if (findNode(nodePath).get("expanded")) {
      this.collapse(nodePath);
    } else {
      this.expand(nodePath);
    }
  },

  select: function (nodePath) {
    selectNode(nodePath);
    this.emitChange();
  },

  _onFSChange: function (fsEvent) {
    switch (fsEvent.event) {
      case "ready":
        init(fsEvent.rootName);
        break;
      case "dir_change":
        reloadNode(fsEvent.nodePath, fsEvent.content);
        break;
      default:
        // no op
    }
  },

  emitChange: function () {
    // TODO: this is a hack, use a service if possible
    LocalStorageStore.set("tree.expandedPaths", _expandedPaths);

    this.trigger(_tree);
  }
});

module.exports = TreeStore;


/* ======================================== *\
   Private methods
\* ======================================== */

/**
 * Initialises the root node
 */
function init(rootName) {
  // TODO: get this from AppInit action
  _expandedPaths = LocalStorageStore.get("tree.expandedPaths") || ["."];

  _tree = makeNode({
    name: rootName,
    path: ".",
    type: "folder"
  });

  expandNode(".");
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
function reloadNode(nodePath) {
  var address = _nodeMap[nodePath];
  var node = _tree.getIn(address);
  var children = node.get("children");
  var nodeList = FileSystemStore.getDirContents(nodePath);

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

  TreeStore.emitChange();

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

  FileSystemActions.openDir(nodePath);

  reloadNode(nodePath);

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
  FileSystemActions.closeDir(nodePath);
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
