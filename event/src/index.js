import uuid from 'uuid';
import promisify from 'es6-promisify';
import browserRequest from 'browser-request';
import GitHub from 'github-api';
import { Base64 } from 'js-base64';
import config from '../../config.json';
import * as diff3 from 'node-diff3';
import promiseDoWhilst from 'promise-do-whilst';

const request = promisify(browserRequest);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.to!="bg" || !request.target) {
      console.log("This message is not for me");
      return;
    }
    console.log("received message", request);
    chrome.storage.local.get("token", (data) => {
       if(request.target.action=="checkAuth"||request.target.action=="login") {
           handleRequest(request.target, request.params,
              new GitHub({token: data.token ? data.token : null}), sendResponse);
       }
       else if (data.token) {
           var github = new GitHub({token: data.token});
           github.getRepo(request.target.repo.user, request.target.repo.name).getDetails().then(
             ()=> {
               handleRequest(request.target, request.params, github, sendResponse);
             },() => {
               sendResponse({ok: false, reason:"noauth"});  
             });
       }
       else {
           getAuth().then((resp) => {
               const github = new GitHub({token: resp.token});
               handleRequest(request.target, request.params, github, sendResponse);
           });
       }
    });
    return true;
});

function handleRequest(target, params, gh, cb) {
   var repo;
   const request = promisify(browserRequest);
   if (target.repo) {
      repo = gh.getRepo(target.repo.user, target.repo.name);
   }
   console.log("performing action", target.action);
   switch(target.action) {
      case "login":
         getAuth(cb);
         break;
      case "listBranches":
          listBranches(repo, params && params.noCache)
          .then((branches) => {
            cb({ok:true, branches});
          });
          break;
      case "createBranch":
          const oldB = params.oldBranch;
          const newB = params.newBranch;
          repo.createBranch(oldB?oldB:newB, oldB?newB:null).then((branchResponse) => {
            cb({ok: true, branch:newB});
          });
          break;
      case "checkAuth":
          var user = (new GitHub(repo.__auth)).getUser();
          user.getProfile()
          .catch(() => {
              cb({ok:false});
          })
          .then((response) => {
              if (response) {
                cb({ok: true, login:response.data.login});
              }
              else {
                cb({ok: false});
              }
              return repo.getDetails();
          })
          .then((data) => {
          });
          break;
      case "getContents":
          getContents(repo, "heads/"+params.ref, params.path).then((commit) => {
            cb({ok:true, text:`//${JSON.stringify({sha: commit.sha})}\n` + commit.text});
          });
          break;
      case "merge":
          repo.compareBranches(params.base, params.head)
          .then((response) => {
            if (response.data.behind_by > 0) {
              Promise.all([
                getContents(repo, "heads/"+params.base, params.path),
                getContents(repo, response.data.merge_base_commit.sha, params.path),
                getContents(repo, "heads/"+params.head, params.path)
              ]).then( commits => {
                const baseSHA = commits[0].sha;
                const headSHA = commits[2].sha;
                var diff = diff3.merge.apply(this, commits.map(e => e.text.split('\n')));
                if (diff.conflict) {
                  cb({ok:false, reason:"conflict", 
                    conflict:`//${JSON.stringify({sha:headSHA, base:baseSHA})}\n`+diff.result.join('\n')});
                }
                else {
                  if (response.data.ahead_by > 0) {
                    const message = `Merge ${params.base} into ${params.head}`;
                    commit(params.head, headSHA, message, diff.result.join('\n'), repo, params.path, baseSHA)
                    .then(() => {cb({ok:true});});
                  }
                  else {
                    repo.updateHead("heads/"+params.head, baseSHA)
                    .then(() => {cb({ok:true});});
                  }
                }
              });
            }
            else {
              cb({ok:false, reason:"cannot_merge"});
            }
          });
          break;
      case "commit":
          commit(params.branch, params.localSHA, params.message, params.text,
            repo, params.path, params.base)
          .then(cb, cb);
          break;
   }
}

