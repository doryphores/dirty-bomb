var React         = require("react"),
    Showdown      = require("showdown"),
    path          = require("path"),
    CodeMirror    = require("codemirror"),
    EventListener = require("../globalevents");

require("codemirror/mode/markdown/markdown");

var imageRoot = path.resolve(__dirname, "../../repo/public/media");

var imageFix = function (converter) {
  return [
    {
      type    : "lang",
      regex   : "/media",
      replace : "file://" + imageRoot
    }
  ];
};

var stripFrontMatter = function (converter) {
  return [
    {
      type   : "lang",
      filter : function (md) {
        return md.replace(/---[\s\S]*---/, "");
      }
    }
  ]
};

var converter = new Showdown.converter({extensions: [imageFix, stripFrontMatter]});


/*=============================================*\
  Component definitions
\*=============================================*/


var Editor = module.exports = React.createClass({
  getInitialState: function () {
    return {
      markdown : "",
      preview  : ""
    };
  },

  componentDidMount: function () {
    this.editor = CodeMirror.fromTextArea(this.refs.textarea.getDOMNode(), {
      mode  : "markdown",
      theme : "base16-dark"
    });

    this.editor.on("change", function () {
      this.setState({
        markdown: this.editor.getValue()
      });
    }.bind(this));

    EventListener.on("file.open", function (nodePath) {
      this.props.fileSystem.readFile(nodePath, function (fileContent) {
        this.setState({markdown: fileContent});
      }.bind(this));
    }.bind(this));
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return this.state.markdown !== nextState.markdown;
  },

  componentDidUpdate: function () {
    this.editor.setValue(this.state.markdown);
  },

  handleChange: function (event) {
    this.setState({
      markdown : event.target.value
    });
  },

  render: function () {
    var previewHTML = converter.makeHtml(this.state.markdown);
    return (
      <div className="editor panel-container horizontal">
        <div className="cm-container">
          <textarea ref="textarea" value={this.state.markdown} onChange={this.handleChange} />
        </div>
        <div className="preview" dangerouslySetInnerHTML={{__html: previewHTML}} />
      </div>
    );
  }
});
