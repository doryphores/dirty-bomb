var React        = require("react");
var FileSystem   = require("../filesystem");
var path         = require("path");
var EventEmitter = require("events").EventEmitter;

// Setup a listener to communicate between components
// TODO: this could be in its own module and required
// by any components that wants to communicate

var eventListener = new EventEmitter();

// React components

var Toolbar = require("./toolbar");
var Tree    = require("./tree")(eventListener);
var Editor  = require("./editor")(eventListener);

// Content root
// TODO: move this to some app configuration object
var contentDir = path.resolve(__dirname, "../../repo/content");


// Initialise file system and render UI when ready

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
