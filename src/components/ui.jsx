var React       = require("react"),
    Toolbar     = require("./toolbar"),
    Tree        = require("./tree"),
    EditorPanes = require("./EditorPanes");

exports.render = function () {
  React.render(
    <div className="panel-container horizontal">
      <Tree />
      <div className="panel-container vertical">
        <Toolbar />
        <EditorPanes />
      </div>
    </div>,
    document.querySelector("body")
  );
};
