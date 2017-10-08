function query(target, params) {
  return new Promise( (resolve, reject) => {
    chrome.runtime.sendMessage({to:"bg", target, params},
      (response) => {
        if(response.ok) {
          resolve(response);
        }
        else {
          reject(response && response.reason ? response.reason : response);
        }
    });
  });
}

export default query;
