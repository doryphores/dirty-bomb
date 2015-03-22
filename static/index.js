require("node-jsx").install({extension: ".jsx"});
var fs = require("fs")
var stylus = require("stylus");

window.onload = function () {
  fs.readFile(__dirname + "/css/test.styl", {encoding: "utf-8"}, function (err, styles) {
    console.log(err);
    stylus(styles).set("filename", "test.styl").render(function (err, css) {
      var s = document.createElement("style");
      s.innerHTML = css;
      document.querySelector("head").appendChild(s);
    });
  });
  require("../src/components/ui");
};
