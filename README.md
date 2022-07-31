# GitHub Proxy

Basic proxy for GitHub.

Proxy for GitHub that adds `Content-Type` and `Access-Control-Allow-Origin: *` headers.

## Usage

Just add the path of the file you want to proxy to `https://githubproxy.samuelcolvin.workers.dev`.


E.g. if you want to view the README of the repository `https://github.com/samuelcolvin/githubproxy/blob/main/README.md`,
you'd go to:

``
https://githubproxy.samuelcolvin.workers.dev/samuelcolvin/githubproxy/blob/main/README.md
``

## Works for (at least)

* repo files from GitHub
* repo archive zips from GitHub
* files from gists - click "Raw" on the file in the gist, and use the path from there
