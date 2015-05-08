var React         = require("react"),
    ToolBar       = require("./ToolBar"),
    Tree          = require("./Tree"),
    ImageSelector = require("./ImageSelector"),
    EditorPanes   = require("./EditorPanes");

var App = React.createClass({
  render: function () {
    return (
      <div className="panel-container horizontal">
        <Tree />
        <div className="workspace panel-container vertical">
          <ToolBar />
          <EditorPanes />
        </div>
        <ImageSelector />
      </div>
    );
  }
});

module.exports = App;
