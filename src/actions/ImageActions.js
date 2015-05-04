var Reflux = require("reflux");

var ImageActions = Reflux.createActions([
  "select",
  "close",
  "add"
]);

ImageActions.open = Reflux.createAction({asyncResult: true});

module.exports = ImageActions;
