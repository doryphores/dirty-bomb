var React        = require("react"),
    classNames   = require("classnames"),
    SetupActions = require("../actions/SetupActions");

var GithubSetupPanel = React.createClass({
  getInitialState: function () {
    return {
      inProgress: false
    };
  },

  render: function() {
    var panelClasses = classNames("setup__panel", {
      "setup__panel--in-progress": this.state.inProgress
    });

    return (
      <div className={panelClasses}>
        <form className="setup__form" onSubmit={this._onSubmit}>
          <h2 className="icon-octoface">Connect to GitHub</h2>
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
        <div className="setup__progress-indicator">
          Connecting to GitHub
        </div>
      </div>
    );
  },

  _onSubmit: function (e) {
    e.preventDefault();

    this.setState({inProgress: true});
    SetupActions.setupGithub(
      this.refs.email.getDOMNode().value,
      this.refs.password.getDOMNode().value
    );
  }
});

module.exports = GithubSetupPanel;
