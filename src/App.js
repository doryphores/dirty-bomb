require("node-jsx").install({extension: ".jsx"});

var fs          = require("fs"),
    path        = require("path"),
    stylus      = require("stylus"),
    React       = require("react"),
    ConfigStore = require("./stores/ConfigStore"),
    RepoStore   = require("./stores/RepoStore"),
    App         = require("./components/App"),
    SetupPanel  = require("./components/SetupPanel");

exports.bootstrap = function () {
  ConfigStore.listen(render);
  RepoStore.listen(render);
  compileCSS(render);
};

function render() {
  if (ConfigStore.isUserReady() && RepoStore.isReady()) {
    React.render(React.createElement(App), document.body);
  } else {
    React.render(React.createElement(SetupPanel), document.body);
  }
}

function compileCSS(done) {
  console.time("Compile CSS");
  var themeFilename = path.resolve(__dirname, "../static/theme.styl");
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
