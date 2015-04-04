var React          = require("react"),
    Showdown       = require("showdown"),
    path           = require("path"),
    CodeMirror     = require("codemirror"),
    ContentActions = require("../actions/ContentActions"),
    ContentStore   = require("../stores/ContentStore");

require("codemirror/mode/markdown/markdown");

var imageRoot = path.resolve(__dirname, "../../repo/public/media");

var markdownExtensions = function (converter) {
  return [
    {
      type   : "lang",
      filter : function (md) {
        return md.replace(/---[\s\S]*---/, "");
      }
    },
    {
      type    : "lang",
      regex   : "/media",
      replace : "file://" + imageRoot
    }
  ];
};

var converter = new Showdown.converter({extensions: [markdownExtensions]});


/*=============================================*\
  Component definitions
\*=============================================*/


var Editor = module.exports = React.createClass({
  getInitialState: function () {
    return {
      markdown: ContentStore.getOpenFile()
    };
  },

  componentDidMount: function () {
    this.editor = CodeMirror.fromTextArea(this.refs.textarea.getDOMNode(), {
      mode         : "markdown",
      theme        : "mbo",
      lineWrapping : true
    });

    this.editor.on("change", function () {
      this.setState({
        markdown: this.editor.getValue()
      });
    }.bind(this));

    ContentStore.addChangeListener(this._onChange);
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
  },

  _onChange: function () {
    this.setState({
      markdown: ContentStore.getOpenFile()
    });
  }
});
