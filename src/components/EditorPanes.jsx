var React         = require("react"),
    Editor        = require("./Editor"),
    TabBar        = require("./TabBar"),
    EditorStore   = require("../stores/EditorStore"),
    EditorActions = require("../actions/EditorActions"),
    Immutable     = require("immutable");


var EditorPanes = React.createClass({
  getInitialState: function() {
    return { data: EditorStore.getStore() };
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return this.state.data !== nextState.data;
  },

  componentDidMount: function() {
    EditorStore.addChangeListener(this._onChange);
  },

  componentWillUnmout: function() {
    EditorStore.removeChangeListener(this._onChange);
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
    this.setState({data: EditorStore.getStore()});
  },

  _onChangeFocus: function (filePath) {
    EditorActions.focusOn(filePath);
  },

  _onClose: function (filePath) {
    EditorActions.close(filePath);
  }
});

module.exports = EditorPanes;