function commit(branch, localSHA, message, text, repo, path, base) {
  return new Promise((resolve, reject) => {
      var headSHA;
      var commitHead = {};
      var blobSHA;
      var treeSHA;
      var newCommitSHA;
      repo.getRef("heads/"+branch).then((ref) => {
          headSHA=ref.data.object.sha;
          return repo.getCommit(headSHA);})
      .then((response) => {
          const body = response.data;
          commitHead.sha = body.sha;
          if (localSHA != commitHead.sha) {
               reject({ok: false, reason: "oldsha"});
          }
          else {
            commitHead.tree = body.tree;
            repo.createBlob(text).then((blobData) => {
                blobSHA = blobData.data.sha;
                return repo.getTree(commitHead.tree.sha);})
            .then((response) => {
                treeSHA = response.data.sha;
                return repo.createTree([{path:path, mode:"100644", type:"blob",
                     sha:blobSHA}], treeSHA);})
            .then((newTreeData) => {
                 return repo._request('POST', `/repos/${repo.__fullname}/git/commits`, 
                  {tree: newTreeData.data.sha, message,
                  parents: base? [commitHead.sha, base] : [commitHead.sha] })
                  .then((response) => {
                    repo.__currentTree.sha = response.data.sha; // Update latest commit
                    return response;
                  });
             })
            .then((commitData) => {
                newCommitSHA = commitData.data.sha;
                return repo.updateHead("heads/"+branch, newCommitSHA);})
            .then(() => {resolve({ok: true, newCommitSHA});});
          } // assumes UTF-8
      });
  });
}

function getContents(repo, ref, path) {
  return new Promise((resolve, reject) => {
    var refPromise;
    if (ref.startsWith("heads/")) {
      refPromise = repo.getRef(ref);
    }
    else {
      refPromise = repo.getSingleCommit(ref);
    }
    return refPromise.then((refData) => {
      const sha = refData.data.object ? refData.data.object.sha : refData.data.sha;
      repo._request('GET', `/repos/${repo.__fullname}/contents/${
        encodeURI(path)}?timestamp=${Date.now()}`, { ref })
      .then((response) => {
         const text = Base64.decode(response.data.content);
         resolve({text, sha});
      });
    });
  });
}
 
function listBranches(repo, noCache) {
  return new Promise((resolve, reject) => {
    let page = 1;
    let next = false;
    let branches = [];
    promiseDoWhilst(() => { 
      return new Promise((res, rej) => {
        var url = `/repos/${repo.__fullname}/branches?page=${page}`;
        if (noCache) url += `&timestamp=${Date.now()}`;
        repo._request('GET', url).then((response) => {
           next = response.headers.link.includes("next");
           page++;
           branches = branches.concat(response.data);
           console.log(branches);
           res();
        });
      });
    }, () => {
      return next;
    })
    .then(() => {resolve(branches); });
  });
}

function getAuth() {
  return new Promise((resolve, reject) => {
    const client_id = config.client_id;
    const redirect_uri = chrome.identity.getRedirectURL('/cb');
    const scope = "repo";
    const state = uuid.v4();
    const url = encodeURI("http://github.com/login/oauth/authorize?client_id="
        +client_id+"&redirect_uri="+redirect_uri+"&scope="+scope+"&state="+state);
    console.log(url);
    
    chrome.identity.launchWebAuthFlow({url: url, interactive:true}, (response) => {
      const paramRE = (name) => new RegExp(name+"=([^&]+)");
      if (paramRE("code").test(response) && paramRE("state").test(response)) {
         const code = response.match(paramRE("code"))[1];
         const respState = response.match(paramRE("state"))[1];
         if (state != respState) {
            console.error("State does not match; something's not right. Aborting.");
            reject({ok:false});
            return;
         }
         const parameters = {client_id: client_id,
		client_secret: config.client_secret,
               code, state};
         browserRequest({method:'POST', url:'https://github.com/login/oauth/access_token',
             json:parameters}, (err, response, body) => {
		console.log(err, response, body);
                if (err) console.error(err);
                console.log("using access token", body.access_token);
		chrome.storage.local.set({token: body.access_token});
		resolve({ok: true, token: body.access_token});
         });
      }
      else {
         console.error("Invalid response from github authorization", response);
         reject({ok:false});
      }
    });
  });
}
chrome.runtime.onInstalled.addListener(function(details) {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: {
                        urlMatches: 'zerorobotics\.mit\.edu\/ide\/.{10}[^\/]'
                    }
                })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});
