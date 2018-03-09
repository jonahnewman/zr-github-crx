import setDocInjected from './setDocInjected.js'
import getDocInjected from './getDocInjected.js'
/**
 * Returns a promise to get the value of the document
 */
function getDoc () {
  return new Promise((resolve, reject) => {
    window.chrome.tabs.executeScript({code: getDocInjected + 'getDoc();'})
    console.log('waiting on injected script')
    window.chrome.runtime.connect()

    window.chrome.runtime.onMessage.addListener(
      function (request, sender, sendResponse) {
        console.log('received doc from injected script', request.doc)
        var cleanDoc = request.doc
        var headMatch = cleanDoc.match(/^\/\/(.*)/)
        try {
          var head = JSON.parse(headMatch[1]) // [1] is the capture group
          resolve({text: cleanDoc.replace(/^\/\/.*sha.*\n/, ''), head})
        } catch (e) {
          reject(e)
        }
        sendResponse({ok: true})
      })
  })
}

/**
 * Sets the value of the document
 */
function setDoc (doc) {
  return new Promise((resolve, reject) => {
    const scrubbedDoc = doc.replace(/`/g, '\\`')
    console.log(scrubbedDoc)
    window.chrome.tabs.executeScript({code: setDocInjected + `setDoc(\`${scrubbedDoc}\`)`})

    window.chrome.runtime.connect()

    window.chrome.runtime.onMessage.addListener(
      function (request, sender, sendResponse) {
        resolve(request.doc)
        sendResponse({ok: true})
      })
  })
}

export { getDoc }
export { setDoc }
