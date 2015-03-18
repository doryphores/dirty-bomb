var fs           = require("fs-extra"),
    path         = require("path"),
    chokidar     = require("chokidar"),
    _            = require("underscore"),
    Immutable    = require("immutable"),
    util         = require("util"),
    EventEmitter = require("events").EventEmitter;


/*=============================================*\
  FileSystem object
\*=============================================*/

var FileSystem = module.exports = function (rootPath) {
  this.rootPath = rootPath;
};

util.inherits(FileSystem, EventEmitter);





/*=============================================*\
  Public methods
\*=============================================*/


FileSystem.prototype.init = function () {
  // Root node
  var root = {
    name  : "root",
    path  : this.rootPath,
    depth : 0
  };

  // Build content tree
  root.children = nodeList(this.rootPath, root);

  this.tree = Immutable.fromJS(root);

  // Debounced event emitter this prevents emitting
  // multiple change events close together
  var emitChange = _.debounce(function () {
    this.emit("change", this.tree);
  }.bind(this), 100);

  // Watch the file system for changes and update the tree accordingly
  chokidar.watch(this.rootPath, {
    persistent    : true,
    ignoreInitial : true
  }).on("all", function (event, nodePath) {
    console.log("WATCHER", event, nodePath);
    switch (event) {
      case "unlink":
      case "unlinkDir":
        this.removeNode(nodePath, function (err, tree) {
          if (!err) emitChange();
        });
        break;
    }
  }.bind(this));
  
  this.emit("ready");
};


FileSystem.prototype.readFile = function (nodePath, cb) {
  fs.readFile(nodePath, {
    encoding: "utf-8"
  }, function (err, data) {
    if (!err) cb(data);
    else console.log(err);
  });
};


/**
 * Finds a node in the content tree
 *
 * Callback arguments:
 * 	@param {Error} An error object when path is not found (null otherwise)
 * 	@param {Array} An index array for finding the node in the tree
 *
 * @param {string}   nodePath The absolute path of the node to find
 * @param {Function} cb       Callback function
 */
FileSystem.prototype.findNode = function (nodePath, cb) {
  var currentNode = this.tree;
  var pathComponents = path.relative(contentDir, nodePath).split(path.sep);
  
  // Compute a list of tree indices for the given path
  var indices = _.compact(pathComponents.map(function (nodeName) {
    var children = currentNode.get("children");
    for (var i = 0; i < children.size; i++) {
      if (children.getIn([i, "name"]) == nodeName) {
        currentNode = children.get(i);
        return ["children", i];
      }
    }
    return null;
  }));

  // Return an error when the index list does not match the given path
  if (indices.length != pathComponents.length) {
    return cb(new Error("Path not found: " + nodePath));
  }

  cb(null, _.flatten(indices));
};


/**
 * Removes a node from the content tree
 *
 * Callback arguments:
 * 	@param {Error} An error object when path is not found (null otherwise)
 *
 * @param {string}   nodePath The path of the node to remove
 * @param {Function} cb       Callback function
 */
FileSystem.prototype.removeNode = function (nodePath, cb) {
  this.findNode(nodePath, function (err, indices) {
    if (err) return cb(err);

    var nodeIndex = indices.pop();
    
    this.tree = this.tree.updateIn(indices, function (list) {
      return list.splice(nodeIndex, 1);
    });
    
    cb(null);
  }.bind(this));
};





/*=============================================*\
  Private methods
\*=============================================*/


/**
 * Builds a node tree from a path to the file system
 *
 * @param {string} rootPath Absolute path to a folder on the file system
 * @param {object} parent   Parent node used to calculate depth
 */
function nodeList(rootPath, parent) {
  return fs.readdirSync(rootPath).map(function (filename) {
    var fullPath = path.join(rootPath, filename);
    var s = fs.statSync(fullPath);

    var node = {
      name  : filename,
      path  : fullPath,
      depth : parent.depth + 1
    };

    if (s.isDirectory()) {
      node.type = "folder";
      node.children = nodeList(fullPath, node).sort(function (a, b) {
        // This sorts the nodes by type and name
        if (a.type == b.type) return a.name.localeCompare(b.name);
        if (a.type == "file") return 1;
        return -1;
      });
    } else {
      node.type = "file";
    }

    return node;
  });
}
