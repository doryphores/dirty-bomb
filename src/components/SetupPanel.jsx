var React            = require("react"),
    Reflux           = require("reflux"),
    ConfigStore      = require("../stores/ConfigStore"),
    RepoStore        = require("../stores/RepoStore"),
    GithubSetupPanel = require("./GithubSetupPanel"),
    RepoSetupPanel   = require("./RepoSetupPanel");

function getState() {
  return {
    currentStep: ConfigStore.isUserReady() ? "repo" : "github"
  };
}

var SetupPanel = React.createClass({
  mixins: [Reflux.ListenerMixin],

  getInitialState: function () {
    return getState();
  },

  componentDidMount: function() {
    this.listenTo(ConfigStore, this._onChange);
    this.listenTo(RepoStore, this._onChange);
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
