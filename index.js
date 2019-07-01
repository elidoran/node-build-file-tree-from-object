'use strict'

const { join } = require('path')
const { mkdir, writeFile } = require('fs')

const run = require('taskling')

module.exports = function buildFileTree(arg1) {

  if ('object' !== typeof arg1) {
    throw new Error('`options` object argument required')
  }

  if ('function' !== typeof arg1.done) {
    throw new Error('`done` callback required')
  }

  // the two checks below are for optional values.

  if (arg1.hasOwnProperty('root') && 'string' !== typeof arg1.root) {
    throw new Error('optional `root` must be a string')
  }

  if (arg1.hasOwnProperty('error') && 'function' !== typeof arg1.error) {
    throw new TypeError('optional `error` must be a function')
  }

  // combine defaults and user specified values into `options`.
  const options = Object.assign(
    { // defaults
      root: process.cwd(),
      tree: {},
      error: null, // by default we don't use an individual error callback.
      mkdir,     // uses fs module's by default.
      writeFile, // uses fs module's by default.
    },

    arg1 // user specified values override defaults (even nulls!)
  )

  // build() is going to fill this with functions for taskling to run.
  const tasks = []

  // build may return an error which prevented building all tasks.
  const error = build(options, options.root, options.tree, tasks)

  // must call callback in nextTick so we always adhere to async style.
  if (error) {
    process.nextTick(options.done, error)
  }

  // finally, taskling runs all the tasks to build the tree.
  else {
    run(options, tasks, options.done)
  }
}

function build(options, dir, tree, tasks) {

  // process each top-level key in `tree`.
  // Object.keys(tree).forEach(key => {
  for (const key in tree) {

    const value = tree[key]

    // we write buffer/string values to a file named by the `key`.
    if (Buffer.isBuffer(value) || 'string' === typeof value) {

      // add a task function which will make the writeFile() call.
      tasks.push(buildWriteFileTask(dir, key, value))
    }

    // for object values we do two things:
    //  1. create a directory with its `key` as the name.
    //  2. we recurse into build() for it.
    else if ('object' === typeof value && !Array.isArray(value)) {

      const nextDir = join(dir, key)

      // add a task function which makes the mkdir() call.
      tasks.push(buildMkdirTask(nextDir))

      // build() may return an error when trying to build tasks.
      const error = build(options, nextDir, value, tasks)
      if (error) {
        return error
      }
    }

    else { // invalid `value` type
      const error = new Error('value for key[' + key + '] must be either string or object')

      if (options.error) {
        options.error(error)
      }

      else {
        tasks.length = 0
        return error
      }
    }
  }
}

function buildWriteFileTask(dir, key, value) {
  return function(next, options) {
    options.writeFile(join(dir, key), value, error => {

      // if there's an error and we have a specific callback for that,
      // then use it. it allows us to proceed instead of quitting.
      if (error && options.error) {
        options.error(error)
        next()
      }

      // NOTE: if there's no error then we're doing next(undefined).
      else {
        next(error)
      }
    })
  }
}

function buildMkdirTask(path) {
  return (next, options) => { // eslint-disable-line no-unused-vars
    options.mkdir(path, (error) => {

      // if the error is it already exists then we don't care.
      // if it's a different kind of error then we quit.
      // can't continue if we can't create the directory.
      if (error && error.code !== 'EEXIST') {
        next(error)
      }

      else { // NOTE: there's never an error we care about if we get here.
        next()
      }
    })
  }
}
