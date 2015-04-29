var React        = require("react"),
    classNames   = require("classnames"),
    Dialogs      = require("../Dialogs"),
    SetupActions = require("../actions/SetupActions"),
    RepoStore    = require("../stores/RepoStore"),
    ProgressBar  = require("./ProgressBar");

var RepoSetupPanel = React.createClass({
  getInitialState: function () {
    return {
      repoPath: "",
      inProgress: false,
      progress: 0
    };
  },

  componentDidMount: function() {
    RepoStore.addProgressListener(this._onProgress);
  },

  componentWillUnmount: function() {
    RepoStore.removeProgressListener(this._onProgress);
  },

  render: function() {
    var panelClasses = classNames("setup__panel", {
      "setup__panel--in-progress": this.state.inProgress
    });

    return (
      <div className={panelClasses}>
        <form className="setup__form" onSubmit={this._onSubmit}>
          <h2 className="icon-repo">Setup repository</h2>
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
        <div className="setup__progress-indicator">
          <ProgressBar
            label="Cloning repository"
            progress={this.state.progress} />
        </div>
      </div>
    );
  },

  _onProgress: function (progress) {
    this.setState({progress: progress});
  },

  _selectRepoLocation: function () {
    Dialogs.promptForDirectory({
      defaultPath: this.state.repoPath
    }, function (directoryPath) {
      if (directoryPath) {
        this.setState({repoPath: directoryPath});
      }
    }.bind(this));
  },

  _onSubmit: function (e) {
    e.preventDefault();
    this.setState({inProgress: true});
    SetupActions.setupRepo(this.state.repoPath);
  }
});

module.exports = RepoSetupPanel;
