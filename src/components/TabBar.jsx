var React = require("react");

var TabBar = React.createClass({
  render: function() {
    if (this.props.files.size === 0) return null;

    var tabs = this.props.files.map(function (file) {
      return (
        <li
          key={file.get("path")}
          className={this._itemClasses(file)}
          onClick={this._onClick.bind(this, file)}>
            {file.get("name")}
            <span className="editor-tabs__close close" />
        </li>
      );
    }.bind(this));
    return (<ul className="editor-tabs panel">{tabs}</ul>);
  },

  _itemClasses: function (file) {
    var classes = "editor-tabs__item";
    if (file.get("active")) {
      classes += " editor-tabs__item--is-focused";
    }
    return classes;
  },

  _onClick: function (file, event) {
    if (event.target.classList.contains("close")) {
      this.props.onClose(file.get("path"));
    } else {
      this.props.onChangeFocus(file.get("path"));
    }
  }
});

module.exports = TabBar;
