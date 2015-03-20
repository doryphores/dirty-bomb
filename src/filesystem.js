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
  this.buildNode({
    name : "root",
    path : "",
    type : "folder"
  }, function (err, root) {
    if (err) {
      // TODO: handle error
    } else {
      // Make tree immutable
      this.tree = root;
      this.startWatching();
      this.emit("ready");
    }
  }.bind(this));
};


FileSystem.prototype.absolutePath = function (nodePath) {
  return path.join(this.rootPath, nodePath);
};


/**
 * Builds the given node's children list
 *
 * @param {Object}   node     The 'folder' node to build
 * @param {Function} callback
 */
FileSystem.prototype.buildNode = function (node, done) {
  var self = this;

  fs.readdir(this.absolutePath(node.path), function (err, list) {
    if (err) return done(err);

    async.map(list, function (filename, next) {
      var childNodePath = path.join(node.path, filename);

      fs.stat(self.absolutePath(childNodePath), function (err, stat) {
        if (err) return next(err);

        if (stat.isDirectory()) {
          // It's a directory so create it and build its children
          self.buildNode({
            name : filename,
            path : childNodePath,
            type : "folder"
          }, function (err, folderNode) {
            next(null, folderNode);
          });
        } else {
          // It's a file so create it
          next(null, Immutable.Map({
            name : filename,
            path : childNodePath,
            type : "file"
          }));
        }
      });
    }, function (err, children) {
      if (err) return done(err);

      // We're done with the mapping so sort the children and add them to the node

      node.children = Immutable.List(children.sort(nodeCompare));

      done(null, Immutable.Map(node));
    });
  });
};

function nodeCompare(a, b) {
  if (a.get("type") == b.get("type")) return a.get("name").localeCompare(b.get("name"));
  return a.get("type") == "folder" ? -1 : 1;
};

FileSystem.prototype.startWatching = function () {
  // Create a debounced event emitter. This prevents emitting
  // too many change events close to eachother.
  var emitChange = _.debounce(function () {
    this.emit("change", this.tree);
  }.bind(this), 100);

  // Watch the file system for changes and update the tree accordingly
  chokidar.watch(".", {
    persistent    : true,
    ignoreInitial : true,
    cwd           : this.rootPath
  }).on("all", function (event, nodePath) {
    console.log("WATCHER", event, nodePath);
    switch (event) {
      case "add":
        this.addFileNode(nodePath, function (err) {
          if (!err) emitChange();
        });
        break;
      case "addDir":
        this.addFolderNode(nodePath, function (err) {
          if (!err) emitChange();
        });
        break;
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
  fs.readFile(this.absolutePath(nodePath), {
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
 * 	@param {Array} An address array for finding the node in the tree
 *
 * @param {string}   nodePath The absolute path of the node to find
 * @param {Function} cb       Callback function
 */
FileSystem.prototype.findNode = function (nodePath, done) {
  async.reduce(nodePath.split(path.sep), [], function (address, nodeName, next) {
    if (this.tree.getIn(address.concat("children")).every(function (node, index) {
      if (node.get("name") == nodeName) {
        next(null, address.concat("children", index));
        // Returning false here breaks out of the loop
        return false;
      }

      // Returning true means "no match"
      return true;
    })) {
      // We get here when non of the child nodes match the node name
      next(new Error("Path not found: " + nodeName));
    }
  }.bind(this), done);
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
  this.findNode(nodePath, function (err, address) {
    if (err) return cb(err);

    this.tree = this.tree.updateIn(_.initial(address), function (list) {
      return list.delete(_.last(address));
    });

    cb(null);
  }.bind(this));
};


FileSystem.prototype.addFileNode = function (nodePath, done) {
  this.addFolderNode(path.dirname(nodePath), function (err, address) {
    if (err) return done(err);

    this.tree = this.tree.updateIn(address.concat("children"), function (children) {
      return children.push(Immutable.Map({
        name : path.basename(nodePath),
        path : nodePath,
        type : "file"
      })).sort(nodeCompare);
    });

    done();
  }.bind(this));
};


FileSystem.prototype.addFolderNode = function (nodePath, done) {
  var self = this;

  if (nodePath === ".") {
    return done(null, []);
  }

  async.reduce(nodePath.split(path.sep), [], function (address, nodeName, next) {
    var currentNode = self.tree.getIn(address);

    if (currentNode.get("children").every(function (node, index) {
      if (node.get("name") == nodeName) {
        next(null, address.concat("children", index));
        // Returning false here breaks out of the loop
        return false;
      }

      return true;
    })) {
      var index;
      // New node
      self.tree = self.tree.updateIn(address.concat("children"), function (list) {
        var folderNode = Immutable.Map({
          name : nodeName,
          path : path.join(currentNode.get("path"), nodeName),
          type : "folder",
          children : Immutable.List([])
        });
        var l = list.push(folderNode).sort(nodeCompare)
        index = l.indexOf(folderNode);
        return l;
      });
      next(null, address.concat("children", index));
    }
  }, function (err, address) {
    done(null, address);
  });
};
