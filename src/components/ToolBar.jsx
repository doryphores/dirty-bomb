var React  = require("react");
var Reflux = require("reflux");
var RepoStore = require("../stores/RepoStore");
var RepoActions = require("../actions/RepoActions");

module.exports = React.createClass({
  mixins: [Reflux.connect(RepoStore, "repo")],

  render: function () {
    return (
      <div className="toolbar">
        <select defaultValue={this.state.repo.get("currentBranch")} onChange={this._onChangeBranch}>
          {this.state.repo.get("branches").map(function (b) {
            return (<option value={b} key={b}>{b}</option>);
          })}
        </select>

        <span>Changes: {this.state.repo.get("status").size}</span>
      </div>
    );
  },

  _onChangeBranch: function (e) {
    RepoActions.checkout(e.target.value);
  }
});
