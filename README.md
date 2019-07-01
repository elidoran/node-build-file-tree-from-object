# build-file-tree-from-object
[![Build Status](https://travis-ci.org/elidoran/node-dirator.svg?branch=master)](https://travis-ci.org/elidoran/node-build-file-tree-from-object)
[![npm version](https://badge.fury.io/js/dirator.svg)](http://badge.fury.io/js/build-file-tree-from-object)
[![Coverage Status](https://coveralls.io/repos/github/elidoran/node-build-file-tree-from-object/badge.svg?branch=master)](https://coveralls.io/github/elidoran/node-build-file-tree-from-object?branch=master)

Asynchronously build directories and write files from an object.

## Install

```
npm install build-file-tree-from-object
```


## Usage

```javascript
const build = require('build-file-tree-from-object')

const tree = {
  'some.file': 'string value means:\n  file content\n',
  'file.dat' : Buffer.from('Buffer value also means:\n  file content\n'),
  'some_dir' : { // Object value means directory.
    'sub.file': 'another file\ninside the new dir\n',
    'dirdir': {
      'itty.bitty.file': 'itty bitty'
    },
    'dir2': { // can have as many directories in a directory as you want...
      // even if there's no keys inside `dir2` will still be created.
    },
    'empty.file': '', // use empty string to get an empty file.
  },
}

// build the tree starting at `process.cwd()`:
build({
  tree,
  done: error => { // callback required.
    // called when all async processes are completed. tree built.
    // called when mkdir() errors (other than 'EEXIST').
    // called with error from writeFile() or invalid value
    // when there's no error callback (which quits the processing).
  },
})

// specify where to build the tree by providing `root`:
build({
  tree,
  root: 'some/dir', // optional; defaults to process.cwd()
  done: error => { }
})

// if you want writeFile() errors and invalid `value` errors
// reported without quitting the processing,
// then provide an `error` callback:
build({
  tree,
  error: error => { // optional.
    // receives:
    // 1. invalid value errors
    // 2. writeFile() errors

    // Does NOT receive mkdir() errors. those go to done().
  },
  done: error => { }
})

// NOTE: errors from mkdir() always cause it to quit processing.
```


## [MIT License](LICENSE)
