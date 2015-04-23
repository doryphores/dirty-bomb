var React         = require("react"),
    classNames    = require("classnames"),
    ImageActions  = require("../actions/ImageActions"),
    ImageStore    = require("../stores/ImageStore"),
    EditorActions = require("../actions/EditorActions");

var imageRoot = path.resolve(__dirname, "../../repo/public/media");

var ImageSelector = React.createClass({
  getInitialState: function () {
    return ImageStore.getState();
  },

  componentDidMount: function() {
    ImageStore.addChangeListener(this._onChange);
  },

  componentWillUnmount: function() {
    ImageStore.removeChangeListener(this._onChange);
  },

  render: function() {
    var images = this.state.images.map(function (image) {
      return (
        <li key={image.path}
            className="image-list__item"
            onDoubleClick={this._select.bind(this, image)}>
          <img src={"file://" + path.join(imageRoot, image.path)} />
        </li>
      );
    }.bind(this));

    var classes = classNames("image-selector", "panel-container vertical", {
      "image-selector--is-open": this.state.open
    });

    return (
      <div className={classes}>
        <div className="image-toolbar">
          <button className="button" onClick={this._onClose}>
            <span className="button__label">Cancel</span>
            <span className="button__icon icon-x" />
          </button>
          <button className="button" onClick={this._onAdd}>
            <span className="button__label">Add image</span>
            <span className="button__icon icon-plus" />
          </button>
        </div>
        <ul className="image-list">
          {images}
        </ul>
      </div>
    );
  },

  _onChange: function () {
    this.setState(ImageStore.getState());
  },

  _onAdd: function () {
    ImageActions.add();
  },

  _select: function (image) {
    ImageActions.select(image);
  },

  _onClose: function () {
    ImageActions.close();
  }
});

module.exports = ImageSelector;
