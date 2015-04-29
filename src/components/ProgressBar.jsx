var React = require("react");

var ProgressBar = React.createClass({
  render: function() {
    var width = (this.props.progress || 0) + "%";
    return (
      <div className="progress">
        <div className="progress__bar" style={{width: this.props.progress + "%"}} />
        <div className="progress__label">
          {this.props.label + (this.props.progress ? " - " + width : "")}
        </div>
      </div>
    );
  }
});

module.exports = ProgressBar;
