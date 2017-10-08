import React, {Component} from 'react';
import ContentScript, {includeExtensionFile} from './Merge.js';
import query from '../../eventApi.js';

class Diff extends Component {
  constructor(props) {
    super(props);
    this.startDiff = this.startDiff.bind(this);
    this.stopDiff = this.stopDiff.bind(this);
    this.state = {diffMode: false};
  }
  
  componentWillMount() {
    chrome.storage.local.get("diffMode", (data) => {
      if (data.diffMode != undefined) {
        this.setState({diffMode: data.diffMode});
      }
    });
  }

  startDiff(event) {
   query({action:"getContents",repo:this.props.repo},
      {ref:this.props.branch, path:this.props.path})
    .then((response) => {
      var scrubbed = response.text.replace(/"/g,'\\\"');
      scrubbed = scrubbed.replace(/\n/g, '\\n');
      scrubbed = scrubbed.replace(/'/g, "\\'");
      chrome.tabs.executeScript({code: ContentScript
      + includeExtensionFile+"showDiff(\'"+scrubbed+"\');"});
      chrome.storage.local.set({diffMode: true});
      this.setState({diffMode: true});
    });
    event.preventDefault();
  }

  stopDiff(event) {
    var self = this;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {to:"diff", msg: "stopDiff"}, function(response) {
        self.setState({diffMode: false})
        chrome.storage.local.set({diffMode: false});
      });
    });
    event.preventDefault();
  }

  render() {
    return (
      <div>
        {this.state.diffMode ? 
          <form onSubmit={this.stopDiff}>
            <div>Showing difference between document and last commit</div>
            <input type="submit" value="done" />
          </form>
        :
          <form onSubmit={this.startDiff}>
            <input type="submit" value="diff" />
          </form>
        }
      </div>
    );
  }
}

export default Diff;
