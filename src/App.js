require("node-jsx").install({extension: ".jsx"});

var fs          = require("fs"),
    path        = require("path"),
    PathWatcher = require("pathwatcher"),
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
  watchCSS();
};

function render() {
  if (ConfigStore.isUserReady() && RepoStore.isReady()) {
    React.render(React.createElement(App), document.getElementById("dirty-bomb"));
  } else {
    React.render(React.createElement(SetupPanel), document.getElementById("dirty-bomb"));
  }
}

function compileCSS(done) {
  console.time("Compile CSS");
  var themeFilename = path.resolve(__dirname, "../static/theme.styl");
  fs.readFile(themeFilename, {encoding: "utf-8"}, function (err, styles) {
    if (err) throw err;
    stylus(styles)
      .set("filename", themeFilename)
      .render(function (err, css) {
        if (err) throw err;
        var s = document.querySelector("style");
        if (!s) {
          s = document.createElement("style");
          document.querySelector("head").appendChild(s);
        }
        s.innerHTML = css;
        console.timeEnd("Compile CSS");
        if (done) done();
      });
  });
}

function watchCSS() {
  PathWatcher.watch(path.resolve(__dirname, "../static/css"), function () {
    compileCSS();
  });
}
