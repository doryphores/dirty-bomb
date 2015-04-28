var React         = require("react"),
    ToolBar       = require("./ToolBar"),
    Tree          = require("./Tree"),
    ImageSelector = require("./ImageSelector"),
    SetupPanel    = require("./SetupPanel"),
    EditorPanes   = require("./EditorPanes"),
    TreeStore     = require("../stores/TreeStore"),
    EditorStore   = require("../stores/EditorStore"),
    ImageStore    = require("../stores/ImageStore"),
    SettingsStore = require("../stores/SettingsStore"),
    AppActions    = require("../actions/AppActions");

function getAppState() {
  return {
    treeRootNode: TreeStore.getNode("."),
    files: EditorStore.getFiles(),
    imageSelectorOpen: ImageStore.getState().open,
    images: ImageStore.getState().images,
    settings: SettingsStore.getSettings()
  };
}

var App = React.createClass({
  getInitialState: function () {
    return getAppState();
  },

  componentDidMount: function() {
    SettingsStore.addChangeListener(this._onChange);
    TreeStore.addChangeListener(this._onChange);
    EditorStore.addChangeListener(this._onChange);
    ImageStore.addChangeListener(this._onChange);
    AppActions.init();
  },

  componentWillUnmount: function() {
    SettingsStore.removeChangeListener(this._onChange);
    TreeStore.removeChangeListener(this._onChange);
    EditorStore.removeChangeListener(this._onChange);
    ImageStore.removeChangeListener(this._onChange);
  },

  render: function () {
    if (!SettingsStore.isReady()) {
      return null;
    }
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
        <SetupPanel settings={this.state.settings} />
      </div>
    );
  },

  _onChange: function () {
    this.setState(getAppState());
  }
});

module.exports = App;
