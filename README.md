## Requirements:

### OSX

- nvm `brew install nvm`

### Windows

- [git](http://git-scm.com/download/win)
- [nodejs](http://nodejs.org/)
- [python](https://www.python.org/downloads/windows/) During installation, ensure you add python executable to PATH
- [VS express](http://www.visualstudio.com/downloads/download-visual-studio-vs#d-express-windows-desktop) (Microsoft account required)

## Install dependencies

Install `nodegit` native module:

```
$ export npm_config_disturl=https://atom.io/download/atom-shell
$ export npm_config_target=0.21.2
$ HOME=~/.atom-shell-gyp npm install https://github.com/nodegit/nodegit/tarball/master
$ npm prune
```

Install other packages

```
$ apm install .
```

**Windows**: run the above in git bash
