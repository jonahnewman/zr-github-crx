import React, {Component} from 'react'
import query from '../../eventApi.js'
import { BranchList } from '../branches/BranchSwitcher.jsx'

class Merge extends Component {
  constructor (props) {
    super(props)
    this.startMerge = this.startMerge.bind(this)
    this.stopMerge = this.stopMerge.bind(this)
    this.state = {mergeDialogOpen: false}
  }

  componentWillReceiveProps (nextProps) {
    if (this.props.merging && !nextProps.merging) {
      console.log('stopping merge after successful commit')
      this.stopMerge()
    }
  }

  startMerge (event) {
    if (this.props.merging || !this.props.base) {
      event.preventDefault()
      return
    }
    this.props.toggleWorkingOnMerge()
    query('merge', {head: this.props.head, path: this.props.path, base: this.props.base})
      .then((response) => {
        this.props.setStatus(`Successfully merged ${this.props.base} into ${this.props.head}`)
        this.props.toggleWorkingOnMerge()
      },
      (error) => {
        console.log(error)
        if (error.reason === 'conflict') {
          this.props.updateMerging(true, error.conflict)
        } else if (error.reason === 'cannot_merge') {
          this.props.setStatus('Nothing to merge')
        }
        this.props.toggleWorkingOnMerge()
      })
    event.preventDefault()
  }

  stopMerge () {
    this.props.updateBaseSHA('')
    this.props.setStatus('')
    this.setState({mergeDialogOpen: false})
  }

  render () {
    return (
      <div>
        {this.props.merging
          ? <form onSubmit={(event) => {
            this.props.updateMerging(false)
            event.preventDefault()
          }
          }>
            <input type='submit' value='Abort merge' />
          </form>
          : <div>
            <input type='button' value='merge' onClick={() => { this.setState({mergeDialogOpen: true}) }} />
            {this.state.mergeDialogOpen
              ? <form onSubmit={this.startMerge}>
                <div style={{display: 'flex'}}>
                  <span> with branch </span>
                  <div style={{flexGrow: '1'}}>
                    <BranchList value={this.props.base} branches={this.props.branches}
                      updateFunc={this.props.updateBase} />
                  </div>
                  <div><input type='submit' value='start merge' /></div>
                </div>
              </form>
              : null }
          </div>
        }
      </div>
    )
  }
}

export default Merge
