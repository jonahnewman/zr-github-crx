# About
## What is this?
This repo contains the source code for a chrome extension that will allow you to push code to GitHub from the [Zero Robotics](http://zerorobotics.mit.edu) IDE. In addition to making commits, branch creation and split-screen editor merges are features.
## Why not just publish this on the Chrome Webstore?
Chrome extensions can't really keep secrets. That's a problem because in order to use GitHub's API, you need a Client Secret that should not be shared with users. In addition, using a published version of this extension would require trusting the publisher with your team's code, whereas the source-code of a self-built version can be audited.

# Installation
Before you begin you need a [GitHub account](https://github.com/join) and a bash environment. On Windows, you can use [Git for Windows](https://git-scm.com/download/win).
# Get the source code
You will need to clone this repository:
```
git clone https://github.com/jonahweissman/zr-github-crx.git
```
# Get NPM
NPM (Node Package Manager) is essential for dealing with all the libraries in this project. Installation instructions will vary by OS.
* Windows: http://blog.teamtreehouse.com/install-node-js-npm-windows
* Linux: http://blog.teamtreehouse.com/install-node-js-npm-linux
