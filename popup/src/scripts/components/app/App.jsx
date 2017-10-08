import React, {Component} from 'react';
import { getDoc, setDoc } from './PageCommunication.js';
import CommitMessage from '../commit/CommitMessage.jsx';
import AdvancedOptions from '../advanced/AdvancedOptions.jsx';
import BranchSwitcher, { BranchList } from '../branches/BranchSwitcher.jsx';
import AuthStatus from '../auth/AuthStatus.jsx';
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
       "mergeInProgress":"merge", "branchDeleteInProgress":"deleting branch","loginInProgress":"login",
       "refreshBranchInProgress":"refreshing branches"};
    this.refreshBranches = this.refreshBranches.bind(this);
    this.handleBranchChange = this.handleBranchChange.bind(this);
    this.handleCommitMessageChange = this.handleCommitMessageChange.bind(this);
    this.handleFromBranchChange = this.handleFromBranchChange.bind(this);
    this.handleToMergeChange = this.handleToMergeChange.bind(this);
    this.handleCommitSubmit = this.handleCommitSubmit.bind(this);
    this.handleNewBranchSubmit = this.handleNewBranchSubmit.bind(this);
    this.handleFetchSubmit = this.handleFetchSubmit.bind(this);
    this.handleMergeSubmit = this.handleMergeSubmit.bind(this);
    this.handleLoginSubmit = this.handleLoginSubmit.bind(this);
    this.handleRepoChangeSubmit = this.handleRepoChangeSubmit.bind(this);
  }
  
  componentWillMount() {
    this.refreshBranches();
    chrome.storage.local.get(["branch","repo"], (data) => {
        const branch = data["branch"];
        const repo = data["repo"];
      	if (branch) {
      		this.setState({branch});
       	}
      	if (repo) {
       		this.repo=repo;
      	}
      	this.refreshBranches();
    });
  }

  refreshBranches(noCache) {
    if (this.state.refreshBranchInProgress) return;
    this.setState({refreshBranchInProgress: true});
    chrome.runtime.sendMessage({to:"bg", target:{action:"listBranches",repo:this.repo},
      params:{noCache}},
       (response) => {
        this.setState({branches:response, refreshBranchInProgress: false});
    });
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

  handleToMergeChange(value) {
    this.setState({toMerge: value});
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
      chrome.runtime.sendMessage({to:"bg", target:{action:"commit",repo:this.repo},
         params:{branch:this.state.branch, text:doc.text, localSHA:doc.head.sha,
          message:this.state.commitMessage, path:this.main}}, (response) => {
          if (response.ok) {
              this.setState({status: "successfully committed to "
                 + this.state.branch, commitMessage: ""});
              chrome.storage.local.set({commitMessage: ""});
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
    this.setState({fetchInProgress: true});
    chrome.runtime.sendMessage({to:"bg", target:{action:"getContents",repo:this.repo},
      params:{ref:this.state.branch, path:this.main}}, (response) => {
        console.log(response);
        this.setState({fetchInProgress: false, status:`Retrieved document.`});
        setDoc(response.text);
    });
    event.preventDefault();
  }

  handleMergeSubmit(event) {
    if (this.state.mergeInProgress) { event.preventDefault();return; }
    if (!this.state.toMerge) {
      this.setState({status: "Must select branch with which to merge"});
      event.preventDefault();return;
    }
    this.setState({mergeInProgress: true});
    chrome.runtime.sendMessage({to:"bg", target:{action:"merge",repo:this.repo},
      params:{base:this.state.branch, head:this.state.toMerge}}, (response) => {
         if (response.ok) {
            this.setState({status: "Merge succeeded"});
         }
         else if (response.reason=="conflict") {
            this.setState({status: "Merge conflict: must merge manually"});
         }
         this.setState({mergeInProgress: false});
    });
    event.preventDefault();
  }
 
  handleLoginSubmit(event) {
    if (this.state.loginInProgress) { event.preventDefault();return; }
    this.setState({loginInProgress: true});
    chrome.runtime.sendMessage({to:"bg", target:{action:"login",repo:this.repo}},
     (response) => {
       console.log(response);
       if (response.ok) {
          this.setState({status: "Logged in successfully"});
       }
       else {
          this.setState({status: "Login failed"});
       }
       this.setState({loginInProgress: false});
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
        <AuthStatus repo={this.repo} />
        <BranchSwitcher
          branch={this.state.branch}
          branches={this.state.branches}
          updateFunc={this.handleBranchChange}
          refreshBranches={this.refreshBranches}
          createBranch={this.handleNewBranchSubmit}
          fromBranch={this.state.fromBranch}
          fromBranchUpdate={this.handleFromBranchChange} />
	<div>
            <div style={{margin:"2px 0"}}>
  	       <form onSubmit={this.handleCommitSubmit}>
	           <CommitMessage
                     commitMessage={this.state.commitMessage}
                     updateFunc={this.handleCommitMessageChange} />
	           <input type="submit" value="commit and push" />
 	       </form>
            </div>
	    <form onSubmit={this.handleFetchSubmit}>
               <input type="submit" value="fetch and overwrite" />
            </form>
	    <form onSubmit={this.handleMergeSubmit}>
               <div style={{display:"flex"}}>
                  <div> <input type="submit" value="merge with:" /> </div>
                  <div style={{flexGrow:"1"}}>
                    <BranchList value={this.state.toMerge}
                      branches={this.state.branches}
                      updateFunc={this.handleToMergeChange} />
                 </div>
               </div>
            </form>
	</div>
        <AdvancedOptions 
          repoFullName={`${this.repo.user}/${this.repo.name}`}
          login={this.handleLoginSubmit}
          changeRepo={this.handleRepoChangeSubmit} /> 
        <Diff branch={this.state.branch} repo={this.repo} path={this.main} />
        <div>
	    {this.state.status}
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
