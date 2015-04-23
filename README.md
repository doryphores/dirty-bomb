# Dirty Bomb

A custom markdown editor built on [Electron](https://github.com/atom/electron) to manage a website's content.

## Node requirements

I recommend using [`nvm`](https://github.com/creationix/nvm) to manage your node environment.

You can install it from brew on OSX:

```bash
$ brew install nvm
```

For other platforms, follow [these instructions]((https://github.com/creationix/nvm).

If you have nvm installed, simply run the following after cloning the repository:

```bash
$ nvm install
```

## Install dependencies

Run the following to install Electron and dependencies. The script ensures native modules are built for Electron.

```bash
$ ./scripts/install
```

## Starting the app

THe previous step should have installed the Electron binary so you can start the app by running the `npm start` script.

```bash
$ npm start
```
