function setDoc(doc) {
  console.log("setDoc content script is running");
  console.log(doc);
  var s = document.createElement('script');
  /**
   * Injected into ZR IDE page.
   * Then sends it back to content script in a custom event
   */
  s.textContent = `
    console.log("injected script is running");
    var aceEditSession = document.querySelector('[ui-ace="aceOptions"]')
       .env.editor;
    console.log(aceEditSession, \`${doc}\`);
    aceEditSession.setValue(\`${doc}\`);
    document.dispatchEvent(new CustomEvent('ZRGITHUB_extension_communication_set', {
      ok: true
    }));
  `;
  s.onload = function() {
  
      this.remove();
  };
  console.log("script tag", s);
  
  document.addEventListener("ZRGITHUB_extension_communication_set", function(e) {
    chrome.runtime.sendMessage({doc: e.detail}, function(response) {
      console.log(response);
    });
  });
  
  (document.head || document.documentElement).appendChild(s);

}
export default setDoc;
