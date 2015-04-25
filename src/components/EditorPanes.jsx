var React         = require("react"),
    Editor        = require("./Editor"),
    TabBar        = require("./TabBar"),
    EditorStore   = require("../stores/EditorStore"),
    EditorActions = require("../actions/EditorActions"),
    Dialogs       = require("../Dialogs");


var EditorPanes = React.createClass({
  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props !== nextProps;
  },

  render: function() {
    var editors = this.props.files.map(function (file) {
      return (
        <Editor
          key={file.get("path")}
          file={file}
          onClose={this._onClose.bind(this, file.get("path"))} />
      );
    }.bind(this));

    if (editors.size === 0) return null;

    return (
      <div className="panel-container vertical">
        <TabBar
          files={this.props.files}
          onChangeFocus={this._onChangeFocus}
          onClose={this._onClose} />
        <div className="editor-panes">
          {editors}
        </div>
      </div>
    );
  },

  _onChangeFocus: function (filePath) {
    EditorActions.focusOn(filePath);
  },

  _onClose: function (filePath) {
    var file = EditorStore.getFile(filePath);
    if (file.get("clean")) {
      EditorActions.close(filePath);
    } else {
      Dialogs.confirm({
        message: "'" + file.get("name") + "' has changes. Do you want to save the changes before closing?",
        buttons: ["Save", "Cancel", "Don't save"]
      }, function (button) {
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
    }
  }
});

module.exports = EditorPanes;
