var React         = require("react"),
    Showdown      = require("showdown"),
    path          = require("path"),
    _             = require("underscore"),
    CodeMirror    = require("codemirror"),
    classNames    = require("classnames"),
    Dialogs       = require("../Dialogs"),
    EditorActions = require("../actions/EditorActions");

require("codemirror/mode/markdown/markdown");

var imageRoot = path.resolve(__dirname, "../../repo/public/media");

var markdownExtensions = function (converter) {
  return [
    {
      type   : "lang",
      filter : function (md) {
        return md.replace(/---[\s\S]*---/, "");
      }
    },
    {
      type    : "lang",
      regex   : "/media",
      replace : "file://" + imageRoot
    }
  ];
};

var converter = new Showdown.converter({extensions: [markdownExtensions]});


/*=============================================*\
  Component definitions
\*=============================================*/


var Editor = module.exports = React.createClass({
  componentDidMount: function () {
    this.editor = CodeMirror(this.refs.editor.getDOMNode(), {
      mode         : "markdown",
      theme        : "mbo",
      lineWrapping : true,
      value        : this.props.file.get("content")
    });

    this.editor.on("change", _.debounce(this._onChange, 200));

    this.editor.focus();
  },

  componentWillUnmount: function() {
    this.editor.off("change", this._onChange);
  },

  componentDidUpdate: function (prevProps, prevState) {
    if (!prevProps.file.get("active") && this.props.file.get("active")) {
      this.editor.focus();
    }

    // Update editor if the clean content has changed on disk
    if (this.props.file.get("clean") && this.props.file.get("content") !== this.editor.getValue()) {
      this.editor.setValue(this.props.file.get("content"));
    }
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props.file !== nextProps.file;
  },

  render: function () {
    var previewHTML = converter.makeHtml(this.props.file.get("content"));
    return (
      <div className={this._classNames()}>
        <div className="editor panel-container vertical">
          <div className="editor-toolbar">
            <button className="button" onClick={this._onSave}>
              <span className="button__label">Save</span>
              <span className="button__icon icon-checkmark" />
            </button>
            <button className="button" onClick={this._onDelete}>
              <span className="button__label">Delete</span>
              <span className="button__icon icon-trash-fill" />
            </button>
            <button className="button">
              <span className="button__label">Insert image</span>
              <span className="button__icon icon-camera" />
            </button>
          </div>
          <div className="cm-container" ref="editor" />
        </div>
        <div className="preview" dangerouslySetInnerHTML={{__html: previewHTML}} />
      </div>
    );
  },

  _classNames: function () {
    return classNames("editor-pane panel-container horizontal", {
      "editor-pane--is-focused": this.props.file.get("active")
    });
  },

  _onChange: function () {
    EditorActions.change(this.props.file.get("path"), this.editor.getValue());
  },

  _onSave: function () {
    EditorActions.save(this.props.file.get("path"));
  },

  _onDelete: function () {
    var filePath = this.props.file.get("path");

    Dialogs.confirm({
      message: "Are you sure you want to delete this file?",
      detail: "Your are deleting '" + filePath + "'.",
      buttons: ["Cancel", "Move to trash"]
    }, function (button) {
      if (button === 1) EditorActions.delete(filePath);
    });
  }
});
