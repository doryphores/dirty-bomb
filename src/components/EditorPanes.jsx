var React         = require("react"),
    Editor        = require("./Editor"),
    TabBar        = require("./TabBar"),
    EditorStore   = require("../stores/EditorStore"),
    EditorActions = require("../actions/EditorActions"),
    Immutable     = require("immutable"),
    ipc           = require("ipc");


var EditorPanes = React.createClass({
  getInitialState: function() {
    return { files: EditorStore.getFiles() };
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return this.state.files !== nextState.files;
  },

  componentDidMount: function() {
    EditorStore.addChangeListener(this._onChange);
  },

  componentWillUnmout: function() {
    EditorStore.removeChangeListener(this._onChange);
  },

  render: function() {
    var editors = this.state.files.map(function (file) {
      return (
        <Editor
          key={file.get("path")}
          file={file}
          onClose={this._onClose.bind(this, file.get("path"))} />
      );
    }.bind(this));

    return (
      <div className="panel-container vertical">
        <TabBar
          files={this.state.files}
          onChangeFocus={this._onChangeFocus}
          onClose={this._onClose} />
        <div className="editor-panes">
          {editors}
        </div>
      </div>
    );
  },

  _onChange: function () {
    this.setState({ files: EditorStore.getFiles() });
  },

  _onChangeFocus: function (filePath) {
    EditorActions.focusOn(filePath);
  },

  _onClose: function (filePath) {
    var file = EditorStore.getFile(filePath);
    if (file.get("clean")) {
      EditorActions.close(filePath);
    } else {
      ipc.on("dialog.message.callback", function (button) {
        switch (button) {
          case 0:
            EditorActions.saveAndClose(filePath);
            break;
          case 2:
            EditorActions.close(filePath);
            break;
          default:
            // no op
        }
      }.bind(this));
      ipc.send("dialog.message", {
        type: "warning",
        buttons: ["Save", "Cancel", "Don't save"],
        message: "'" + file.get("name") + "' has changed. Do you want to save the changes before closing?"
      });
    }
  }
});

module.exports = EditorPanes;
