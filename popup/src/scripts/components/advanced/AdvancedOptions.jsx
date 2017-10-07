import React, {Component} from 'react';

class AdvancedOptions extends Component {
  constructor(props) {
    super(props);
    this.state = {show: false};
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleRepoChange = this.handleRepoChange.bind(this);
  }
 
  handleInputChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }

  handleRepoChange() {
    this.props.changeRepo(this.state.newRepoUser, this.state.newRepoName);
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
          </div>
        : null}
      </div>
    );
  }
}

export default AdvancedOptions;
