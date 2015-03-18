var React      = require("react");
var FileSystem = require("../filesystem");
var path       = require("path");
var EventEmitter = require("events").EventEmitter;

// Setup a listener to communicate between components
var eventListener = new EventEmitter();

var Toolbar = require("./toolbar");
var Tree    = require("./tree")(eventListener);
var Editor  = require("./editor")(eventListener);

// Content root
// TODO: move this to some app configuration object
var contentDir = path.resolve(__dirname, "../../repo/content");

var fileSystem = new FileSystem(contentDir);

fileSystem.on("ready", function () {
  React.render(
    <div>
      <Toolbar />
      <Tree fileSystem={fileSystem} />
      <Editor fileSystem={fileSystem} />
    </div>,
    document.getElementById("js-app")
  );
});

fileSystem.init();
