import setDocInjected from "./setDoc.js";
/**
 * This script injects another script into the page to access AngularJS land.
 */
function getDoc() {
  return new Promise((resolve, reject) => {
    chrome.tabs.executeScript({code:`
      var s = document.createElement('script');
      /**
       * Injected into ZR IDE page.
       * Uses download functionality to get file as a string
       * Then sends it back to content script in a custom event
       */
      s.innerText = \`
        var angularApp = angular.element(document.querySelectorAll('[ng-controller="IdeController"]'));
        var doc = angularApp.injector().get('realtime').getDocAsString(angularApp.scope().model.getRoot(), false)[0];
        console.log(doc);
        document.dispatchEvent(new CustomEvent('ZRGITHUB_extension_communication', {
          detail: doc
        }));
      \`;
      s.onload = function() {
          this.remove();
      };
      (document.head || document.documentElement).appendChild(s);
      
      document.addEventListener("ZRGITHUB_extension_communication", function(e) {
        chrome.runtime.sendMessage({doc: e.detail}, function(response) {
          console.log(response);
        });
      });
    `});
    
    var port = chrome.runtime.connect();
    
    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        const cleanDoc = request.doc.replace(/\n\/\/End page.*\n|\/\/Begin page .*\n/g, "");
        resolve({text: cleanDoc.replace(/^\/\/.*sha.*\n/, ""), 
            head: JSON.parse(cleanDoc.match(/^\/\/(.*)/)[1])});
        sendResponse({ok: true});
      });
  });
}

function setDoc(doc) {
  return new Promise((resolve, reject) => {
    console.log(""+setDocInjected);
    chrome.tabs.executeScript({code:""+setDocInjected+`console.log("tet");setDoc(\`${doc}\`)`});
    
    var port = chrome.runtime.connect();
    
    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        resolve(request.doc);
        sendResponse({ok: true});
      });
  });
}

export default getDoc;
export { setDoc };
