var React         = require("react"),
    ToolBar       = require("./ToolBar"),
    Tree          = require("./Tree"),
    ImageSelector = require("./ImageSelector"),
    SetupPanel    = require("./SetupPanel"),
    EditorPanes   = require("./EditorPanes"),
    TreeStore     = require("../stores/TreeStore"),
    EditorStore   = require("../stores/EditorStore"),
    ImageStore    = require("../stores/ImageStore");

function getAppState() {
  return {
    treeRootNode: TreeStore.getNode("."),
    files: EditorStore.getFiles(),
    imageSelectorOpen: ImageStore.getState().open,
    images: ImageStore.getState().images,
  };
}

var App = React.createClass({
  getInitialState: function () {
    return getAppState();
  },

  componentDidMount: function() {
    TreeStore.addChangeListener(this._onChange);
    EditorStore.addChangeListener(this._onChange);
    ImageStore.addChangeListener(this._onChange);
  },

  componentWillUnmount: function() {
    TreeStore.removeChangeListener(this._onChange);
    EditorStore.removeChangeListener(this._onChange);
    ImageStore.removeChangeListener(this._onChange);
  },

  render: function () {
    return (
      <div className="panel-container horizontal">
        <Tree rootNode={this.state.treeRootNode} />
        <div className="workspace panel-container vertical">
          <ToolBar />
          <EditorPanes files={this.state.files} />
        </div>
        <ImageSelector
          open={this.state.imageSelectorOpen}
          images={this.state.images} />
        <SetupPanel />
      </div>
    );
  },

  _onChange: function () {
    this.setState(getAppState());
  }
});

module.exports = App;
