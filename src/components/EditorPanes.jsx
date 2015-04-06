var React          = require("react"),
    Editor         = require("./Editor"),
    TabBar         = require("./TabBar"),
    ContentStore   = require("../stores/ContentStore"),
    ContentActions = require("../actions/ContentActions"),
    Immutable      = require("immutable");


var EditorPanes = React.createClass({
  getInitialState: function() {
    return {
      data: Immutable.Map({
        files: ContentStore.getOpenFiles(),
        activeFile: null
      })
    };
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return this.state.data !== nextState.data;
  },

  componentDidMount: function() {
    ContentStore.addChangeListener(this._onChange);
  },

  componentWillUnmout: function() {
    ContentStore.removeChangeListener(this._onChange);
  },

  render: function() {
    var editors = this.state.data.get("files").map(function (file) {
      return (
        <Editor
          key={file.path}
          focused={file.path === this.state.data.get("activeFile")}
          file={file} />
      );
    }.bind(this));

    return (
      <div className="panel-container vertical">
        <TabBar
          files={this.state.data.get("files")}
          focusedFile={this.state.data.get("activeFile")}
          onChangeFocus={this._onChangeFocus}
          onClose={this._onClose} />
        <div className="editor-panes">
          {editors}
        </div>
      </div>
    );
  },

  _onChange: function () {
    var newData = this.state.data.set("files", ContentStore.getOpenFiles());

    // Set focus on new file
    if (newData.get("files").size > this.state.data.get("files").size) {
      newData = newData.set("activeFile", newData.get("files").last().path);
    }

    this.setState({data: newData});
  },

  _onChangeFocus: function (filePath) {
    this.setState({data: this.state.data.set("activeFile", filePath)});
  },

  _onClose: function (filePath) {
    ContentActions.close(filePath);
  }
});

module.exports = EditorPanes;
