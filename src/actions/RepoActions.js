module.exports = require("reflux").createActions({
  "setPath": { asyncResult: true, children: ["progressed"] },
  "checkout": { asyncResult: false }
});
