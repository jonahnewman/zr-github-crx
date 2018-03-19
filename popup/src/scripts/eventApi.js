import config from '../../../config.json'

function query (action, params) {
  return new Promise((resolve, reject) => {
    var repo = config.repo
    window.chrome.storage.local.get('repo', (data) => {
      if (data.repo) {
        repo = data.repo
      }
      window.chrome.runtime.sendMessage({to: 'bg',
        target: {repo: repo, action},
        params},
      (response) => {
        if (response && response.ok) {
          resolve(response)
        } else {
          reject(response)
        }
      })
    })
  })
}

export default query
