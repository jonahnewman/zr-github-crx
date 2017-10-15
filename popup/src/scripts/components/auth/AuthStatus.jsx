import React, {Component} from 'react';
import query from '../../eventApi.js';
/**
 * @prop repo
 */ 
class AuthStatus extends Component {
  constructor(props) {
    super(props);
    this.state = {user: null};
    this.checkAuth = this.checkAuth.bind(this);
  }

  componentWillMount() {
    this.checkAuth();
  }

  login(event) {
    query("login").then(this.checkAuth);
    event.preventDefault();
  }

  checkAuth() {
    console.log("checking auth");
    query("checkAuth")
    .then((response) => {
      console.log("auth",response);
      this.setState({user: response.login});
    });
  }

  render() {
    return (
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        {this.state.user ?
          <span>Logged in as {this.state.user}</span>
        :
          <form onSubmit={this.login}>
            <input type="submit" value="Log in" />
          </form>
        }
      </div>
    );
  }
}

export default AuthStatus;

