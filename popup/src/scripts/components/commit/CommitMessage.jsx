import React, {Component} from 'react';

class CommitMessage extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  componentWillMount() {
    chrome.storage.local.get("commitMessage", (data) => {
      if (data.commitMessage) {
        this.props.updateFunc(data.commitMessage);
      }
    });
  }
  
  handleChange() {
    const newMessage = this.titleTextarea.value.replace('\n', '')
      + '\n' + this.bodyTextarea.value;
    chrome.storage.local.set({commitMessage: newMessage});
    this.props.updateFunc(newMessage);
  }

  render() {
    const firstNewLineIndex = this.props.commitMessage.indexOf('\n');
    const title = this.props.commitMessage.substr(0,firstNewLineIndex);
    const body = this.props.commitMessage.substr(firstNewLineIndex+1);
    return (
      <div>
        <textarea value={title}
          ref={(textarea) => { this.titleTextarea = textarea; }}
          onChange={this.handleChange}
          style={{height:"20px", width:"calc(100% - 6px)", resize:"none"}}
          placeholder="Title: briefly summarize your changes"
          maxLength="50" />
        <textarea value={body}
          ref={(textarea) => { this.bodyTextarea = textarea; }}
          onChange={this.handleChange}
          style={{height:"300px",width:"400px"}}
          placeholder="Describe your changes in detail" />
      </div>
    );
  }
}

export default CommitMessage;
