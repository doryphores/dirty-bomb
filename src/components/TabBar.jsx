var React = require("react");

var TabBar = React.createClass({
  render: function() {
    if (this.props.files.size === 0) return null;

    var tabs = this.props.files.map(function (f) {
      return (
        <li
          key={f.path}
          className={this._itemClasses(f)}
          onClick={this._onClick.bind(this, f)}>
            {f.name}
            <span className="editor-tabs__close close" />
        </li>
      );
    }.bind(this));
    return (<ul className="editor-tabs panel">{tabs}</ul>);
  },

  _itemClasses: function (f) {
    var classes = "editor-tabs__item";
    if (f.path === this.props.focusedFile) {
      classes += " editor-tabs__item--is-focused";
    }
    return classes;
  },

  _onClick: function (f, event) {
    if (event.target.classList.contains("close")) {
      this.props.onClose(f.path);
    } else {
      this.props.onChangeFocus(f.path);
    }
  }
});

module.exports = TabBar;
