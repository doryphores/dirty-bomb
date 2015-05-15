var React             = require("react"),
    PureRenderMixin   = require("react/addons").addons.PureRenderMixin,
    Showdown          = require("showdown"),
    CodeMirror        = require("codemirror"),
    classNames        = require("classnames"),
    EditorActions     = require("../actions/EditorActions"),
    FileSystemActions = require("../actions/FileSystemActions"),
    ImageActions      = require("../actions/ImageActions"),
    RepoStore         = require("../stores/RepoStore"),
    ConfigStore       = require("../stores/ConfigStore"),
    remote            = require("remote"),
    Menu              = remote.require("menu"),
    clipboard         = require("clipboard");

require("codemirror/mode/markdown/markdown");
require("codemirror/mode/yaml/yaml");
require("codemirror/addon/mode/multiplex");
require("codemirror/addon/edit/trailingspace");

var _converter;

function getConverter() {
  if (_converter) return _converter;

  // TODO: this uses mediaRoot and mediaPath which may change over time
  var markdownExtensions = function (converter) {
    return [
      {
        type   : "lang",
        filter : function (md) {
          return md.replace(/---[\s\S]*?---/, "");
        }
      },
      {
        type    : "lang",
        regex   : ConfigStore.get("mediaRoot"),
        replace : "file://" + encodeURI(RepoStore.getMediaPath())
      }
    ];
  };

  _converter = new Showdown.converter({extensions: [markdownExtensions]});

  return _converter;
}

CodeMirror.defineMode("frontmatter_markdown", function(config) {
  return CodeMirror.multiplexingMode(
    CodeMirror.getMode(config, "text/x-markdown"),
    {
      open: "---",
      close: "---",
      mode: CodeMirror.getMode(config, "text/x-yaml"),
      delimStyle: "delimit"
    }
  );
});



/*=============================================*\
  Component definitions
\*=============================================*/


var Editor = module.exports = React.createClass({
  mixins: [PureRenderMixin],

  componentDidMount: function () {
    this.editor = CodeMirror(React.findDOMNode(this.refs.editor), {
      mode              : "frontmatter_markdown",
      theme             : "zenburn",
      lineWrapping      : true,
      showTrailingSpace : true,
      value             : this.props.file.get("content")
    });

    // We need to override the copy/paste operation keyboard
    // shortcuts to work with the context menu
    if (process.platform === 'darwin') {
      this.editor.setOption("extraKeys", {
        "Cmd-C": this._onCopy,
        "Cmd-V": this._onPaste,
        "Cmd-X": this._onCut,
        "Cmd-S": this._onSave
      });
    } else {
      this.editor.setOption("extraKeys", {
        "Ctrl-C": this._onCopy,
        "Ctrl-V": this._onPaste,
        "Ctrl-X": this._onCut,
        "Ctrl-S": this._onSave
      });
    }

    this.editor.on("change", this._onChange);

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

  render: function () {
    var previewHTML = getConverter().makeHtml(this.props.file.get("content"));
    return (
      <div className={this._classNames()}>
        <div className="editor">
          <div className="editor-toolbar">
            <button className="button" onClick={this._onSave}>
              <span className="button__label">Save</span>
              <span className="button__icon icon-check" />
            </button>
            <button className="button" onClick={this._onDelete}>
              <span className="button__label">Delete</span>
              <span className="button__icon icon-trashcan" />
            </button>
            <button className="button" onClick={this._selectImage}>
              <span className="button__label">Insert image</span>
              <span className="button__icon icon-device-camera" />
            </button>
          </div>
          <div className="cm-container" ref="editor" onContextMenu={this._showContextMenu} />
        </div>
        <div className="preview" dangerouslySetInnerHTML={{__html: previewHTML}} />
      </div>
    );
  },

  _classNames: function () {
    return classNames("editor-pane", {
      "editor-pane--is-focused": this.props.file.get("active")
    });
  },

  _onChange: function () {
    EditorActions.update(this.props.file.get("path"), this.editor.getValue());
  },

  _showContextMenu: function () {
    var menu = this.menu || Menu.buildFromTemplate([
      {
        label: "Undo",
        click: function () {
          this.editor.undo();
        }.bind(this)
      },
      {
        label: "Redo",
        click: function () {
          this.editor.redo();
        }.bind(this)
      },
      {
        type: "separator"
      },
      {
        label: "Cut",
        click: this._onCut
      },
      {
        label: "Copy",
        click: this._onCopy
      },
      {
        label: "Paste",
        click: this._onPaste
      },
      {
        type: "separator"
      },
      {
        label: "Insert image",
        click: this._selectImage
      }
    ]);
    menu.popup(remote.getCurrentWindow());
  },

  _onCut: function () {
    clipboard.writeText(this.editor.getSelection());
    this.editor.replaceSelection("");
  },

  _onCopy: function () {
    clipboard.writeText(this.editor.getSelection());
  },

  _onPaste: function () {
    this.editor.replaceSelection(clipboard.readText());
  },

  _onSave: function () {
    EditorActions.save(this.props.file.get("path"));
  },

  _onDelete: function () {
    FileSystemActions.delete(this.props.file.get("path"));
  },

  _selectImage: function () {
    ImageActions.open.triggerPromise().then(function (imagePath) {
      if (imagePath) {
        var cursor = this.editor.getCursor();
        this.editor.replaceRange("![Image description](" + imagePath + ")", cursor, cursor);
        this.editor.setSelection({
          line: cursor.line,
          ch: cursor.ch + 2
        }, {
          line: cursor.line,
          ch: cursor.ch + 19
        });
      }
      this.editor.focus();
    }.bind(this));
  }
});
