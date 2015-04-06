var React       = require("react"),
    ToolBar     = require("./ToolBar"),
    Tree        = require("./Tree"),
    EditorPanes = require("./EditorPanes");

exports.render = function () {
  React.render(
    <div className="panel-container horizontal">
      <Tree />
      <div className="panel-container vertical">
        <ToolBar />
        <EditorPanes />
      </div>
    </div>,
    document.querySelector("body")
  );
};
