import React, {Component} from 'react';
import Select, { Creatable } from 'react-select';

class BranchSwitcher extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <h3 style={{margin:"0"}}>Active branch:</h3>
        <div>Type below to search for an old branch or create a new one</div>
        <div style={{display:"flex"}}>
          <div style={{display:"flex", flexDirection:"column",flexGrow: "1"}}>
            <BranchList 
              branches={this.props.branches} value={this.props.branch}
              updateFunc={this.props.updateFunc}
              promptTextCreator={(label)=>`new branch "${label}"`} />
            {this.props.branches.map(e=>e.name).includes(this.props.branch)
              || this.props.branch == "" ? null :
             <form onSubmit={this.props.createBranch}>
               from existing branch:
               <BranchList
                 branches={this.props.branches} value={this.props.fromBranch}
                 updateFunc={this.props.fromBranchUpdate} />
               <input type="submit" value="create" />
            </form>}
          </div>
          <div onClick={() => {this.props.refreshBranches(true)}}
            style={{cursor:"pointer", fontSize: "x-large"}}>
              &#128260;
          </div>
        </div>
      </div>
    );
  }
}

/**
 * @prop value
 * @prop branches
 */
class BranchList extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const options = this.props.branches.map(e=>{return {label: e.name, value:e.name}});
    const onChange = (change) => { this.props.updateFunc(change.value) };
    const value = {label:this.props.value, value:this.props.value};
    return (
      <div>
        {this.props.branches.length == 0 ? <div>Loading branches...</div> :
          <div>
            {this.props.promptTextCreator ?
              <Creatable
                options={options} value = {value}
                onChange={onChange}
                clearable={false}
                isValidNewOption={(branch) =>
                  branch.label && branch.label.indexOf(" ")==-1 }
                promptTextCreator={this.props.promptTextCreator} />
            :
              <Select 
                options={options} value={value}
                clearable={false}
                onChange={onChange} />}
	  </div>}
      </div>
    );
  }
}

export default BranchSwitcher;
export { BranchList };

