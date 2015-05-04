var React        = require("react"),
    Reflux       = require("reflux"),
    classNames   = require("classnames"),
    ImageActions = require("../actions/ImageActions"),
    ImageStore   = require("../stores/ImageStore");

var ImageSelector = React.createClass({
  mixins: [Reflux.connect(ImageStore)],

  componentDidUpdate: function(prevProps, prevState) {
    if (!prevState.open) {
      this.refs.imageList.getDOMNode().scrollTop = 0;
    }
  },

  render: function() {
    var images = this.state.images.map(function (image) {
      return (
        <li key={image.path}
            className="image-list__item"
            onDoubleClick={this._select.bind(this, image.path)}>
          <img src={"file://" + image.absolutePath} />
        </li>
      );
    }.bind(this));

    var classes = classNames(
      "overlay",
      "panel-container vertical",
      {
        "overlay--is-open": this.state.open
      }
    );

    return (
      <div className={classes}>
        <div className="image-toolbar">
          <button className="button" onClick={this._onClose} tabIndex="-1">
            <span className="button__label">Cancel</span>
            <span className="button__icon icon-x" />
          </button>
          <button className="button" onClick={this._onAdd} tabIndex="-1">
            <span className="button__label">Add image</span>
            <span className="button__icon icon-plus" />
          </button>
        </div>
        <ul className="image-list" ref="imageList">
          {images}
        </ul>
      </div>
    );
  },

  _onAdd: function () {
    ImageActions.add();
  },

  _select: function (imagePath) {
    ImageActions.select(imagePath);
  },

  _onClose: function () {
    ImageActions.close();
  }
});

module.exports = ImageSelector;
