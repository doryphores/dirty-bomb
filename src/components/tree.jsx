var React         = require("react"),
    EventListener = require("../globalevents");


/*=============================================*\
  Component definitions
\*=============================================*/

var Tree = module.exports = React.createClass({
  getInitialState: function () {
    return { rootNode: this.props.fileSystem.tree };
  },

  componentDidMount: function () {
    this.props.fileSystem.expand("");

    // Listen to file system changes
    this.props.fileSystem.on("change", this._onChange);
  },
  
  componentWillUnmount: function () {
    this.props.fileSystem.removeListener("change", this._onChange);
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
            <Tree.Node
              key="root"
              node={this.state.rootNode}
              fs={this.props.fileSystem}
              expanded={true} />
          </ul>
        </div>
      </div>
    );
  },
  
  _onChange: function () {
    this.setState({rootNode: this.props.fileSystem.tree});
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
          this.props.fs.expand(this.props.node.get("path"));
        } else {
          this.props.fs.collapse(this.props.node.get("path"));
        }
      }.bind(this));
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

  _handleDoubleClick: function () {
    if (this._isFile()) {
      EventListener.emit("file.open", this.props.node.get("path"));
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
