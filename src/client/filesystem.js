var fs           = require("fs-extra");
var path         = require("path");
var chokidar     = require("chokidar");
var _            = require("underscore");
var Immutable    = require("immutable");
var EventEmitter = require("events").EventEmitter;

var contentDir = path.resolve(__dirname, "../../repo/content");


/*=============================================*\
  FileSystem object
\*=============================================*/

var FileSystem = new EventEmitter();

module.exports = FileSystem;


/*=============================================*\
  Initialize content tree
\*=============================================*/

FileSystem.tree = (function () {
  var root = {
    name  : "root",
    path  : contentDir,
    depth : 0
  };

  root.children = fileList(contentDir, root);

  return Immutable.fromJS(root);
}());


/*=============================================*\
  File system watcher
\*=============================================*/

chokidar.watch(contentDir, {
  persistent    : true,
  ignoreInitial : true
// }).on("unlink", function (nodePath) {
//   deleteNode(nodePath, function (err, tree) {
//     if (!err) {
//       FileSystem.emit("change", tree);
//     } else {
//       console.log(err);
//     }
//   });
}).on("unlinkDir", function (nodePath) {
  deleteNode(nodePath, function (err, tree) {
    if (!err) {
      FileSystem.tree = tree;
      FileSystem.emit("change");
    } else {
      console.log(err);
    }
  });
}).on("all", function (event, path) {
  // if (event == "unlink" || event == "unlinkDir")
  console.log("WATCHER", event, path);
});


/*=============================================*\
  Private methods
\*=============================================*/

function fileList(rootPath, parent) {
  return fs.readdirSync(rootPath).map(function (filename) {
    var fullPath = path.join(rootPath, filename);
    var s = fs.statSync(fullPath);
    var node = {
      name     : filename,
      path     : fullPath,
      depth    : parent.depth + 1
    };

    if (s.isDirectory()) {
      node.type = "folder";
      node.children = fileList(fullPath, node).sort(function (a, b) {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        if (a.type === "file") return 1;
        return -1;
      });
    } else {
      node.type = "file";
    }

    return node;
  });
}

function findNode(nodePath, cb) {
  var currentNode = FileSystem.tree;
  var indices = path.relative(contentDir, nodePath).split(path.sep).map(function (nodeName) {
    var children = currentNode.get("children");
    for (var i = 0; i < children.size; i++) {
      if (children.getIn([i, "name"]) == nodeName) {
        currentNode = children.get(i);
        return ["children", i];
      }
    }
    cb(new Error("Path not found: " + nodePath));
  });

  cb(null, _.flatten(indices));
}

function deleteNode(nodePath, cb) {
  findNode(nodePath, function (err, indices) {
    if (!err) {
      var nodeIndex = indices.pop();
      cb(null, FileSystem.tree.updateIn(indices, function (list) {
        return list.splice(nodeIndex, 1);
      }));
    } else {
      cb(err);
    }
  });
}
