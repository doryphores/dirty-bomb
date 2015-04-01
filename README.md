## Requirements:

### OSX

- nvm `brew install nvm`

## Install dependencies

The following is required for building native modules for Atom Shell

```
$ export npm_config_disturl=https://atom.io/download/atom-shell
$ export npm_config_target=0.21.2
$ HOME=~/.atom-shell-gyp npm install
```
