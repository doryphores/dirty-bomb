var React         = require("react"),
    classNames    = require("classnames"),
    TreeStore     = require("../stores/TreeStore"),
    TreeActions   = require("../actions/TreeActions"),
    EditorActions = require("../actions/EditorActions");
    path          = require("path"),
    Dialogs       = require("../Dialogs"),
    remote        = require("remote"),
    Menu          = remote.require("menu");


/*=============================================*\
  Component definitions
\*=============================================*/

var Tree = module.exports = React.createClass({
  getInitialState: function () {
    return {
      rootNode: TreeStore.getNode(".")
    };
  },

  componentDidMount: function () {
    TreeStore.addChangeListener(this._onChange);
    TreeActions.init(".");
  },

  componentWillUnmount: function () {
    TreeStore.removeChangeListener(this._onChange);
  },

  render: function () {
    if (!this.state.rootNode) return null;

    return (
      <div className="tree">
        <div className="tree__scroller">
          <ul className="tree__node-list tree__node-list--is-root">
            <Tree.Node
              key="root"
              node={this.state.rootNode} />
          </ul>
        </div>
        <div
          className="tree__resizer"
          onMouseDown={this._startResize} />
      </div>
    );
  },

  _onChange: function () {
    this.setState({
      rootNode: TreeStore.getNode(".")
    });
  },

  _startResize: function () {
    document.addEventListener("mouseup", this._endResize);
    document.addEventListener("mousemove", this._resize);
  },

  _resize: function (evt) {
    this.getDOMNode().style.width = evt.clientX + "px";
  },

  _endResize: function () {
    document.removeEventListener("mousemove", this._resize);
    document.removeEventListener("mouseup", this._endResize);
  }
});


Tree.Node = React.createClass({
  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props.node !== nextProps.node;
  },

  render: function () {
    var nodeClasses = classNames("tree__node", {
      "tree__node--is-selected" : this.props.node.get("selected"),
      "tree__node--is-open"     : this.props.node.get("expanded")
    });

    var labelClasses = classNames("tree__label", {
      "icon-document-alt-fill": this._isFile(),
      "icon-folder-fill": this._isFolder() && !this._isRoot(),
      "icon-box": this._isRoot()
    });

    if (this._isFile()) {
      return (
        <li className={nodeClasses}>
          <span
            className={labelClasses}
            onClick={this._handleClick}
            onContextMenu={this._showMenu}
            onDoubleClick={this._handleDoubleClick}>
            {this.props.node.get("name")}
          </span>
        </li>
      );
    } else {
      return (
        <li className={nodeClasses}>
          <span
            className={labelClasses}
            onClick={this._handleClick}
            onContextMenu={this._showMenu}>
            {this.props.node.get("name")}
          </span>
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
  }
});
