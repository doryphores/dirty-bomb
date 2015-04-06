var React = require("react");

var TabBar = React.createClass({
  render: function() {
    var tabs = this.props.files.map(function (f) {
      return (
        <li
          key={f.path}
          className={this._itemClasses(f)}
          onClick={this._onClick.bind(this, f)}>{f.name}</li>
      );
    }.bind(this));
    return (<ul className="editor-tabs">{tabs}</ul>);
  },

  _itemClasses: function (f) {
    var classes = "editor-tabs__item";
    if (f.path === this.props.focusedFile) {
      classes += " editor-tabs__item--is-focused";
    }
    return classes;
  },

  _onClick: function (f, event) {
    this.props.onChangeFocus(f.path);
  }
});

module.exports = TabBar;
