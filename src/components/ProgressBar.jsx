var React = require('react');

var ProgressBar = React.createClass({
  render: function() {
    return (
      <div className="progress">
        <div className="progress__bar" style={{width: this.props.progress + "%"}} />
      </div>
    );
  }
});

module.exports = ProgressBar;
