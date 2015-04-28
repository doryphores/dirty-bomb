var React         = require("react"),
    app           = require("remote").require("app"),
    Dialogs       = require("../Dialogs"),
    path          = require("path"),
    SettingsStore = require("../stores/SettingsStore"),
    RepoStore     = require("../stores/RepoStore"),
    SetupActions  = require("../actions/SetupActions"),
    ProgressBar   = require("./ProgressBar");


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
    RepoStore.addProgressListener(this._onProgress);
  },

  componentWillUnmount: function() {
    SettingsStore.removeChangeListener(this._onChange);
    RepoStore.removeProgressListener(this._onProgress);
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
              <input type="email" required ref="email" />
            </label>
          </div>
          <div>
            <label>
              Your GitHub password
              <input type="password" required ref="password" />
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
              <input type="text" ref="repoPath" required readOnly value={this.state.repoPath} onClick={this._selectRepoLocation} />
            </label>
          </div>
          <div>
            <button className="button">
              <span className="button__label">Download</span>
              <span className="button__icon icon-cloud-download" />
            </button>
          </div>
        </form>
        <div className={this.state.progress > 0 ? "is-active" : ""}>
          <ProgressBar progress={this.state.progress} />
        </div>
      </div>
    );
  },

  _onChange: function () {
    this.setState(getState());
  },

  _onProgress: function (progress) {
    this.setState({progress: progress});
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
    SetupActions.setupRepo(this.state.repoPath);
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
