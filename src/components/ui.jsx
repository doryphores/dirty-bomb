var React      = require("react"),
    // FileSystem = require("../filesystem"),
    FileTree   = require("fs-tree"),
    path       = require("path"),
    Toolbar    = require("./toolbar"),
    Tree       = require("./tree"),
    Editor     = require("./editor");

// Content root
// TODO: move this to some app configuration object
var contentDir = path.resolve(__dirname, "../../repo/content");


// Initialise file system and render UI when ready

var fileSystem = window.fileSystem = new FileTree(contentDir);

fileSystem.on("ready", function () {
  React.render(
    <div className="panel-container horizontal">
      <Tree fileSystem={fileSystem} />
      <div className="panel-container vertical">
        <Toolbar />
        <Editor fileSystem={fileSystem} />
      </div>
    </div>,
    document.querySelector("body")
  );
});

fileSystem.build();
