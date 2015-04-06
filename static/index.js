require("node-jsx").install({extension: ".jsx"});

var fs     = require("fs"),
    path   = require("path"),
    stylus = require("stylus"),
    UI     = require("../src/components/UI");

window.onload = function () {
  compileCSS(function () {
    UI.render();
  });
};

function compileCSS(done) {
  console.time("Compile CSS");
  var themeFilename = path.join(__dirname, "theme.styl");
  fs.readFile(themeFilename, {encoding: "utf-8"}, function (err, styles) {
    if (err) throw err;
    stylus(styles)
      .set("filename", themeFilename)
      .set("paths", [__dirname])
      .render(function (err, css) {
        if (err) throw err;
        var s = document.createElement("style");
        s.innerHTML = css;
        document.querySelector("head").appendChild(s);
        console.timeEnd("Compile CSS");
        done();
      });
  });
}
