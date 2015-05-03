var React           = require("react"),
    PureRenderMixin = require("react/addons").addons.PureRenderMixin,
    classNames      = require("classnames"),
    SettingsStore   = require("../stores/SettingsStore"),
    TreeActions     = require("../actions/TreeActions"),
    EditorActions   = require("../actions/EditorActions");
    path            = require("path"),
    Dialogs         = require("../Dialogs"),
    remote          = require("remote"),
    Menu            = remote.require("menu");


/*=============================================*\
  Component definitions
\*=============================================*/

var Tree = module.exports = React.createClass({
  mixins: [PureRenderMixin],

  render: function () {
    if (!this.props.rootNode) return null;

    return (
      <div className="tree">
        <div className="tree__scroller">
          <ul className="tree__node-list tree__node-list--is-root">
            <Tree.Node
              key="root"
              readOnly={true}
              node={this.props.rootNode} />
          </ul>
        </div>
        <div
          className="tree__resizer"
          onMouseDown={this._startResize} />
      </div>
    );
  },

  _startResize: function () {
    document.body.classList.add("is-resizing");
    document.addEventListener("mouseup", this._endResize);
    document.addEventListener("mousemove", this._resize);
  },

  _resize: function (evt) {
    this.getDOMNode().style.width = evt.clientX + "px";
  },

  _endResize: function () {
    document.body.classList.remove("is-resizing");
    document.removeEventListener("mousemove", this._resize);
    document.removeEventListener("mouseup", this._endResize);
  }
});


Tree.Node = React.createClass({
  mixins: [PureRenderMixin],

  getInitialState: function () {
    return {
      editMode: false,
      readOnly: false
    };
  },

  render: function () {
    var nodeClasses = classNames("tree__node", {
      "tree__node--is-selected" : this.props.node.get("selected"),
      "tree__node--is-open"     : this.props.node.get("expanded")
    });

    var labelClasses = classNames("tree__label", {
      "icon-file-text": this._isFile(),
      "icon-file-directory": this._isFolder() && !this._isRoot(),
      "icon-repo": this._isRoot()
    });

    var label = this.state.editMode && (
      <span className={labelClasses}>
        <LabelInput
          filename={this.props.node.get("name")}
          onChange={this._rename} />
      </span>
    );

    if (this._isFile()) {
      label = label || (
        <span
          className={labelClasses}
          onClick={this._handleClick}
          onContextMenu={this._showMenu}
          onDoubleClick={this._handleDoubleClick}>
          {this.props.node.get("name")}
        </span>
      );
      return (
        <li className={nodeClasses}>{label}</li>
      );
    } else {
      label = label || (
        <span
          className={labelClasses}
          onClick={this._handleClick}
          onContextMenu={this._showMenu}>
          {this.props.node.get("name")}
        </span>
      );
      return (
        <li className={nodeClasses}>
          {label}
          <ul className="tree__node-list">
            {this.props.node.get("children").map(function (node) {
              return (
                <Tree.Node
                  key={node.get("name")}
                  node={node}
                  fs={this.props.fs} />
              );
            }.bind(this))}
          </ul>
        </li>
      );
    }
  },

  _handleClick: function () {
    if (this._isFolder()) {
      TreeActions.toggle(this.props.node.get("path"));
    }
    TreeActions.select(this.props.node.get("path"));
  },

  _handleDoubleClick: function () {
    if (this._isFile()) {
      EditorActions.open(this.props.node.get("path"));
    }
  },

  _showMenu: function () {
    if (this.props.readOnly) {
      return;
    }

    var nodePath = this.props.node.get("path");
    var nodeType = this.props.node.get("type");

    TreeActions.select(this.props.node.get("path"));

    var menu = this.menu || Menu.buildFromTemplate([
      {
        label: "New file",
        click: function () {
          var savePath = nodePath;
          if (nodeType === "file") {
            savePath = path.dirname(nodePath);
          }
          TreeActions.create(savePath);
        }
      },
      {
        type: "separator"
      },
      {
        label: "Rename",
        click: this._edit
      },
      {
        label: "Move",
        click: this._move
      },
      {
        label: "Delete",
        click: function () {
          Dialogs.confirm({
            message: "Are you sure you want to delete the selected item?",
            details: "Your are deleting '" + nodePath + "'.",
            buttons: ["Cancel", "Move to trash"]
          }, function (button) {
            if (button === 1) TreeActions.delete(nodePath);
          });
        }
      }
    ]);

    setTimeout(function () {
      menu.popup(remote.getCurrentWindow());
    }, 100)
  },

  _isFile: function () {
    return this.props.node.get("type") === "file";
  },

  _isFolder: function () {
    return this.props.node.get("type") === "folder";
  },

  _isRoot: function () {
    return this.props.node.get("path") === ".";
  },

  _edit: function () {
    this.setState({editMode: true});
  },

  _move: function () {
    var contentRoot = SettingsStore.getContentPath();
    Dialogs.promptForDirectory({
      defaultPath: path.join(contentRoot, path.dirname(this.props.node.get("path")))
    }, function (filename) {
      if (filename) {
        if (filename.indexOf(contentRoot) === 0) {
          TreeActions.move(this.props.node.get("path"),
            path.join(path.relative(contentRoot, filename), this.props.node.get("name")));
        }
      }
    }.bind(this));
  },

  _rename: function (filename) {
    if (filename !== this.props.node.get("name")) {
      TreeActions.rename(this.props.node.get("path"), filename);
    }
    this.setState({editMode: false});
  }
});

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
