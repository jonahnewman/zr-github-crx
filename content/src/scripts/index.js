import query from '../../../popup/src/scripts/eventApi.js';
import config from '../../../config.json';

chrome.storage.local.get("showSimBranchMenu", (data) => {
  console.log("show menu", data.showSimBranchMenu);
  if (data.showSimBranchMenu) {
    const simulateButton = document.querySelector('[ng-click="openSimDialog()"]');
    query({action:"listBranches", repo:config.repo}).then((response) => {
      simulateButton.addEventListener("click", () => {
        setTimeout(() => {addMenu(response.branches)}, 100)
      });
      console.log(response.branches);
    });
  }
});

function addMenu(branches) {
 // angular.element($0).scope().$digest()
  const playerSelect = document.getElementById('std-player-select');
  const wrapper = document.createElement('div');
  wrapper.classList.add("btn-group");
  wrapper.setAttribute("dropdown", "");
  wrapper.setAttribute("keyboard-nav", "");
  wrapper.addEventListener("click", (event) => {
    if (wrapper.classList.contains("open"))
      wrapper.classList.remove("open");
    else
      wrapper.classList.add("open");
  });

  const button = document.createElement('button');
  button.classList.value += "btn btn-default dropdown-toggle";
  button.type = "button";
  button.innerHTML = 'Select from GitHub <span class="caret"></span>';
  const branchList = document.createElement('ul');
  branchList.classList.value += "dropdown-menu";
  branchList.setAttribute("role", "menu");
  branches.forEach((e) => {
    const el = document.createElement('li');
    el.setAttribute("role", "menuitem");
    const link = document.createElement('a');
    link.innerText = e.name;
    link.setAttribute("href","");
    el.appendChild(link);
    branchList.appendChild(el);
    el.addEventListener("click", () => {pickGithubOpponent(e.name)});
  });
  wrapper.appendChild(button);
  wrapper.appendChild(branchList);
  playerSelect.parentNode.parentNode.appendChild(wrapper);
}

function pickGithubOpponent(branch) {
  query({action:"getContents", repo:config.repo}, {ref:branch, path:config.file})
  .then((data) => {
    console.log(data);
    var s = document.createElement('script');
    s.innerText = `
      var scope = angular.element(document.getElementById('std-player-select')).scope();
      scope.data.opponentCode[0] = \`${data.text.replace(/\n/g, '\\n')}\`;
      scope.opponentTitle = \`${branch}\`;
      scope.$digest();
    `;
    s.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(s);
  });
}
