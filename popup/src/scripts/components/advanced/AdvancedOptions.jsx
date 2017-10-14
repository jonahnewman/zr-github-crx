import React, {Component} from 'react';

class AdvancedOptions extends Component {
  constructor(props) {
    super(props);
    this.state = {show: false};
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleRepoChange = this.handleRepoChange.bind(this);
    this.toggleBranchMenu = this.toggleBranchMenu.bind(this);
  }
 
  componentWillMount() {
    chrome.storage.local.get("showSimBranchMenu", (data) => {
      this.setState({showMenu: data.showSimBranchMenu});
    });
  }

  handleInputChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }

  handleRepoChange() {
    this.props.changeRepo(this.state.newRepoUser, this.state.newRepoName);
  }

  toggleBranchMenu(event) {
    chrome.storage.local.get("showSimBranchMenu", (data) => {
      chrome.storage.local.set({showSimBranchMenu:!data.showSimBranchMenu});
      this.setState({showMenu:!data.showSimBranchMenu});
    });
    event.preventDefault();
  }

  render() {
    return (
      <div>
        <button onClick={()=>{this.setState({show:!this.state.show})}}>advanced</button>
        {this.state.show?
          <div>
            <form onSubmit={this.props.login}>
              <input type="submit" value="manual login" />
            </form>
            <div>{`Will push to ${this.props.repoFullName}`}</div>
            <form onSubmit={this.handleRepoChange}>
              <div style={{display:"flex"}}>
                 <input type="text" onChange={this.handleInputChange} name="newRepoUser"
                     style={{width:"70px"}} autoComplete="off" />
                 {"/"}
                 <input type="text" onChange={this.handleInputChange} name="newRepoName"
                     style={{width:"70px"}} autoComplete="off" />
                 <input type="submit" value="change repo" />
              </div>
            </form>
            <form onSubmit={this.toggleBranchMenu}>
              Branch drop-down in simulation dialog is
              {this.state.showMenu ? " on" : " off"}
              <input type="submit" value={this.state.showMenu?"turn off":"turn on"} /> 
            </form>
          </div>
        : null}
      </div>
    );
  }
}

export default AdvancedOptions;
