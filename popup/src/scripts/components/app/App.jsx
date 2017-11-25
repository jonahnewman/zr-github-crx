/**
 * This is the core of the popup window UI. All the UI components are used
 * in this component's render function.
 */
import React, {Component} from 'react';
import { getDoc, setDoc } from './PageCommunication.js';
import CommitMessage from '../commit/CommitMessage.jsx';
import AdvancedOptions from '../advanced/AdvancedOptions.jsx';
import BranchSwitcher, { BranchList } from '../branches/BranchSwitcher.jsx';
import AuthStatus from '../auth/AuthStatus.jsx';
import Merge from '../merge/Merge.jsx';
import Diff from '../ace-diff/Diff.jsx';
import config from '../../../../../config.json';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {branches: [], commitMessage:"" };
    this.repo = config.repo;
    this.main = config.file;
    this.inProgressMap = {"commitInProgress":"commit",
       "newBranchInProgress":"creating branch", "fetchInProgress":"retrieving file",
       "mergeInProgress":"merge","loginInProgress":"login",
       "refreshBranchInProgress":"refreshing branches"};
    this.refreshBranches = this.refreshBranches.bind(this);
    this.setStatus = this.setStatus.bind(this);
    this.handleBranchChange = this.handleBranchChange.bind(this);
    this.handleCommitMessageChange = this.handleCommitMessageChange.bind(this);
    this.handleFromBranchChange = this.handleFromBranchChange.bind(this);
    this.handleMergeBaseSHAChange = this.handleMergeBaseSHAChange.bind(this);
    this.handleMergeBaseChange = this.handleMergeBaseChange.bind(this);
    this.handleMergingChange = this.handleMergingChange.bind(this);
    this.handleCommitSubmit = this.handleCommitSubmit.bind(this);
    this.handleNewBranchSubmit = this.handleNewBranchSubmit.bind(this);
    this.handleFetchSubmit = this.handleFetchSubmit.bind(this);
    this.handleRepoChangeSubmit = this.handleRepoChangeSubmit.bind(this);
    this.handleActiveUserChange = this.handleActiveUserChange.bind(this);
  }
 
  componentWillMount() {
    chrome.storage.local.get(["branch","repo","merge"], (data) => {
        const branch = data["branch"];
        const repo = data["repo"];
      	if (branch) {
      		this.setState({branch});
       	}
      	if (repo) {
       		this.repo=repo;
      	}
        if (data.merge) {
          this.setState({merging:data.merge.merging,
            mergeBase: data.merge.base});
        }
      	if (this.state.activeUser) this.refreshBranches();
    });
  }

  refreshBranches(noCache) {
    if (this.state.refreshBranchInProgress) return;
    this.setState({refreshBranchInProgress: true});
    chrome.runtime.sendMessage({to:"bg", target:{action:"listBranches",repo:this.repo},
      params:{noCache}},
       (response) => {
        this.setState({branches:response.branches, refreshBranchInProgress: false});
    });
  }

  setStatus(text) {
    this.setState({status: text});
  }

  handleBranchChange(value) {
    this.setState({branch:value});
    chrome.storage.local.set({"branch": value});
  }

  handleFromBranchChange(value) {
     this.setState({fromBranch:value});
  }

  handleCommitMessageChange(newMessage) {
    this.setState({commitMessage: newMessage});
  }
  
  handleInputChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }

  handleMergeBaseSHAChange(value) {
    this.setState({mergeBaseSHA: value, merging: value? true : false});
  }
 
  handleMergeBaseChange(value) {
    this.setState({mergeBase: value});
    chrome.storage.local.set({merge: {merging: value?true:false,
      base: value}});
  }

  handleMergingChange(newMergingState, conflict) {
    this.setState({merging: newMergingState});
    if (newMergingState) {
      setDoc(conflict);
      this.setStatus(`Unable to merge cleanly.\n${
                  ""} Decide if you want to keep only your branch's changes,${
                  ""} keep only the other branch's changes, or make a brand${
                  ""} new change, which may incorporate changes from both${
                  ""} branches. Delete the conflict markers <<<<<<<, =======,${
                  ""} >>>>>>> and make the changes you want in the final merge.`);
    }
    else {
      this.handleMergeBaseChange(null); 
      this.handleFetchSubmit();
    }
  }

  handleActiveUserChange(value) {
    this.setState({activeUser: value});
    this.refreshBranches(true);
  }

  handleCommitSubmit(event) {
    if (this.state.commitInProgress) { event.preventDefault();return; }
    if (!this.state.commitMessage.replace(/\s/g, '')) {
       this.setState({status: "No commit message"});
       event.preventDefault();return;
    }
    this.setState({commitInProgress: true});
    console.log("waiting on content script");
    getDoc().then((doc) => {
      console.log("got doc");
      if (doc.text.includes("<<<<<<<") || doc.text.includes("=======")
      || doc.text.includes(">>>>>>>")) {
        this.setState({commitInProgress: false, status: `It appears that you have${
          ""} uresolved merge conflicts in this project. Resolve them, then commit${
          ""} again.`});
        event.preventDefault();
        return;
      }
      chrome.runtime.sendMessage({to:"bg", target:{action:"commit",repo:this.repo},
         params:{branch:this.state.branch, base: this.state.merging? doc.head.base: null,
          text:doc.text, localSHA:doc.head.sha,
          message:this.state.commitMessage, path:this.main}}, (response) => {
          if (response.ok) {
              this.setState({status: "successfully committed to "
                 + this.state.branch, commitMessage: "", merging: false});
              chrome.storage.local.set({commitMessage: "", merge: {merging: false}});
              setDoc(`//${JSON.stringify({sha:response.newCommitSHA})}\n${doc.text}`);
          }
          else if (response.reason == "oldsha") {
               this.setState({status: `The file you are committing is not the most recent${
                                ""} in its branch. Fetch the latest in a new tab, integrate your${
                                ""} changes, and then commit again.`});
          }
          this.setState({commitInProgress: false});
      });
    }, (error) => {
      if (error.reason=="nosha") {
         this.setState({commitInProgress: false, status: `This doc does not${
                               ""} contain a valid SHA at the top.${
                               ""} Fetch the branch you would like to commit to in${
                               ""} a new tab.`});
       } 
    });
    event.preventDefault();
  }

  handleNewBranchSubmit(event) {
    if (this.state.newBranchInProgress) { event.preventDefault();return; }
    if (!this.state.fromBranch) {
       this.setState({status:"Branches must be created from other branches. Make sure to select one."});
       event.preventDefault(); return;
    }
    this.setState({newBranchInProgress: true});
    chrome.runtime.sendMessage({to:"bg", target:{action:"createBranch",repo:this.repo},
       params:{newBranch: this.state.branch, oldBranch:this.state.fromBranch}},
        (response)=> {
            if (response.ok) {
              this.setState({status:`Created branch ${response.branch}.`});
              this.refreshBranches(true);
            }
            else {
              this.setState({status: "Failed to create branch."});
            }
            this.setState({newBranchInProgress: false});
     });
    event.preventDefault();
  }

  handleFetchSubmit(event) {
    if (this.state.fetchInProgress) { event.preventDefault();return; }
    if (!this.state.branch) {
      this.setStatus("Select a branch first.");
      event.preventDefault(); return;
    }
    this.setState({fetchInProgress: true});
    chrome.runtime.sendMessage({to:"bg", target:{action:"getContents",repo:this.repo},
      params:{ref:this.state.branch, path:this.main}}, (response) => {
        console.log(response);
        this.setState({fetchInProgress: false, status:`Retrieved document.${
         ""} Press ctrl+z in the editor to undo.`});
        setDoc(response.text);
    });
    event.preventDefault();
  }
 
  handleRepoChangeSubmit(repoUser, repoName) {
    if (repoUser && repoName) {
       chrome.storage.local.set({repo:{user:repoUser, name:repoName}},
        () => {this.setState({status:`Repo is now ${repoUser}/${repoName}. Close and reopen popup`});} );
    }
    event.preventDefault();
  }

  render() {
    console.log(this.state);
    return (
      <div>
        <AuthStatus
          user={this.state.activeUser}
          updateUser={this.handleActiveUserChange}
          repo={this.repo} />
        <BranchSwitcher
          branch={this.state.branch}
          branches={this.state.branches}
          updateFunc={this.handleBranchChange}
          refreshBranches={this.refreshBranches}
          createBranch={this.handleNewBranchSubmit}
          disabled={this.state.merging}
          fromBranch={this.state.fromBranch}
          fromBranchUpdate={this.handleFromBranchChange} />
	<div>
            <div style={{margin:"2px 0"}}>
  	       <form onSubmit={this.handleCommitSubmit}>
	           <CommitMessage
                     commitMessage={this.state.commitMessage}
                     enforcedTitle={this.state.merging?
                       `Merge ${this.state.mergeBase} into ${this.state.branch}`
                       : null}
                     updateFunc={this.handleCommitMessageChange} />
	           <input type="submit" value="commit and push" />
 	       </form>
            </div>
	    <form onSubmit={this.handleFetchSubmit}>
               <input type="submit" value="fetch and overwrite"
                 disabled={this.state.merging} />
            </form>
	</div>
        <Merge repo={this.repo} path={this.main} merging={this.state.merging}
          setStatus={this.setStatus} baseSHA={this.state.mergeBaseSHA}
          base={this.state.mergeBase} updateBase={this.handleMergeBaseChange}
          updateBaseSHA={this.handleMergeBaseSHAChange}
          updateMerging={this.handleMergingChange}
          head={this.state.branch}
          toggleWorkingOnMerge={() => {
            this.setState({mergeInProgress: !this.state.mergeInProgress}); }}
          branches={this.state.branches} />
        <Diff branches={this.state.branches} />
        <AdvancedOptions 
          repoFullName={`${this.repo.user}/${this.repo.name}`}
          login={this.handleLoginSubmit}
          changeRepo={this.handleRepoChangeSubmit} /> 
        <div>
	    {this.state.status}
	</div>
        <div>
          {this.state.merging ? `You are in merge mode. Commit once you resolve${
           ""} the conflicts or abort to abandon your work.` : null }
        </div>
        <div>
            {Object.keys(this.inProgressMap).reduce((a,k) => {
                if (this.state[k]) {
                   if (!a) { a = "working on "+this.inProgressMap[k]; }
                   else { a += ", "+this.inProgressMap[k]; }
                }
                return a;
              }, "")}
        </div>
      </div>
    );
  }
}

export default App;
