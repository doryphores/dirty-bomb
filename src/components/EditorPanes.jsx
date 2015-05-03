var React           = require("react"),
    PureRenderMixin = require("react/addons").addons.PureRenderMixin,
    Editor          = require("./Editor"),
    TabBar          = require("./TabBar"),
    EditorStore     = require("../stores/EditorStore"),
    EditorActions   = require("../actions/EditorActions"),
    Dialogs         = require("../Dialogs"),
    Reflux          = require("reflux");

var EditorPanes = React.createClass({
  mixins: [PureRenderMixin, Reflux.connect(EditorStore, "files")],

  render: function() {
    if (this.state.files.size === 0) return null;

    var editors = this.state.files.map(function (file) {
      return (
        <Editor
          key={file.get("path")}
          file={file}
          onClose={this._onClose.bind(this, file)} />
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

  _onChangeFocus: function (file) {
    EditorActions.focus(file.get("path"));
  },

  _onClose: function (file) {
    if (file.get("clean")) {
      EditorActions.close(file.get("path"));
    } else {
      Dialogs.confirm({
        message: "'" + file.get("name") + "' has changes. Do you want to save the changes before closing?",
        buttons: ["Save", "Cancel", "Don't save"]
      }, function (button) {
        switch (button) {
          case 0:
            EditorActions.save(file.get("path"), true);
            break;
          case 2:
            EditorActions.close(file.get("path"));
            break;
          default:
            // no op
        }
      }.bind(this));
    }
  }
});

module.exports = EditorPanes;
