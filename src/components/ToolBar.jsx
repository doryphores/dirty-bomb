var remote = require("remote");
var app    = remote.require("app");
var React  = require("react");

module.exports = React.createClass({
  quit: function () {
    app.quit();
  },

  reload: function () {
    window.location.reload();
  },

  render: function () {
    return (
      <div className="toolbar panel">
        <button onClick={this.quit}>Quit</button>
        <button onClick={this.reload}>Reload</button>
      </div>
    );
  }
});
