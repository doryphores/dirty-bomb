var React        = require("react"),
    FileSystem   = require("../filesystem"),
    path         = require("path"),
    Toolbar      = require("./toolbar"),
    Tree         = require("./tree"),
    Editor       = require("./editor");

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
    document.querySelector("body")
  );
});

fileSystem.init();
