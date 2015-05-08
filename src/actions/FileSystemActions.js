module.exports = require("reflux").createActions({
  create       : { asyncResult: true },
  open         : { asyncResult: true },
  close        : { asyncResult: false },
  save         : { asyncResult: true },
  delete       : { asyncResult: false },
  openDir      : { asyncResult: false },
  closeDir     : { asyncResult: false },
  rename       : { asyncResult: false },
  move         : { asyncResult: false },
  moveDir      : { asyncResult: true },
  duplicate    : { asyncResult: true },
  duplicateDir : { asyncResult: true }
});
