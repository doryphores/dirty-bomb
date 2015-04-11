var remote = require("remote");
var app    = remote.require("app");
var React  = require("react");
var ipc    = require("ipc");

module.exports = React.createClass({
  quit: function () {
    app.quit();
  },

  reload: function () {
    window.location.reload();
  },

  runSpecs: function () {
    ipc.send("spec");
  },

  render: function () {
    return (
      <div className="toolbar">
        <button onClick={this.quit}>Quit</button>
        <button onClick={this.reload}>Reload</button>
        <button onClick={this.runSpecs}>Run specs</button>
      </div>
    );
  }
});
