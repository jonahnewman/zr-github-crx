import React, {Component} from 'react';
import ContentScript, {includeExtensionFile} from './AceDiff.js';
import query from '../../eventApi.js';
import { BranchList } from '../branches/BranchSwitcher.jsx';

class Diff extends Component {
  constructor(props) {
    super(props);
    this.startDiff = this.startDiff.bind(this);
    this.stopDiff = this.stopDiff.bind(this);
    this.state = {dialogOpen: false};
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.diffing && !nextProps.diffing) {
      this.stopDiff();
    }
  }

  startDiff(event) {
   if (this.props.diffing || !this.state.base) {
     event.preventDefault();
     return;
   }
   this.props.updateDiffing(true);
   query("getContents",
      {ref:this.state.base, path:this.props.path})
    .then((response) => {
      var scrubbed = response.text.replace(/"/g,'\\\"')
      .replace(/\n/g, '\\n')
      .replace(/'/g, "\\'");
      chrome.tabs.executeScript({code: ContentScript
      + includeExtensionFile+"showDiff(\'"+scrubbed+"\');"});
    });
    event.preventDefault();
  }

  stopDiff() {
    var self = this;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {to:"diff", msg: "stopDiff"}, function(response) {
      });
    });
    this.setState({dialogOpen: false});
  }

  render() {
    return (
      <div>
        {this.props.diffing ? 
          <form onSubmit={(event) => {
              this.props.updateDiffing(false);
              event.preventDefault();
            }
          }>
            <input type="submit" value="stop diffing" />
          </form>
        :
          <div>
            <input type="button" value="diff" onClick={() => 
              {this.setState({dialogOpen: true}) }} />
            {this.state.dialogOpen ?
              <form onSubmit={this.startDiff}>
                <div style={{display:"flex"}}>
                  <span> with branch </span>
                  <div style={{flexGrow:"1"}}>
                    <BranchList value={this.state.base} branches={this.props.branches}
                      updateFunc={(base) => {this.setState({base});}} />
                  </div>
                  <div><input type="submit" value="start diff" /></div>
                </div>
              </form>
            : null }
          </div>
        }
      </div>
    );
  }
}

export default Diff;
