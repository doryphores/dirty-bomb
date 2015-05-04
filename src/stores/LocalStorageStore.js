var Reflux              = require("reflux"),
    LocalStorageActions = require("../actions/LocalStorageActions");

var LocalStorageStore = Reflux.createStore({
  listenables: LocalStorageActions,

  // init: function () {
  //   AppDispatcher.register(function (action) {
  //     if (action.actionType === "app_init") {
  //       AppDispatcher.waitFor([SettingsStore.dispatchToken]);
  //       onAppInit();
  //     }
  //   }.bind(this));
  // },

  onSave: function (key, value) {
    this.set(key, value);
  },

  onAppInit: function () {
    var items = _.mapObject(window.localStorage, function (value, key) {
      return JSON.parse(value);
    });
    this.trigger(items);
  },

  set: function (key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  get: function (key) {
    var item = window.localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
    return undefined;
  }
});

module.exports = LocalStorageStore;
