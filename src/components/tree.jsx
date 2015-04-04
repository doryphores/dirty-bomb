var React          = require("react"),
    ContentStore   = require("../stores/ContentStore"),
    ContentActions = require("../actions/ContentActions"),
    EventEmitter   = require("events").EventEmitter;


// This event emitter helps manage a single selected node
var ActiveNodeManager = new EventEmitter();


function getTreeState() {
  return {
    rootNode: ContentStore.getTree()
  };
}

/*=============================================*\
  Component definitions
\*=============================================*/

var Tree = module.exports = React.createClass({
  getInitialState: function () {
    return getTreeState();
  },

  componentDidMount: function () {
    ContentStore.addChangeListener(this._onChange);
  },

  componentWillUnmount: function () {
    ContentStore.removeChangeListener(this._onChange);
  },

  render: function () {
    return (
      <div className="tree">
        <div className="tree__scroller">
          <ul className="tree__node-list tree__node-list--is-root">
            <Tree.Node
              key="root"
              node={this.state.rootNode}
              expanded={true} />
          </ul>
        </div>
      </div>
    );
  },

  _onChange: function () {
    this.setState(getTreeState());
  }
});


Tree.Node = React.createClass({
  getInitialState: function () {
    return {
      selected: false,
      open: this.props.expanded
    };
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props.node !== nextProps.node
      || this.state.selected != nextState.selected
      || this.state.open != nextState.open;
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
      this.setState({open: !this.state.open}, function () {
        if (this.state.open) {
          ContentActions.expand(this.props.node.get("path"));
        } else {
          ContentActions.collapse(this.props.node.get("path"));
        }
      }.bind(this));
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
      ContentActions.open(this.props.node.get("path"));
    }
  },

  _nodeClasses: function () {
    var classNames = ["tree__node"];
    if (this.state.selected) classNames.push("tree__node--is-selected");
    if (this.state.open) classNames.push("tree__node--is-open");
    return classNames.join(" ");
  },

  _isFile: function () {
    return this.props.node.get("type") === "file";
  },

  _isFolder: function () {
    return this.props.node.get("type") === "folder";
  }
});
