var React   = require("react"),
    Toolbar = require("./toolbar"),
    Tree    = require("./tree"),
    Editor  = require("./editor");

exports.render = function () {
  React.render(
    <div className="panel-container horizontal">
      <Tree />
      <div className="panel-container vertical">
        <Toolbar />
        <Editor />
      </div>
    </div>,
    document.querySelector("body")
  );
};
