var React  = require("react");
var ipc    = require("ipc");

module.exports = React.createClass({
  reload: function () {
    window.location.reload();
  },

  runSpecs: function () {
    ipc.send("spec");
  },

  render: function () {
    return (
      <div className="toolbar">
        <button className="button" onClick={this.reload}>
          <span className="button__label">Reload</span>
          <span className="button__icon icon-loop" />
        </button>
        <button className="button" onClick={this.runSpecs}>
          <span className="button__label">Run specs</span>
          <span className="button__icon icon-beaker" />
        </button>
      </div>
    );
  }
});
