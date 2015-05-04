var React         = require("react"),
    ToolBar       = require("./ToolBar"),
    Tree          = require("./Tree"),
    ImageSelector = require("./ImageSelector"),
    SetupPanel    = require("./SetupPanel"),
    EditorPanes   = require("./EditorPanes"),
    SettingsStore = require("../stores/SettingsStore"),
    RepoStore     = require("../stores/RepoStore"),
    AppActions    = require("../actions/AppActions");

function getAppState() {
  return {
    ready: SettingsStore.isReady() && RepoStore.isReady()
  };
}

var App = React.createClass({
  getInitialState: function () {
    return getAppState();
  },

  componentDidMount: function() {
    SettingsStore.addChangeListener(this._onChange);
    RepoStore.addChangeListener(this._onChange);

    AppActions.init();
  },

  componentWillUnmount: function() {
    SettingsStore.removeChangeListener(this._onChange);
    RepoStore.removeChangeListener(this._onChange);
  },

  render: function () {
    if (this.state.ready) {
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
    } else {
      return (
        <SetupPanel settings={this.state.settings} />
      );
    }
  },

  _onChange: function () {
    this.setState(getAppState());
  }
});

module.exports = App;
