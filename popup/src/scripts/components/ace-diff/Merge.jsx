import React, {Component} from 'react';
import ContentScript, {includeExtensionFile} from './Merge.js';
import query from '../../eventApi.js';
import { BranchList } from '../branches/BranchSwitcher.jsx';

class Merge extends Component {
  constructor(props) {
    super(props);
    this.startDiff = this.startDiff.bind(this);
    this.stopDiff = this.stopDiff.bind(this);
    this.updateBase = this.updateBase.bind(this);
    this.state = {base: "", mergeDialogOpen: false};
  }
 
  updateBase(newBase) {
    this.setState({base: newBase});
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.merging && !nextProps.merging) {
      console.log("stopping merge after successful commit");
      this.stopDiff();
    }
  }

  startDiff(event) {
   if (this.props.merging || !this.state.base) {
     event.preventDefault();
     return;
   }
   this.props.updateMerging(true);
   query("getContents",
      {ref:this.state.base, path:this.props.path})
    .then((response) => {
      this.props.updateBaseSHA(JSON.parse(response.text.match(/^\/\/(.+)/)[1]).sha);
      var scrubbed = response.text.replace(/"/g,'\\\"');
      scrubbed = scrubbed.replace(/\n/g, '\\n');
      scrubbed = scrubbed.replace(/'/g, "\\'");
      chrome.tabs.executeScript({code: ContentScript
      + includeExtensionFile+"showDiff(\'"+scrubbed+"\');"});
      this.props.setStatus(`Merging with commit ${this.props.base+'\n'}Commit or abort to stop`);
    });
    event.preventDefault();
  }

  stopDiff() {
    var self = this;
    this.props.updateBaseSHA("");
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {to:"diff", msg: "stopDiff"}, function(response) {
      });
    });
    this.props.setStatus("");
    this.setState({mergeDialogOpen: false});
  }

  render() {
    return (
      <div>
        {this.props.merging ? 
          <form onSubmit={(event) => {
              this.props.updateMerging(false);
              event.preventDefault();
            }
          }>
            <input type="submit" value="Abort merge" />
          </form>
        :
          <div>
            <input type="button" value="merge" onClick={() => 
              {this.setState({mergeDialogOpen: true}) }} />
            {this.state.mergeDialogOpen ?
              <form onSubmit={this.startDiff}>
                <div style={{display:"flex"}}>
                  <span> with branch </span>
                  <div style={{flexGrow:"1"}}>
                    <BranchList value={this.state.base} branches={this.props.branches}
                      updateFunc={this.updateBase} />
                  </div>
                  <div><input type="submit" value="start merge" /></div>
                </div>
              </form>
            : null }
          </div>
        }
      </div>
    );
  }
}

export default Merge;
