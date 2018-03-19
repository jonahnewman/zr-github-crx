# Zero Robotics GitHub Chrome extension _(zr-github-crx)_

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> A chrome extension that provides an interface for GitHub on the Zero Robotics IDE

This repo contains the source code for a chrome extension that will allow you to push code, perform merges, and view diffs from within the [Zero Robotics](http://zerorobotics.mit.edu) IDE.

## Table of Contents
- [Background](#background)
- [Install](#install)
   - [Get the source code](#get-the-source-code)
   - [Get NPM](#get-npm)
   - [Configure](#configure)
   - [Build the extension](#build-the-extension)
   - [Get an ID and a key](#get-an-id-and-a-key)
   - [Adding the extension on Windows and macOS](#adding-the-extension-on-windows-and-macos)
 - [Usage](#usage)
   - [For your team](#for-your-team)
      - [updating](#updating)
   - [Make a commit](#make-a-commit)
   - [Make a new branch](#make-a-new-branch)
   - [Merging](#merging)
   - [Comparing your current code to a branch](#comparing-your-current-code-to-a-branch)
   - [Simulating against another branch](#simulating-against-another-branch)
 - [Contribute](#contribute)
 - [License](#license)

## Background
#### Most Chrome extensions are available from the Chrome webstore, why do I have to build this from source?
Chrome extensions can't really keep secrets. That's a problem because in order to use GitHub's API, you need a Client Secret that should not be shared with users. In addition, using a published version of this extension would require trusting the publisher with your team's code, whereas the source-code of a self-built version can be audited.

## Install
Before you begin you need a [GitHub account](https://github.com/join) and a bash environment. On Windows, you can use [Git for Windows](https://git-scm.com/download/win).
### Get the source code
You will need to clone this repository:
```
git clone https://github.com/jonahweissman/zr-github-crx.git
```
### Get NPM
NPM (Node Package Manager) is essential for dealing with all the libraries in this project.
Installation instructions will vary by OS.
* Windows: http://blog.teamtreehouse.com/install-node-js-npm-windows
* Linux: http://blog.teamtreehouse.com/install-node-js-npm-linux

Once you have NPM, you will need to install all the packages that the extension uses:
```
cd zr-github-crx # or wherever you cloned this repository
npm install
```
Now, you must install the task-runner Gulp:
```
npm install --global gulp-cli
```
### Configure
#### Make your own config.json file
1. Copy the template
   ```
   cp config-template.json config.json
   ```
2. Set up the repo field

   * [Create a Repository](https://github.com/new) on GithHub. For now, you can leave
     it as public, but you should make it private before you start storing your team's
     code there. You can skip making a `README` or `.gitignore`.
   * Download an empty ZR document to be the initial commit of your repo.
   * Create a local version of your repository.
     ```shell
     cd ~
     git init THE_NAME_OF_YOUR_REPO
     cd THE_NAME_OF_YOUR_REPO
     mv ~/Downloads/project.cpp . # or whatever the path to your project.cpp is
     git add project.cpp
     git commit -m "Initial commit"
     git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
     git push -u origin master
     ```
   * Now that you have a repo, let's enter the relevant information into `config.json` in your `zr-github-crx` repo.
     1. "user" is your username
     2. "name" is the name of your repository
     3. "file" is `project.cpp`, but, of course, if you renamed project.cpp, you should use the new name.
3. Set up a GitHub OAuth2 application
   * Go to the [developer applications](https://github.com/settings/developers) page. Click "New OAuth App."
     Give it a name. Give it a homepage URL (this can be anything; it's just presented to users when they authorize
     your app.) For now, put any valid URL in the callback field, we'll change it later.
   * Copy the Client ID and the Client Secret into the appropriate fields of `config.json`
#### Make your own manifest.json file
1. Copy the example
   ```
   cp manifest-example.json manifest.json
   ```
2. The manifest contains a lot options for customization, but you don't need to change anything right now. 

### Build the extension
Run the command
```
gulp
```
You should now have a folder called `build`.

### Get an ID and a key
1. In Chrome, got to chrome://extensions or click the menu in the upper right > More tools > Extensions.
2. Make sure "Developer mode" is checked, then click "Pack extension..."
3. For "Extension root directory" browse to `zr-github-crx/build`. Leave the "Private key file" field empty.
4. Click "Pack Extension." Drag and drop your shiny new `build.crx` onto your Extensions page.
5. Find "ZR Github" in the list of extensions. Below `details` it should say `ID: *a bunch of letters*`. Copy the ID. 
6. Go back to your [OAuth Applicatons](https://github.com/settings/developers) page on GitHub.
   Change the "Authorization callback URL" to `https://YOUR_EXTENSION_ID.chromiumapp.org/cb`. Click "Update application."

### Adding the extension on Windows and macOS
On Windows and macOS, Chrome will disable the extension by default. The only workaround is to load the extension unpacked. 
Normally, when an extension is loaded unpacked, Chrome will give it a random ID. However, this extension relies on
a static key for the GitHub OAuth callback, so we must specify the key field in `manifest.json`.
[This Chrome article explains](https://developer.chrome.com/apps/manifest/key):
> To get a suitable key value, first install your extension from a .crx file (you may need to upload your extension or package it manually). Then, in your user data directory, look in the file Default/Extensions/<extensionId>/<versionString>/manifest.json. You will see the key value filled in there.

Add the key value to `manifest.json`, then click "Load unpacked extension..." in the chrome://extensions developer options and select your `build` folder.

## Usage

### For your team
Once you have a `crx` (or build folder for Windows and macOS users), you can distribute it to members of your team without each of them having to go through this same process.
#### Updating
If a new version is released, you can update your extension with the following code:
```shell
cd zr-github-crx # or wherever your copy of this repo is
git pull
# you may need to update your manifest.json based on changes in manifest-example.json
npm install
gulp
```
Your `build` folder should now have the updated source. You can repackage the extension from `chrome://extensions`.

### Make a commit
1. It is only enabled on IDE pages, so create a new project. The extension icon will change from light gray to dark gray when it recognizes you are on an IDE page.
2. Click the extension icon. Click "Log in." You will have to provide your GitHub credentials and authorize your application to access your repos.
3. The extension will only allow you to commit to a branch if the document you're commiting has the most recent SHA in a comment at the top of the document. Select `master` from the branch drop-down menu, then "fetch and overwrite" in order to get the latest code.
4. You should now see the contents of the empty document you downloaded and committed during the installation process. Add or delete something in the document, then write a commit message and click "commit and push."
5. Awesome! Go to your repo on GitHub and check to make sure the commit went through.

### Make a new branch
1. Click on the Active Branch drop-down menu and type `test`. (Branch names can be any text that does not include a space.)
2. Click 'New branch "test"'. Then select `master` as the "from existing branch" option.
3. Click "create"
4. Now you have a new branch that points to the same commit. Make a commit just for fun. If `test` doesn't show up in the branch list, click the refresh icon.

### Merging
Let's say some time has passed, and `master` and `test` have diverged. You want to integrate the work you've done on `test` into `master`.
1. Switch your active branch to `master`. Fetch the latest commit.
2. Click "merge," select `test` for "merge with" and then click "start merge."
3. If the changes you made in `master` and `test` related to different parts of the code, it's possible the merge will happen with no issue.
Otherwise, the extension will present you with merge conflicts. Once you have resolved the conflicts, you can click "commit and push".

### Comparing your current code to a branch
1. Click "diff", select a branch, and click "start diff".
2. Now you can see the differences between what was in your editor and the branch you selected.
3. When you're done, click "stop diff"

### Simulating against another branch
You may find yourself wanting to run a simulation against code on another branch. Here's how.
1. Open the extension and click "advanced."
2. It should say "Branch drop-down in simulation dialog is off." Click "turn on." It will remain enabled until you turn it off.
3. Refresh the page.
4. Go to the simulation dialog. There should be a new drop-down next to "Select standard player." Click on it and select a branch.
5. Simulate

## Contribute
Feel free to ask questions in [the issues tab](https://github.com/jonahweissman/zr-github-crx/issues)!

Definitely accepting pull requests! For more info, check out the
[contributing guide](.github/CONTRIBUTING.md)

Make sure to follow the [code of conduct](.github/CODE_OF_CONDUCT.md) (just be respectful of others).
## License
[MIT](LICENSE) © Jonah Weissman

