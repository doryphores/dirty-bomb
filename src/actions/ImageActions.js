var AppDispatcher = require("../dispatcher/AppDispatcher");

var ImageActions = {
  open: function (callback) {
    AppDispatcher.dispatch({
      actionType: "images_open",
      callback: callback
    });
  },

  close: function () {
    AppDispatcher.dispatch({
      actionType: "images_close"
    });
  },

  add: function () {
    AppDispatcher.dispatch({
      actionType: "images_add"
    });
  },

  select: function (image) {
    AppDispatcher.dispatch({
      actionType: "images_select",
      image: image
    });
  }
};

module.exports = ImageActions;
