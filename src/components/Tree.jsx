var React          = require("react"),
    classNames     = require("classnames"),
    TreeStore      = require("../stores/TreeStore"),
    TreeActions    = require("../actions/TreeActions"),
    EditorActions  = require("../actions/EditorActions");


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
  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props.node !== nextProps.node;
  },

  render: function () {
    var nodeClasses = classNames("tree__node", {
      "tree__node--is-selected" : this.props.node.get("selected"),
      "tree__node--is-open"     : this.props.node.get("expanded")
    });

    if (this._isFile()) {
      return (
        <li className={nodeClasses}>
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
        <li className={nodeClasses}>
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
    TreeActions.select(this.props.node.get("path"));
  },

  _handleDoubleClick: function () {
    if (this._isFile()) {
      EditorActions.open(this.props.node.get("path"));
    }
  },

  _isFile: function () {
    return this.props.node.get("type") === "file";
  },

  _isFolder: function () {
    return this.props.node.get("type") === "folder";
  }
});
