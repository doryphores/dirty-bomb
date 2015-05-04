var React           = require("react"),
    PureRenderMixin = require("react/addons").addons.PureRenderMixin,
    Reflux          = require("reflux"),
    classNames      = require("classnames"),
    SettingsStore   = require("../stores/SettingsStore"),
    TreeStore       = require("../stores/TreeStore"),
    TreeActions     = require("../actions/TreeActions"),
    EditorActions   = require("../actions/EditorActions"),
    path            = require("path"),
    remote          = require("remote"),
    Menu            = remote.require("menu"),
    LabelInput      = require("./LabelInput");



var Tree = module.exports = React.createClass({
  mixins: [PureRenderMixin, Reflux.connect(TreeStore, "tree")],

  render: function () {
    if (!this.state.tree) return null;

    return (
      <div className="tree">
        <div className="tree__scroller">
          <ul className="tree__node-list tree__node-list--is-root">
            <Tree.Node
              key="root"
              readOnly={true}
              node={this.state.tree} />
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
                <Tree.Node key={node.get("name")} node={node} />
              );
            })}
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
        click: this._create
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
          TreeActions.delete(nodePath);
        }
      }
    ]);

    // Artificial delay to allow other actions to complete
    // such as visually selecting the node
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

  _create: function () {
    var savePath = this.props.node.get("path");
    if (this._isFile()) {
      savePath = path.dirname(savePath);
    }
    TreeActions.create.triggerPromise(savePath).then(function (filePath) {
      EditorActions.open(filePath);
    });
  },

  _edit: function () {
    this.setState({editMode: true});
  },

  _move: function () {
    TreeActions.move(this.props.node.get("path"));
  },

  _rename: function (filename) {
    if (filename !== this.props.node.get("name")) {
      TreeActions.rename(this.props.node.get("path"), filename);
    }
    this.setState({editMode: false});
  }
});
