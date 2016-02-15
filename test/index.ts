// 
// PLEASE DO NOT MODIFY / DELETE UNLESS YOU KNOW WHAT YOU ARE DOING  
//
// This file is providing the test runner to use when running extension tests.
// By default the test runner in use is Mocha based.
// 
// You can provide your own test runner if you want to override it by exporting
// a function run(testRoot: string, clb: (error:Error) => void) that the extension
// host can call to run the tests. The test runner is expected to use console.log
// to report the results back to the caller. When the tests are finished, return
// a possible error to the callback or null if none.

var testRunner = require('vscode/lib/testrunner');

// You can directly control Mocha options by uncommenting the following lines
// See https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically#set-options for more info
testRunner.configure({
  ui: 'tdd', 		// the TDD UI is being used in extension.test.ts (suite, test, etc.)
  useColors: true, // colored output from test results
  timeout: 600000
});

//module.exports = testRunner;

import * as path from 'path';
import * as fs from 'fs';
var glob = require('glob');
var rimraf = require('rimraf');

function run(testRoot: string, clb: (error:Error) => void) {
  // Ugly trick to copy Vagrantfiles in the out/test directory.
  var srcTestRoot = path.join(path.dirname(path.dirname(testRoot)), 'test');
  var dataDir = path.join(testRoot, 'data');
  rimraf.sync(dataDir);
  fs.mkdirSync(dataDir);
  glob.sync(path.join(srcTestRoot, 'data', '*', 'Vagrantfile')).forEach((file) => {
    var machineDir = path.dirname(file);
    var dir = path.join(testRoot, path.relative(srcTestRoot, machineDir));
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'Vagrantfile'), fs.readFileSync(file));
    fs.writeFileSync(path.join(dir, 'status.json'), fs.readFileSync(path.join(machineDir, 'status.json')));
  });
  testRunner.run(testRoot, clb);
}
exports.run = run
