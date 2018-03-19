function getDoc (cb) {
  console.log('getDoc content script is running')
  var s = document.createElement('script')
  /**
   * Injected into ZR IDE page.
   * Then sends it back to content script in a custom event
   */
  s.textContent = `
    console.log("injected script is running");
    var aceEditSession = document.querySelector('[ui-ace="aceOptions"]')
       .env.editor;
    console.log(aceEditSession);
    var doc = aceEditSession.getValue();
    document.dispatchEvent(new CustomEvent('ZRGITHUB_extension_communication_get', {
      ok: true,
      detail: doc
    }));
    console.log("sent event", doc);
  `
  s.onload = function () {
    this.remove()
  }
  console.log('script tag', s)

  document.addEventListener('ZRGITHUB_extension_communication_get', function (e) {
    console.log('received', e.detail)
    window.chrome.runtime.sendMessage({doc: e.detail}, function (response) {
      console.log(response)
    })
  });

  (document.head || document.documentElement).appendChild(s)
}
export default getDoc
