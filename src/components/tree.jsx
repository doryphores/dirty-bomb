var React = require("react");

// Local references to UI event listener

var EventListener;

module.exports = function (listener) {
  EventListener = listener;
  return Tree;
};


/*=============================================*\
  Component definitions
\*=============================================*/


var Tree = React.createClass({
  getInitialState: function () {
    return {
      root         : this.props.fileSystem.tree,
      selectedNode : null
    };
  },

  componentDidMount: function () {
    // Listen to file system changes
    this.props.fileSystem.on("change", function (tree) {
      this.setState({root: tree});
    }.bind(this));
  },

  componentWillUpdate: function () {
    console.time("Tree:render");
  },

  componentDidUpdate: function () {
    console.timeEnd("Tree:render");
  },

  render: function () {
    return (
      <div className="tree">
        <Tree.NodeList key="root" nodes={this.state.root.get("children")} />
      </div>
    );
  }
});


Tree.NodeList = React.createClass({
  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props.nodes !== nextProps.nodes;
  },

  render: function () {
    var selectedNode = this.props.selectedNode;
    
    return (
      <ul className="tree__node-list">
        {this.props.nodes.map(function (node) {
          if (node.get("type") === "folder") {
            return (
              <Tree.FolderNode key={node.get("name")} node={node} />
            );
          } else {
            return (
              <Tree.FileNode key={node.get("name")} node={node} />
            );
          }
        })}
      </ul>
    );
  }
});


Tree.FolderNode = React.createClass({
  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props.node !== nextProps.node;
  },

  handleClick: function (event) {
    event.currentTarget.parentNode.classList.toggle("tree__node--is-open");
  },

  render: function () {
    return (
      <li className="tree__node">
        <span className="tree__label tree__label--is-folder" onClick={this.handleClick}>{this.props.node.get("name")}</span>
        <Tree.NodeList key="children" nodes={this.props.node.get("children")} />
      </li>
    );
  }
});


Tree.FileNode = React.createClass({
  getInitialState: function () {
    return {selected: false};
  },
  
  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props.node !== nextProps.node || this.state.selected != nextState.selected;
  },
  
  handleClick: function () {
    if (this.state.selected) return;

    // This node is being selected. Broadcast this to any listeners
    // and listen to any future broadcasts. This ensures a single node
    // is selected at any time.
    EventListener.emit("node.selected", this.props.node.get("path"));
    
    EventListener.once("node.selected", function (nodePath) {
      if (this.state.selected && nodePath != this.props.node.get("path")) {
        this.setState({selected: false});
      }
    }.bind(this));

    this.setState({selected: true});
  },
  
  handleDoubleClick: function () {
    EventListener.emit("file.open", this.props.node.get("path"));
  },
  
  nodeClasses: function () {
    return "tree__node" + (this.state.selected ? " tree__node--is-selected" : "");
  },

  render: function () {
    return (
      <li className={this.nodeClasses()} onClick={this.handleClick} onDoubleClick={this.handleDoubleClick}>
        <span className="tree__label tree__label--is-file">{this.props.node.get("name")}</span>
      </li>
    );
  }
});
