var React    = require("react");
var Toolbar  = require("./toolbar");
var TreeView = require("./tree");

React.render(
  <Toolbar />,
  document.getElementById("js-toolbar")
);

React.render(
  <TreeView />,
  document.getElementById("js-tree-view")
);
