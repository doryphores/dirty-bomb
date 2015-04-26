var React   = require("react"),
    app     = require("remote").require("app"),
    Dialogs = require("../Dialogs"),
    path    = require("path");

var SetupPanel = React.createClass({
  getInitialState: function () {
    return {
      currentStep: "github",
      repoPath: path.join(app.getPath("home"), "DirtyBomb")
    }
  },

  render: function () {
    return (
      <div className="setup-panel overlay overlay--is-open">
        <form className={this.state.currentStep === "github" ? "is-active" : ""}>
          <h2 className="icon-octoface">
            Connect to GitHub
          </h2>

          <div>
            <label>
              Your GitHub username
              <input type="text" />
            </label>
          </div>

          <div>
            <label>
              Your GitHub password
              <input type="password" />
            </label>
          </div>

          <div>
            <button className="button" onClick={this._authenticate}>
              <span className="button__label">Login</span>
              <span className="button__icon icon-key" />
            </button>
          </div>
        </form>

        <form className={this.state.currentStep === "repo" ? "is-active" : ""}>
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
            <button className="button" onClick={this._setup}>
              <span className="button__label">Download</span>
              <span className="button__icon icon-cloud-download" />
            </button>
          </div>
        </form>
      </div>
    );
  },

  _authenticate: function (e) {
    e.preventDefault();
    this.setState({currentStep: "repo"});
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
