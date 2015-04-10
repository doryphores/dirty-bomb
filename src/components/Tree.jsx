var React          = require("react"),
    classNames     = require("classnames"),
    TreeStore      = require("../stores/TreeStore"),
    TreeActions    = require("../actions/TreeActions"),
    EditorActions  = require("../actions/EditorActions"),
    EventEmitter   = require("events").EventEmitter;


// This event emitter helps manage a single selected node
var ActiveNodeManager = new EventEmitter();


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
      <div className="tree panel">
        <div className="tree__scroller">
          <ul className="tree__node-list tree__node-list--is-root">
            <Tree.Node
              key="root"
              node={this.state.rootNode} />
          </ul>
        </div>
      </div>
    );
  },

  _onChange: function () {
    this.setState({
      rootNode: TreeStore.getNode(".")
    });
  }
});


Tree.Node = React.createClass({
  getInitialState: function () {
    return {
      selected: false
    };
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props.node !== nextProps.node
      || this.state.selected != nextState.selected;
  },

  render: function () {
    if (this._isFile()) {
      return (
        <li className={this._nodeClasses()}>
          <span
            className="tree__label tree__label--is-file"
            onClick={this._handleClick}
            onDoubleClick={this._handleDoubleClick}>
            {this.props.node.get("name")}
          </span>
        </li>
      );
    } else {
      return (
        <li className={this._nodeClasses()}>
          <span
            className="tree__label tree__label--is-folder"
            onClick={this._handleClick}>
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

    if (this.state.selected) return;

    // This node is being selected. Broadcast this to any listeners
    // and listen to any future broadcasts. This ensures a single node
    // is selected at any time.
    ActiveNodeManager.emit("selected", this.props.node.get("path"))
    ActiveNodeManager.once("selected", function (nodePath) {
      if (this.isMounted() && this.state.selected && nodePath != this.props.node.get("path")) {
        this.setState({selected: false});
      }
    }.bind(this));

    this.setState({selected: true});
  },

  _handleDoubleClick: function () {
    if (this._isFile()) {
      EditorActions.open(this.props.node.get("path"));
    }
  },

  _nodeClasses: function () {
    return classNames("tree__node", {
      "tree__node--is-selected" : this.state.selected,
      "tree__node--is-open"     : this.props.node.get("expanded")
    });
  },

  _isFile: function () {
    return this.props.node.get("type") === "file";
  },

  _isFolder: function () {
    return this.props.node.get("type") === "folder";
  }
});
