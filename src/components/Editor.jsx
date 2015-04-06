var React          = require("react"),
    Showdown       = require("showdown"),
    path           = require("path"),
    CodeMirror     = require("codemirror"),
    ContentActions = require("../actions/ContentActions");

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
      markdown: this.props.file.content
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
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return this.state.markdown !== nextState.markdown ||
      this.props.focused !== nextProps.focused;
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
      <div className={this._classNames()}>
        <div className="cm-container">
          <textarea ref="textarea" value={this.state.markdown} onChange={this.handleChange} />
        </div>
        <div className="preview" dangerouslySetInnerHTML={{__html: previewHTML}} />
      </div>
    );
  },

  _classNames: function () {
    var classes = "editor panel-container horizontal";
    if (this.props.focused) {
      classes += " editor--is-focused";
    }
    return classes;
  }
});
