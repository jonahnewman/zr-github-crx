import React, {Component} from 'react';
import getDoc, { setDoc } from './GetDocAsString.js';
import Select, { Creatable } from 'react-select';
import config from '../../../../../config.json';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {branches: [{name:"master"}], commitMessage:"",
       branch:{value:"master",label:"master"}, advanced:false};
    this.repo = config.repo;
    this.main = config.file;
    this.inProgressMap = {"commitInProgress":"commit",
       "newBranchInProgress":"creating branch", "pullInProgress":"retrieving file",
       "mergeInProgress":"merge", "branchDeleteInProgress":"deleting branch","loginInProgress":"login"};
    this.handleBranchChange = this.handleBranchChange.bind(this);
    this.handleCommitMessageChange = this.handleCommitMessageChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleFromBranchChange = this.handleFromBranchChange.bind(this);
    this.handleToMergeChange = this.handleToMergeChange.bind(this);
    this.handleCommitSubmit = this.handleCommitSubmit.bind(this);
    this.handleNewBranchSubmit = this.handleNewBranchSubmit.bind(this);
    this.handlePullSubmit = this.handlePullSubmit.bind(this);
    this.handleMergeSubmit = this.handleMergeSubmit.bind(this);
    this.handleLoginSubmit = this.handleLoginSubmit.bind(this);
    this.handleRepoChangeSubmit = this.handleRepoChangeSubmit.bind(this);
  }
  
  componentWillMount() {
    chrome.runtime.onMessage.addListener(this.receiveMessage);
    chrome.runtime.sendMessage({to:"bg", target:{action:"listBranches",repo:this.repo}},
       (response) => {
        this.setState({branches:response});
    });
    chrome.storage.local.get(["ZRGithubBranch","ZRGithubRepo"], (data) => {
        const branch = data["ZRGithubBranch"];
        const repo = data["ZRGithubRepo"];
	if (branch || repo) {
      		if (branch) {
      			this.setState({branch});
       		}
      		if (repo) {
        		this.repo=repo;
      		 }
	}
       	chrome.runtime.sendMessage({to:"bg", target:{action:"listBranches",repo:this.repo}},
       		(response) => {
       			this.setState({branches:response});
    	});
    });
  }

  receiveMessage(message, sender, sendResponse) {
    if (message.to!="popup") return;
  }

  handleBranchChange(value) {
    if (!value) return;
    this.setState({branch:value});
    chrome.storage.local.set({"ZRGithubBranch": value});
  }

  handleFromBranchChange(value) {
     this.setState({fromBranch:value});
  }

  handleCommitMessageChange(event) {
    this.setState({commitMessage: event.target.value});
  }
  
  handleInputChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }

  handleToMergeChange(value) {
    this.setState({toMerge: value});
  }

  handleCommitSubmit(event) {
    if (this.state.commitInProgress) { event.preventDefault();return; }
    if (!this.state.commitMessage) {
       this.setState({status: "No commit message"});
       event.preventDefault();return;
    }
    this.setState({commitInProgress: true});
    console.log("fetching doc");
    getDoc().then((doc) => {
       console.log("got doc");
       chrome.runtime.sendMessage({to:"bg", target:{action:"commit",repo:this.repo},
          params:{branch:this.state.branch.value, text:doc.text, localSHA:doc.head.sha,
           message:this.state.commitMessage, path:this.main}}, (response) => {
           if (response.ok) {
               this.setState({status: "successfully committed to "
                  + this.state.branch.value});
           }
           else if (response.reason == "oldsha") {
                this.setState({status: `The file you are committing is not the most recent${                                  ""} in its branch. Pull the latest in a new tab, integrate your${                                            ""} changes, and then commit again.`});
           }
           this.setState({commitInProgress: false});
       });
       this.setState({commitMessage:""});
    });
    event.preventDefault();
  }

  handleNewBranchSubmit(event) {
    if (this.state.newBranchInProgress) { event.preventDefault();return; }
    this.setState({newBranchInProgress: true});
    chrome.runtime.sendMessage({to:"bg", target:{action:"createBranch",repo:this.repo},
       params:{newBranch: this.state.branch.value, oldBranch:this.state.fromBranch.value}},
        (response)=> {
            if (response.ok) {
              this.setState({status:`Created branch ${response.branch}. ${
                 ""}Pull to get latest.`, branches:this.state.branches.concat([{name:
                 response.branch}]) });
            }
            this.setState({newBranchInProgress: false});
     });
    event.preventDefault();
  }

  handlePullSubmit(event) {
    if (this.state.pullInProgress) { event.preventDefault();return; }
    this.setState({pullInProgress: true});
    chrome.runtime.sendMessage({to:"bg", target:{action:"getContents",repo:this.repo},
      params:{ref:this.state.branch.value, path:this.main}}, (response) => {
        console.log(response);
        this.setState({pullInProgress: false, status:`Retrieved document. It is possible that the browser${
          ""} cached the file, in which case you may have to wait a minute to see the most recent version`});
        setDoc(response);
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
      params:{base:this.state.branch.value, head:this.state.toMerge.value}}, (response) => {
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
    chrome.runtime.sendMessage({to:"bg", target:{action:"login"}}, (response) => {
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
 
  handleRepoChangeSubmit(event) {
    if (this.state.newRepoUser && this.state.newRepoName) {
       chrome.storage.local.set({ZRGithubRepo:{user:this.state.newRepoUser, name:this.state.newRepoName}},
        () => {this.setState({status:`Repo is now ${this.state.newRepoUser}/${this.state.newRepoName}. Close and reopen popup`});} );
    }
    event.preventDefault();
  }

  render() {
    console.log(this.state);
    return (
      <div>
        <div>
            <h3 style={{margin:"0"}}>Active branch:</h3>
            <Creatable
               options={this.state.branches.map(e=>{return {label: e.name, value:e.name}})}
               value = {this.state.branch} onChange={this.handleBranchChange}
               clearValueText="Delete branch"
               clearable={false}
               promptTextCreator={(label)=>`Create branch "${label}"`} />
            {this.state.branches.map(e=>e.name).includes(this.state.branch.value) ? null :
              <form onSubmit={this.handleNewBranchSubmit}>
                 From existing branch:
                 <Select options={this.state.branches.map(e=>
                        {return {label:e.name,value:e.name}})}
                    onChange={this.handleFromBranchChange} value={this.state.fromBranch} />
                 <input type="submit" value="create" />
              </form>}
	</div>
	<div>
            <div style={{margin:"2px 0"}}>
  	       <form onSubmit={this.handleCommitSubmit}>
	           <label>
                     Commit message:
	             <textarea value={this.state.commitMessage}
                         onChange={this.handleCommitMessageChange} />
	           </label>
	           <input type="submit" value="commit and push" />
 	       </form>
            </div>
	    <form onSubmit={this.handlePullSubmit}>
               <input type="submit" value="pull and overwrite" />
            </form>
	    <form onSubmit={this.handleMergeSubmit}>
               <div style={{display:"flex"}}>
                  <div> <input type="submit" value="merge with:" /> </div>
                  <div style={{flexGrow:"1"}}>
                     <Select options={this.state.branches.map(e=>
                        {return {label:e.name, value:e.name}})}
                        onChange={this.handleToMergeChange} value={this.state.toMerge} />
                  </div>
               </div>
            </form>
	</div>
	      <div> <button onClick={()=>{this.setState({advanced:!this.state.advanced})}}>advanced</button> </div>
        {this.state.advanced?<div>
           <form onSubmit={this.handleLoginSubmit}>
             <input type="submit" value="manual login" />
           </form>
           <div>{`${this.repo.user}/${this.repo.name}`}</div>
           <form onSubmit={this.handleRepoChangeSubmit}>
             <div style={{display:"flex"}}>
                <input type="text" onChange={this.handleInputChange} name="newRepoUser"
                    style={{width:"70px"}} />
                {"/"}
                <input type="text" onChange={this.handleInputChange} name="newRepoName"
                    style={{width:"70px"}} />
                <input type="submit" value="change repo" />
             </div>
           </form>
        </div>:null}
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
