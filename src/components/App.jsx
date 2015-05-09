var React         = require("react"),
    ToolBar       = require("./ToolBar"),
    Tree          = require("./Tree"),
    ImageSelector = require("./ImageSelector"),
    EditorPanes   = require("./EditorPanes");

var App = React.createClass({
  render: function () {
    return (
      <div className="app">
        <ToolBar />
        <div className="workspace">
          <Tree />
          <EditorPanes />
        </div>
        <ImageSelector />
      </div>
    );
  }
});

module.exports = App;
