function showDiff (head) {
  console.log('hello from diff!')
  includeExtensionFile('ace-diff/ace-diff.js')
  includeExtensionFile('ace-diff/diff_match_patch.js')
  includeExtensionFile('ace-diff/jquery.js')
  if (!document.getElementById('ace-diff/styles.css')) {
    var style = document.createElement('link')
    style.rel = 'stylesheet'
    style.href = window.chrome.extension.getURL('ace-diff/styles.css')
    style.id = 'ace-diff/styles.css';
    (document.head || document.documentElement).appendChild(style)
  }

  var codebox = document.getElementById('codebox')

  if (!document.getElementById('flex-container')) {
    var flexContainer = document.createElement('div')
    flexContainer.id = 'flex-container'
    var leftEditor = document.createElement('div')
    leftEditor.id = 'editor1'
    leftEditor.style.height = '100%'
    var gutter = document.createElement('div')
    gutter.id = 'gutter'
    var rightEditor = document.createElement('div')
    rightEditor.id = 'editor2'
    rightEditor.style.height = '100%'
    flexContainer.appendChild(leftEditor)
    flexContainer.appendChild(gutter)
    flexContainer.appendChild(rightEditor)
    codebox.parentNode.appendChild(flexContainer)
    codebox.style.display = 'none'
  }

  var scrubbedHead = head.replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
  var s = document.createElement('script')
  /**
   * Injected into ZR IDE page.
   */
  s.textContent = `
    setTimeout(function() {
      console.log("injected script is running");
      var oldEditor = document.getElementById('codebox').env.editor;
      var aceDiffer = new AceDiff({
        mode: "ace/mode/c_cpp",
        left: {
            id: "editor1",
            content: oldEditor.getValue(),
            copyLinkEnabled: false,
            editable: false
        },
        right: {
            id: "editor2",
            content: "${scrubbedHead}",
            copyLinkEnabled: false,
            editable: false,
        },
        classes: {
            gutterID: "gutter"
        }
      });
      
      var left = aceDiffer.getEditors().left;
      left.on("change", function() {
        oldEditor.setValue(left.getValue());
      });
      document.addEventListener("ZRGITHUB_extension_communication_stopdiff", function(e) {
        aceDiffer.destroy();
      });
    }, 100);
  `
  s.onload = function () {
    this.remove()
  }
  console.log('script tag', s)

  window.chrome.runtime.connect()
  window.chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('received message')
    if (request.to === 'diff') {
      console.log('content_script: stop diffing!!1!')
      document.dispatchEvent(new window.CustomEvent('ZRGITHUB_extension_communication_stopdiff'), {})
      codebox.style.display = 'inherit'
      setTimeout(() => { flexContainer.remove() }, 50)
    }
  });
  (document.head || document.documentElement).appendChild(s)

  window.addEventListener('beforeunload', () => {
    window.chrome.storage.local.set({diffing: false})
  })
}

function includeExtensionFile (path) {
  if (!document.getElementById(path)) {
    var script = document.createElement('script')
    script.src = window.chrome.extension.getURL(path)
    script.id = path;
    (document.head || document.documentElement).appendChild(script)
  }
}

export default showDiff
export {includeExtensionFile}
