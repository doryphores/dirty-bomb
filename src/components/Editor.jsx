var React           = require("react"),
    PureRenderMixin = require("react/addons").addons.PureRenderMixin,
    Showdown        = require("showdown"),
    path            = require("path"),
    CodeMirror      = require("codemirror"),
    classNames      = require("classnames"),
    Dialogs         = require("../Dialogs"),
    EditorActions   = require("../actions/EditorActions"),
    ImageActions    = require("../actions/ImageActions"),
    ImageStore      = require("../stores/ImageStore"),
    SettingsStore   = require("../stores/SettingsStore"),
    remote          = require("remote"),
    Menu            = remote.require("menu"),
    clipboard       = require("clipboard");

require("codemirror/mode/markdown/markdown");
require("codemirror/mode/yaml/yaml");
require("codemirror/addon/mode/multiplex");
require("codemirror/addon/edit/trailingspace");

var _converter;

function getConverter(imageRoot) {
  if (!_converter) {
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
          regex   : "/media",
          replace : "file://" + encodeURI(imageRoot)
        }
      ];
    };

    _converter = new Showdown.converter({extensions: [markdownExtensions]});
  }

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
    this.editor = CodeMirror(this.refs.editor.getDOMNode(), {
      mode              : "frontmatter_markdown",
      theme             : "mbo",
      lineWrapping      : true,
      showTrailingSpace : true,
      value             : this.props.file.get("content")
    });

    // We need to override the copy/paste operation keyboard
    // shortcuts to work with the context menu
    if (process.platform != 'darwin') {
      this.editor.setOption("extraKeys", {
        "Cmd-C": this._copy,
        "Cmd-V": this._paste,
        "Cmd-X": this._cut
      });
    } else {
      this.editor.setOption("extraKeys", {
        "Ctrl-C": this._copy,
        "Ctrl-V": this._paste,
        "Ctrl-X": this._cut
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
    var converter = getConverter(SettingsStore.getMediaPath());
    var previewHTML = converter.makeHtml(this.props.file.get("content"));
    return (
      <div className={this._classNames()}>
        <div className="editor panel-container vertical">
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
    return classNames("editor-pane panel-container horizontal", {
      "editor-pane--is-focused": this.props.file.get("active")
    });
  },

  _onChange: function () {
    EditorActions.change(this.props.file.get("path"), this.editor.getValue());
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
        click: this._cut
      },
      {
        label: "Copy",
        click: this._copy
      },
      {
        label: "Paste",
        click: this._paste
      },
      {
        type: "separator"
      },
      {
        label: "Insert image",
        click: function () {
          this._selectImage();
        }.bind(this)
      }
    ]);
    menu.popup(remote.getCurrentWindow());
  },

  _cut: function () {
    clipboard.writeText(this.editor.getSelection());
    this.editor.replaceSelection("");
  },

  _copy: function () {
    clipboard.writeText(this.editor.getSelection());
  },

  _paste: function () {
    this.editor.replaceSelection(clipboard.readText());
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
  },

  _selectImage: function () {
    ImageActions.open(function (imagePath) {
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
