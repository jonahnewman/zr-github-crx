import React, {Component} from 'react'
import query from '../../eventApi.js'
/**
 * @prop repo
 */
class AuthStatus extends Component {
  constructor (props) {
    super(props)
    this.login = this.login.bind(this)
    this.checkAuth = this.checkAuth.bind(this)
  }

  componentWillMount () {
    this.checkAuth()
  }

  login (event) {
    query('login').then(this.checkAuth, this.checkAuth)
    event.preventDefault()
  }

  checkAuth () {
    console.log('checking auth')
    query('checkAuth')
      .then((response) => {
        console.log('auth', response)
        this.props.updateUser(response.login)
      })
  }

  render () {
    return (
      <div style={{display: 'flex', justifyContent: 'flex-end'}}>
        {this.props.user
          ? <span>Logged in as {this.props.user}</span>
          : <form onSubmit={this.login}>
            <input type='submit' value='Log in' />
          </form>
        }
      </div>
    )
  }
}

export default AuthStatus
