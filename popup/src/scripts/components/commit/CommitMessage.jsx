import React, {Component} from 'react'

class CommitMessage extends Component {
  constructor (props) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
  }

  componentWillMount () {
    window.chrome.storage.local.get('commitMessage', (data) => {
      if (data.commitMessage) {
        this.props.updateFunc(data.commitMessage)
      }
      if (this.props.enforcedTitle) {
        this.props.updateFunc(this.props.enforcedTitle)
      }
    })
  }

  componentWillReceiveProps (nextProps) {
    if (!this.props.enforcedTitle && nextProps.enforcedTitle) {
      this.props.updateFunc(nextProps.enforcedTitle)
    }
    if (this.props.enforcedTitle && !nextProps.enforcedTitle) {
      this.props.updateFunc(
        this.props.commitMessage.replace(this.props.enforcedTitle, ''))
    }
  }

  handleChange () {
    var newMessage = this.props.enforcedTitle ? this.props.enforcedTitle
      : this.titleTextarea.value.replace('\n', '')
    newMessage += '\n' + this.bodyTextarea.value
    window.chrome.storage.local.set({commitMessage: newMessage})
    this.props.updateFunc(newMessage)
  }

  render () {
    const message = this.props.commitMessage ? this.props.commitMessage : ''
    const firstNewLineIndex = message.indexOf('\n')
    const title = message.substr(0, firstNewLineIndex !== -1 ? firstNewLineIndex
      : message.length)
    const body = firstNewLineIndex !== -1 ? message.substr(firstNewLineIndex + 1) : ''
    return (
      <div>
        <textarea value={title}
          ref={(textarea) => { this.titleTextarea = textarea }}
          onChange={this.handleChange}
          style={{height: '20px', width: 'calc(100% - 6px)', resize: 'none'}}
          placeholder='Title: briefly summarize your changes'
          disabled={!!this.props.enforcedTitle}
          maxLength='50' />
        <textarea value={body}
          ref={(textarea) => { this.bodyTextarea = textarea }}
          onChange={this.handleChange}
          style={{height: '300px', width: '400px'}}
          placeholder='Describe your changes in detail' />
      </div>
    )
  }
}

export default CommitMessage
