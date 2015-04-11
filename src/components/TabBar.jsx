var React      = require("react"),
    classNames = require("classnames");

var TabBar = React.createClass({
  render: function() {
    if (this.props.files.size === 0) return null;

    var tabs = this.props.files.map(function (file) {
      return (
        <li
          key={file.get("path")}
          className={this._itemClasses(file)}
          onClick={this._onClick.bind(this, file)}>
            <span className="tab-bar__label">{file.get("name")}</span>
            <span className="tab-bar__close icon-x close" />
        </li>
      );
    }.bind(this));
    return (<ul className="tab-bar">{tabs}</ul>);
  },

  _itemClasses: function (file) {
    return classNames("tab-bar__item", {
      "tab-bar__item--is-focused" : file.get("active"),
      "tab-bar__item--is-dirty"   : !file.get("clean")
    });
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
