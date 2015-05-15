var React           = require("react"),
    PureRenderMixin = require("react/addons").addons.PureRenderMixin,
    classNames      = require("classnames");

var TabBar = React.createClass({
  mixins: [PureRenderMixin],

  render: function() {
    if (this.props.files.size === 0) return null;

    var tabs = this.props.files.map(function (file) {
      var itemClasses = classNames("tab-bar__item", {
        "tab-bar__item--is-focused": file.get("active"),
        "tab-bar__item--is-dirty"  : !file.get("clean")
      });

      return (
        <li
          key={file.get("path")}
          className={itemClasses}
          onClick={this._onClick.bind(this, file)}>
            <span className="tab-bar__label">{file.get("name")}</span>
            <span className="tab-bar__close icon js-close" />
        </li>
      );
    }.bind(this));

    return (<ul className="tab-bar">{tabs}</ul>);
  },

  _onClick: function (file, event) {
    if (event.target.classList.contains("js-close")) {
      this.props.onClose(file);
    } else {
      this.props.onChangeFocus(file);
    }
  }
});

module.exports = TabBar;
