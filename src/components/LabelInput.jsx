var React = require("react");

var LabelInput = React.createClass({
  getInitialState: function () {
    return {
      filename: this.props.filename
    };
  },

  componentDidMount: function() {
    var inputElement = React.findDOMNode(this.refs.input);
    var extIndex = this.props.filename.lastIndexOf(".md");
    inputElement.setSelectionRange(0,
      extIndex > -1 ? extIndex : this.props.filename.length);
    inputElement.focus();
  },

  render: function () {
    return (
      <div className="label-input">
        <input ref="input"
            value={this.state.filename}
            onChange={this._onChange}
            onKeyUp={this._onKeyUp}
            onBlur={this._onBlur} />
      </div>
    )
  },

  _onChange: function (e) {
    this.setState({filename: e.currentTarget.value});
  },

  _onKeyUp: function (e) {
    switch (e.key) {
      case "Enter":
        var formatted = this.state.filename.toLowerCase().replace(/\s+/g, "-");
        this.props.onChange(formatted);
        break;
      case "Escape":
        this.props.onChange(this.props.filename);
        break;
      default:
        // no op
    }
  },

  _onBlur: function () {
    this.props.onChange(this.props.filename);
  }
});

module.exports = LabelInput;
