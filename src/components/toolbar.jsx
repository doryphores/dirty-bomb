var remote = require("remote");
var app    = remote.require("app");
var ipc    = require("ipc");
var React  = require("react");

module.exports = React.createClass({
  quit: function () {
    app.quit();
  },

  reload: function () {
    ipc.send("dev.reload");
  },
  
  render: function () {
    return (
      <div>
        <button onClick={this.quit}>Quit</button>
        <button onClick={this.reload}>Reload</button>
      </div>
    );
  }
});
