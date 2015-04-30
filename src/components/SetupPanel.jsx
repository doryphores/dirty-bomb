var React            = require("react"),
    SettingsStore    = require("../stores/SettingsStore"),
    RepoStore        = require("../stores/RepoStore"),
    GithubSetupPanel = require("./GithubSetupPanel"),
    RepoSetupPanel   = require("./RepoSetupPanel");

function getState() {
  return {
    currentStep: SettingsStore.isReady() ? "repo" : "github"
  };
}

var SetupPanel = React.createClass({
  getInitialState: function () {
    return getState();
  },

  componentDidMount: function() {
    SettingsStore.addChangeListener(this._onChange);
    RepoStore.addChangeListener(this._onChange);
  },

  componentWillUnmount: function() {
    SettingsStore.removeChangeListener(this._onChange);
    RepoStore.removeChangeListener(this._onChange);
  },

  render: function () {
    var panel;
    if (this.state.currentStep === "github") {
      panel = (<GithubSetupPanel />);
    } else {
      panel = (<RepoSetupPanel />);
    }
    return (
      <div className="setup__screen overlay overlay--is-open">
        {panel}
      </div>
    );
  },

  _onChange: function () {
    this.setState(getState());
  }
});

module.exports = SetupPanel;
