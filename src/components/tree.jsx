var React      = require("react");
var FileSystem = require("../filesystem");
var Immutable  = require("immutable");

var Tree = React.createClass({
  getInitialState: function () {
    return {
      root: FileSystem.tree
    };
  },

  // shouldComponentUpdate: function(nextProps, nextState) {
  //   var changed = Immutable.is(this.state.root, nextState.root);
  //   console.log("Tree", changed);
  //   return changed;
  // },

  componentDidMount: function () {
    FileSystem.on("change", function (tree) {
      this.setState({root: FileSystem.tree});
    }.bind(this));
  },
  
  componentWillUpdate: function () {
    console.time("render");
  },

  componentDidUpdate: function () {
    console.timeEnd("render");
  },
  
  render: function () {
    return (
      <div className="tree">
        <Tree.NodeList nodes={this.state.root.get("children")} />
      </div>
    );
  }
});

module.exports = Tree;

Tree.NodeList = React.createClass({
  shouldComponentUpdate: function(nextProps, nextState) {
    var changed = Immutable.is(this.props.nodes, nextProps.nodes);
    console.log("NodeList", changed);
    return changed;
  },
  
  render: function () {
    var nodes = this.props.nodes.map(function (node) {
      if (node.get("type") === "folder") {
        return (
          <Tree.FolderNode node={node} />
        );
      } else {
        return (
          <Tree.FileNode node={node} />
        );
      }
    });
    
    return (
      <ul className="tree__node-list">
        {nodes}
      </ul>
    );
  }
});

Tree.FolderNode = React.createClass({
  shouldComponentUpdate: function(nextProps, nextState) {
    var changed = Immutable.is(this.props.node, nextProps.node);
    console.log("FolderNode", this.props.node.get("name"), changed);
    return changed;
  },
  
  toggle: function (event) {
    event.currentTarget.parentNode.classList.toggle("tree__node--is-open");
  },
  
  render: function () {
    return (
      <li className="tree__node tree__node--is-folder">
        <span onClick={this.toggle}>{this.props.node.get("name")}</span>
        <Tree.NodeList nodes={this.props.node.get("children")} />
      </li>
    );
  }
});

Tree.FileNode = React.createClass({
  shouldComponentUpdate: function(nextProps, nextState) {
    var changed = Immutable.is(this.props.node, nextProps.node);
    console.log("FileNode", changed);
    return changed;
  },
  
  render: function () {
    return (
      <li className="tree__node tree__node--is-file">
        <span>{this.props.node.get("name")}</span>
      </li>
    );
  }
});
