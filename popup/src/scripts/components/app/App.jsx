import React, {Component} from 'react';
import getDoc, { setDoc } from './GetDocAsString.js';
import Select, { Creatable } from 'react-select';
import { ClipLoader } from 'halogen'; // loading spinner
import config from '../../../../../config.json';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {branches: [{name:"master"}], commitMessage:"",
       branch:{value:"master",label:"master"}};
    this.repo = config.repo; 
    this.main = config.file;
    this.inProgressMap = {"commitInProgress":"commit",
       "newBranchInProgress":"creating branch", "pullInProgress":"retrieving file",
       "mergeInProgress":"merge", "branchDeleteInProgress":"deleting branch"}; 
    this.handleBranchChange = this.handleBranchChange.bind(this);
    this.handleCommitMessageChange = this.handleCommitMessageChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleFromBranchChange = this.handleFromBranchChange.bind(this);
    this.handleToMergeChange = this.handleToMergeChange.bind(this);
    this.handleCommitSubmit = this.handleCommitSubmit.bind(this);
    this.handleNewBranchSubmit = this.handleNewBranchSubmit.bind(this);
    this.handlePullSubmit = this.handlePullSubmit.bind(this);
    this.handleMergeSubmit = this.handleMergeSubmit.bind(this);
    this.handleDeleteBranch = this.handleDeleteBranch.bind(this);
    this.deleteBranchRender = this.deleteBranchRender.bind(this);
  }
  
  componentWillMount() {
    console.log("CONFIGERONI", config);
    chrome.runtime.onMessage.addListener(this.receiveMessage);
    chrome.runtime.sendMessage({to:"bg", target:{action:"listBranches",repo:this.repo}},
       (response) => {
        this.setState({branches:response});
    });
    chrome.storage.local.get("ZRGithubBranch", (data) => {
       const branch = data["ZRGithubBranch"];
       if(branch) {
           this.setState({branch});
       }
    });
    //chrome.runtime.sendMessage({to:"bg", target:{action:"createHook",repo:this.repo},
    //   params:{events:["create","delete"]}}, (response) => {
    //     console.log(response);
    //});
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
    if (this.state.commitInProgress) return;
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
                this.setState({status: `The file you are committing is not the most recent${                    ""} in its branch. Pull the latest in a new tab, integrate your${                           ""} changes, and then commit again.`});
           }
           this.setState({commitInProgress: false});
       });
       this.setState({commitMessage:""});
    });
    event.preventDefault();
  }

  handleNewBranchSubmit(event) {
    if (this.state.newBranchInProgress) return;
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
    if (this.state.pullInProgress) return;
    this.setState({pullInProgress: true});
    chrome.runtime.sendMessage({to:"bg", target:{action:"getContents",repo:this.repo},
      params:{ref:this.state.branch.value, path:this.main}}, (response) => {
        console.log(response);
        this.setState({pullInProgress: false});
        setDoc(response);
    });
    event.preventDefault();
  }

  handleMergeSubmit(event) {
    if (this.state.mergeInProgress) return;
    this.setState({mergeInProgress: true});
    chrome.runtime.sendMessage({to:"bg", target:{action:"merge",repo:this.repo},
      params:{base:this.state.branch.value, head:this.state.toMerge.value}}, (response) => {
         this.setState({status: response.ok? response.message: "Merge failed", 
            mergeInProgress: false});
    });
    event.preventDefault();
  }
  
  handleDeleteBranch() {
    if (this.state.branchDeleteInProgress) return;
    this.setState({branchDeleteInProgress: true});
    const toDelete = this.state.branch.value;
    if (toDelete=="master") {
      this.setState({status:"please don't delete master"}); return;
    }
    if (!window.confirm("You are about to delete "+toDelete)) {
      this.setState({branchDeleteInProgress: false});
      return;
    }
    chrome.runtime.sendMessage({to:"bg", target:{action:"deleteRef",repo:this.repo},
      params:{branch:toDelete}}, (response) => {
         this.setState({status: response.ok? "deleted": "failed to delete",
             branches:this.state.branches.filter(e => e.name!=toDelete), 
             branchDeleteInProgress: false});
         this.handleBranchChange({label:"master",value:"master"});
         chrome.storage.local.set({"ZRGithubBranch": ""});
    });
  }

  deleteBranchRender() {
    return <span className="Select-clear" onClick={this.handleDeleteBranch}>&times;</span>;
  }

  render() {
    console.log(this.state);
    return (
      <div>
        <div>
	    {this.repo.name}
            <Creatable 
               options={this.state.branches.map(e=>{return {label: e.name, value:e.name}})} 
               value = {this.state.branch} onChange={this.handleBranchChange}
               clearValueText="Delete branch"
               clearRenderer={this.deleteBranchRender}
               clearable={this.state.branch? true: false}
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
	    <form onSubmit={this.handleCommitSubmit}>
	        <label>
                  Commit message:
	          <textarea value={this.state.commitMessage}
                      onChange={this.handleCommitMessageChange} />
	        </label>
	        <input type="submit" value="commit and push" />
                <ClipLoader size="10px" style={{display:this.state.commitInProgress?
                    "inline":"none"}} />
 	    </form>
	    <form onSubmit={this.handlePullSubmit}>
               <input type="submit" value="pull and overwrite" />
            </form>
	    <form onSubmit={this.handleMergeSubmit}>
               <input type="submit" value="merge" />
               <Select options={this.state.branches.map(e=>
                  {return {label:e.name, value:e.name}})}
                  onChange={this.handleToMergeChange} value={this.state.toMerge} />
            </form>
	</div>
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
