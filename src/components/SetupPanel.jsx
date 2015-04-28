var React         = require("react"),
    app           = require("remote").require("app"),
    Dialogs       = require("../Dialogs"),
    path          = require("path"),
    SettingsStore = require("../stores/SettingsStore"),
    SetupActions  = require("../actions/SetupActions");


function getState() {
  var currentStep = SettingsStore.getUser() ? "repo" : "github";
  return {
    settings: SettingsStore.getSettings(),
    currentStep: currentStep
  };
}

var SetupPanel = React.createClass({
  getInitialState: function () {
    return getState();
  },

  componentDidMount: function() {
    SettingsStore.addChangeListener(this._onChange);
  },

  componentWillUnmount: function() {
    SettingsStore.removeChangeListener(this._onChange);
  },

  render: function () {
    return (
      <div className="setup-panel overlay overlay--is-open">
        <form
          className={this.state.currentStep === "github" ? "is-active" : ""}
          onSubmit={this._authenticate}>
          <h2 className="icon-octoface">
            Connect to GitHub
          </h2>
          <div>
            <label>
              Your GitHub email address
              <input type="email" value="martin.laine@gmail.com" required ref="email" />
            </label>
          </div>
          <div>
            <label>
              Your GitHub password
              <input type="password" value="o9@GQkt8%HFJKvgf" required ref="password" />
            </label>
          </div>
          <div>
            <button className="button">
              <span className="button__label">Login</span>
              <span className="button__icon icon-key" />
            </button>
          </div>
        </form>
        <form
          className={this.state.currentStep === "repo" ? "is-active" : ""}
          onSubmit={this._setup}>
          <h2 className="icon-repo">
            Setup repository
          </h2>
          <div>
            <label>
              Choose a location for the repository
              <input type="text" readOnly value={this.state.repoPath} onClick={this._selectRepoLocation} />
            </label>
          </div>
          <div>
            <button className="button">
              <span className="button__label">Download</span>
              <span className="button__icon icon-cloud-download" />
            </button>
          </div>
        </form>
      </div>
    );
  },

  _onChange: function () {
    this.setState(getState());
  },

  _authenticate: function (e) {
    e.preventDefault();
    SetupActions.setupGithub(
      React.findDOMNode(this.refs.email).value,
      React.findDOMNode(this.refs.password).value
    );
  },

  _setup: function (e) {
    e.preventDefault();
  },

  _selectRepoLocation: function () {
    Dialogs.promptForDirectory({
      defaultPath: this.state.repoPath
    }, function (directoryPath) {
      if (directoryPath) {
        this.setState({repoPath: directoryPath});
      }
    }.bind(this));
  }
});

module.exports = SetupPanel;
