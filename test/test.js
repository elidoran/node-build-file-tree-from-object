'use strict'

const tap = require('tap')
const test = tap.test
const { join } = require('path')
const { mkdir, stat, readFile, writeFile } = require('fs')
const rmrf = require('rimraf')
const run = require('taskling')

const build = require('../index.js')

const testDir = 'test'
const testspaceDir = join(testDir, 'space')


tap.throws(build,
  { message: '`options` object argument required' }, 'no options argument throws Error')

tap.throws(build.bind(this, {}),
  { message: '`done` callback required' }, 'no `done` callback throws Error')

tap.throws(build.bind(this, { done: () => {}, root: 12345 }),
  { message: 'optional `root` must be a string' }, 'root option not a string throws Error')

tap.throws(build.bind(this, { done: () => {}, error: 'not a function' }),
  { message: 'optional `error` must be a function' }, 'error option not a function throws Error')


test('file content cant be Number; quit with error', t => {
  build({
    root: testspaceDir,
    tree: {
      'dir1': {
        'dir2': {
          'some.file': 'testing\n123\n',
        },
        'bad.content': 123,
      },
    },
    done: error => {
      t.ok(error, 'should error')
      t.equal(error && error.message,
        'value for key[bad.content] must be either string or object', 'error should explain with key')
      t.end()
    }
  })
})

test('test mkdir error', t => {

  build({
    root: testspaceDir,
    tree: {
      'some_dir': {
        'trigger.mkdir.error': {},
        'not_reached': 'due to mkdir error',
      },
    },
    mkdir: (path, callback) => {
      if (path.endsWith('trigger.mkdir.error')) {
        const error = new Error('mkdir fake error')
        error.code = 'EFAKE'
        callback(error)
      }

      else {
        callback()
      }
    },
    writeFile: (path, content, callback) => {
      callback()
    },
    done: error => {
      t.ok(error, 'should error')
      t.equal(error && error.message, 'mkdir fake error', 'should receive mkdir fake error')
      t.end()
    }
  })
})


test('real tree', t => {

  const string = 'testing\n123'
  let errorCount = 0

  build({
    root: testspaceDir,
    tree: {
      'empty_dir': {},
      'some_dir': {
        'lower_dir': {
          'bottom_dir': {
            'buffer.file': Buffer.from(string),
          },
          'lower.file': string,
          'lower.file2': string,
          'trigger.writeFile.error': string,
        },
        'bad.file': 123,
        'sub.file': string,
        'sub.file2': string,
      },
      // 'trigger.mkdir.error': {},
      'some.file': string,
    },
    writeFile: (path, content, callback) => {
      if (path.endsWith('trigger.writeFile.error')) {
        const error = new Error('writeFile fake error')
        error.code = 'EFAKE'
        callback(error)
      }

      else {
        writeFile(path, content, callback)
      }
    },
    error: error => {
      switch(errorCount) {
        case 0:
          t.equal(error && error.message,
            'value for key[bad.file] must be either string or object', 'error should explain with key')
        break

        case 1:
          t.equal(error && error.message, 'writeFile fake error', 'should receive writeFile fake error')
        break

        default:
          t.threw(error)
      }

      errorCount++
    },
    done: error => {
      t.notOk(error, 'shouldnt error')

      run({
        tester: t,
        string,
      }, [
        verifyDir(join(testspaceDir, 'empty_dir')),
        verifyDir(join(testspaceDir, 'some_dir')),
        verifyDir(join(testspaceDir, 'some_dir', 'lower_dir')),
        verifyDir(join(testspaceDir, 'some_dir', 'lower_dir', 'bottom_dir')),

        verifyFile(join(testspaceDir, 'some.file')),
        verifyFile(join(testspaceDir, 'some_dir', 'sub.file')),
        verifyFile(join(testspaceDir, 'some_dir', 'sub.file2')),
        verifyFile(join(testspaceDir, 'some_dir', 'lower_dir', 'lower.file')),
        verifyFile(join(testspaceDir, 'some_dir', 'lower_dir', 'lower.file2')),
      ], (error) => {
        if (error) {
          t.threw(error)
        }

        t.end()
      })
    }
  })
})


function verifyDir(path) {
  return (next, stuff) => {
    stat(path, (error, stats) => {
      stuff.tester.notOk(error, 'shouldnt error')
      stuff.tester.ok(stats.isDirectory(), 'should exist: ' + path)
      next()
    })
  }
}

function verifyFile(path) {
  return (next, stuff) => {
    readFile(path, 'utf8', (error, content) => {
      stuff.tester.notOk(error, 'shouldnt error')
      stuff.tester.equal(content, stuff.string, 'file content should match: ' + path)
      next()
    })
  }
}
