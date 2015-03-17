var React      = require("react");
var FileSystem = require("../filesystem");

var Tree = React.createClass({
  getInitialState: function () {
    return {
      root     : FileSystem.tree,
      selected : []
    };
  },

  componentDidMount: function () {
    FileSystem.on("change", function (tree) {
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

module.exports = Tree;

Tree.NodeList = React.createClass({
  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props.nodes !== nextProps.nodes;
  },

  render: function () {
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

  toggle: function (event) {
    event.currentTarget.parentNode.classList.toggle("tree__node--is-open");
  },

  render: function () {
    return (
      <li className="tree__node">
        <span className="tree__label tree__label--is-folder" onClick={this.toggle}>{this.props.node.get("name")}</span>
        <Tree.NodeList key={this.props.node.get("name") + "__children"} nodes={this.props.node.get("children")} />
      </li>
    );
  }
});

Tree.FileNode = React.createClass({
  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props.node !== nextProps.node;
  },

  render: function () {
    return (
      <li className="tree__node">
        <span className="tree__label tree__label--is-file">{this.props.node.get("name")}</span>
      </li>
    );
  }
});
