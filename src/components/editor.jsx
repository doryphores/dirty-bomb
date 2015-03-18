var React        = require("react");

var EventListener;

var Editor = React.createClass({
  getInitialState: function () {
    return {
      fileContent: ""
    };
  },
  
  componentDidMount: function () {
    EventListener.on("node.selected", function (nodePath) {
      this.props.fileSystem.readFile(nodePath, function (fileContent) {
        this.setState({fileContent: fileContent});
      }.bind(this));
    }.bind(this));
  },
  
  handleChange: function (event) {
    this.setState({fileContent: event.target.value});
  },
  
  render: function () {
    return (
      <div className="editor">
        <textarea value={this.state.fileContent} onChange={this.handleChange} />
      </div>
    );
  }
});

module.exports = function (listener) {
  EventListener = listener;
  return Editor;
};
