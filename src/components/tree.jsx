var React         = require("react"),
    EventListener = require("../globalevents");


/*=============================================*\
  Component definitions
\*=============================================*/

var Tree = module.exports = React.createClass({
  getInitialState: function () {
    return {
      root         : this.props.fileSystem.tree,
      selectedNode : null
    };
  },

  componentDidMount: function () {
    this.props.fileSystem.expand("");

    // Listen to file system changes
    this.props.fileSystem.on("change", function (tree) {
      this.setState({root: tree});
    }.bind(this));

    EventListener.on("node.expand", function (nodePath) {
      this.props.fileSystem.expand(nodePath);
    }.bind(this));

    EventListener.on("node.collapse", function (nodePath) {
      this.props.fileSystem.collapse(nodePath);
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
        <div className="tree__scroller">
          <ul className="tree__node-list tree__node-list--is-root">
            <Tree.Node key="root" node={this.state.root} expanded={true} />
          </ul>
        </div>
      </div>
    );
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

  handleClick: function () {
    if (this.isFolder()) {
      this.setState({open: !this.state.open}, function () {
        EventListener.emit("node." + (this.state.open ? "expand" : "collapse"), this.props.node.get("path"));
      });
    }

    if (this.state.selected) return;

    // This node is being selected. Broadcast this to any listeners
    // and listen to any future broadcasts. This ensures a single node
    // is selected at any time.
    EventListener.emit("node.selected", this.props.node.get("path"));

    EventListener.once("node.selected", function (nodePath) {
      if (this.isMounted() && this.state.selected && nodePath != this.props.node.get("path")) {
        this.setState({selected: false});
      }
    }.bind(this));

    this.setState({selected: true});
  },

  handleDoubleClick: function () {
    if (this.isFile()) {
      EventListener.emit("file.open", this.props.node.get("path"));
    }
  },

  render: function () {
    if (this.isFile()) {
      return (
        <li className={this.nodeClasses()}>
          <span className="tree__label tree__label--is-file" onClick={this.handleClick} onDoubleClick={this.handleDoubleClick}>{this.props.node.get("name")}</span>
        </li>
      );
    } else {
      return (
        <li className={this.nodeClasses()}>
          <span className="tree__label tree__label--is-folder" onClick={this.handleClick}>{this.props.node.get("name")}</span>
          <ul className="tree__node-list">
            {this.props.node.get("children").map(function (node) {
              return (<Tree.Node key={node.get("name")} node={node} />);
            })}
          </ul>
        </li>
      );
    }
  },

  nodeClasses: function () {
    var classNames = ["tree__node"];
    if (this.state.selected) classNames.push("tree__node--is-selected");
    if (this.state.open) classNames.push("tree__node--is-open");
    return classNames.join(" ");
  },

  isFile: function () {
    return this.props.node.get("type") === "file";
  },

  isFolder: function () {
    return this.props.node.get("type") === "folder";
  }
});
