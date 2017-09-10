import uuid from 'uuid';
import promisify from 'es6-promisify';
import browserRequest from 'browser-request';
import GitHub from 'github-api';
import { Base64 } from 'js-base64';
import config from '../../config.json';

const request = promisify(browserRequest);
var gh;

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (sender.tab || request.to!="bg" || !request.target) {
      console.log("This message is not for me");
      return;
    }
    console.log("received message", request);
    if (gh) {
       handleRequest(request.target, request.params, sendResponse);
    }
    else {
        getAuth(() => {
             handleRequest(request.target, request.params, sendResponse);
        });
    }
   return true;
});

function handleRequest(target, params, cb) {
   var repo;
   if (target.repo) {
      if (gh && gh.__auth && gh.__auth.token) { 
         repo = gh.getRepo(target.repo.user, target.repo.name);
      }
      else{
         cb({ok: false});
      }
   }
   console.log("performing action", target.action);
   switch(target.action) {
      case "login":
         getAuth(cb);
         break;
      case "listBranches":
          repo.listBranches().then((branches) => {cb(branches.data);});
          break;
      case "createBranch":
          const oldB = params.oldBranch;
          const newB = params.newBranch;
          repo.createBranch(oldB?oldB:newB, oldB?newB:null).then((commitData) => {
            cb({ok: true, branch:newB});
          });
          break;
      case "deleteRef":
          repo.deleteRef("heads/"+params.branch).then((response) => cb({ok: true}));
          break;
      case "createHook":
          //const options = { name:"web", active:true, events:params.events, config:{
          //repo.createHook(options).then((response) => {
          //    console.log(
          //});
          break;
      case "getContents":
          repo.getRef("heads/"+params.ref).then((ref) => {
             const sha = ref.data.object.sha;
             repo.getContents(params.ref, params.path).then((response) => {
                const text = Base64.decode(response.data.content);
                console.log("got text", text);
                cb(`//${JSON.stringify({sha})}\n` + text);
             });
          });
          break;
      case "merge":
         repo._request("POST", repo.__apiBase+"/repos/"+repo.__fullname+"/merges",
             {base:params.base, head:params.head})
         .then((resp) => {
             cb({ok: true, message:resp.data.commit.message+" successful"});
           }, (err) => {
             console.log(err);
             if (err.message && err.message.startsWith("409")) {
             cb({ok: false, reason: "conflict"});
           }
         });
         break;
      case "commit":
          var headSHA;
          var commitHead = {};
          var blobSHA;
          var treeSHA;
          repo.getRef("heads/"+params.branch).then((ref) => {
              headSHA=ref.data.object.sha;
              return request(ref.data.object.url);})
          .then((response) => {
              const body = JSON.parse(response.body);
              commitHead.sha = body.sha;
              if (params.localSHA != commitHead.sha) {
                   cb({ok: false, reason: "oldsha"});
              }
              else {
                commitHead.tree = body.tree;
                repo.createBlob(params.text).then((blobData) => {
                    blobSHA = blobData.data.sha;
                    return request(commitHead.tree.url);})
                .then((response) => {
                    treeSHA = JSON.parse(response.body).sha;
                    return repo.createTree([{path:params.path, mode:"100644", type:"blob",
                         sha:blobSHA}], treeSHA);})
                .then((newTreeData) => {
                    return repo.commit(commitHead.sha, newTreeData.data.sha, params.message);})
                .then((commitData) => {
                    return repo.updateHead("heads/"+params.branch, commitData.data.sha);})
                .then(() => {cb({ok: true});});
              } // assumes UTF-8
          });
          break;
   }
}
         
function getAuth(cb) {
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
            cb({ok:false});
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
		gh = new GitHub({token: body.access_token});
		console.log(gh.getUser());
		cb({ok: true});
         });
      }
      else {
         console.error("Invalid response from github authorization", response);
         cb({ok:false});
      }
    });
}
chrome.runtime.onInstalled.addListener(function(details) {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: {
                        hostEquals: 'zerorobotics.mit.edu',
                        pathPrefix: '/ide'
                    }
                })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});
