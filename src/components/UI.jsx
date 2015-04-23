var React         = require("react"),
    ToolBar       = require("./ToolBar"),
    Tree          = require("./Tree"),
    ImageSelector = require("./ImageSelector"),
    EditorPanes   = require("./EditorPanes");

exports.render = function () {
  React.render(
    <div className="panel-container horizontal">
      <Tree />
      <div className="workspace panel-container vertical">
        <ToolBar />
        <EditorPanes />
      </div>
      <ImageSelector />
    </div>,
    document.querySelector("body")
  );
};
