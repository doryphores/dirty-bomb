var fs           = require("fs-extra"),
    path         = require("path"),
    chokidar     = require("chokidar"),
    _            = require("underscore"),
    async        = require("async"),
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
  // Build content tree
  buildNode({
    name : "root",
    path : this.rootPath,
    type : "folder"
  }, function (err, root) {
    if (err) {
      // TODO: handle error
    } else {
      // Make tree immutable
      this.tree = Immutable.fromJS(root);
      this.startWatching();
      this.emit("ready");
    }
  }.bind(this));
};

FileSystem.prototype.startWatching = function () {
  // Create a debounced event emitter. This prevents emitting
  // too many change events close to eachother.
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
      // case "addDir":
      // case "add":
      //   this.addNode(nodePath), function (err) {
      //     if (!err) emitChange();
      //   }
      //   break;
      case "unlink":
      case "unlinkDir":
        this.removeNode(nodePath, function (err) {
          if (!err) emitChange();
        });
        break;
    }
  }.bind(this));
}

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


function buildNode(node, callback) {
  fs.readdir(node.path, function (err, list) {
    if (err) return callback(err);

    async.map(list, function (filename, next) {
      var childNodePath = path.join(node.path, filename);

      fs.stat(childNodePath, function (err, stat) {
        if (err) return mapCallback(err);

        if (stat.isDirectory()) {
          // It's a directory so create it and build its children
          buildNode({
            name : filename,
            path : childNodePath,
            type : "folder"
          }, function (err, folderNode) {
            next(null, folderNode);
          });
        } else {
          // It's a file so create it
          next(null, {
            name : filename,
            path : childNodePath,
            type : "file"
          });
        }
      });
    }, function (err, children) {
      // We're done with the mapping so add the children to the node
      node.children = children.sort(function (a, b) {
        if (a.type == b.type) return a.name.localeCompare(b.name);
        if (a.type == "folder") return -1;
        return 1;
      });
      callback(null, node);
    });
  });
}
