// 
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as myExtension from '../src/extension';
import * as vagrant from '../src/vagrant';
import * as path from 'path';
import * as fs from 'fs';
var singleMachineDir = path.join(__dirname, 'data', 'single-machine');
var multiMachineDir = path.join(__dirname, 'data', 'multi-machine');

suite("Vagrant", () => {
  test("VagrantParser.unescapeString()", () => {
    [ { in:  'The VM is powered off. To restart the VM%!(VAGRANT_COMMA) simply run `vagrant up`',
        out: 'The VM is powered off. To restart the VM, simply run `vagrant up`' }
    , { in:  'The environment has not yet been created. Run `vagrant up` to\\n'
          +  'create the environment. If a machine is not created%!(VAGRANT_COMMA) only the\\n'
          +  'default provider will be shown. So if a provider is not listed%!(VAGRANT_COMMA)\\n'
          +  'then the machine is not created for that environment.',
        out: 'The environment has not yet been created. Run `vagrant up` to\n'
          +  'create the environment. If a machine is not created, only the\n'
          +  'default provider will be shown. So if a provider is not listed,\n'
          +  'then the machine is not created for that environment.' }
    ].forEach((testStr) => {
      assert.equal(vagrant.OutputParser.unescapeString(testStr.in), testStr.out);
    });
  });
  test("VagrantCommand.exec()-single-machine", (done) => {
    vagrant.Command.exec(['status', 'default'], singleMachineDir, done);
  });
  test("VagrantCommand.exec()-multi-machine", (done) => {
    vagrant.Command.exec(['status', 'wily'], multiMachineDir, done);
  });
  test("VagrantCommand.spawn()-single-machine", (done) => {
    vagrant.Command.spawn(['status', 'default'], singleMachineDir).on('close', done);
  });
  test("VagrantCommand.spawn()-multi-machine", (done) => {
    vagrant.Command.spawn(['status', 'trusty'], multiMachineDir).on('close', done);
  });
  test('VagrantCommand.status()-single-machine', (done) => {
    vagrant.Command.status(singleMachineDir, null, (status) => {
      assert.equal(JSON.stringify(status, null, 2), fs.readFileSync(path.join(singleMachineDir, 'status.json')).toString());
      done();
    });
  });
  test('VagrantCommand.status()-multi-machine', (done) => {
    vagrant.Command.status(multiMachineDir, null, (status) => {
      assert.equal(JSON.stringify(status, null, 2), fs.readFileSync(path.join(multiMachineDir, 'status.json')).toString());
      done();
    });
  });
  function testVagrantFileMachine(cwd, machineCount, machineName, callback) {
    var vf = new vagrant.Vagrantfile(path.join(cwd, 'Vagrantfile'));
    vf.machines((machines) => {
      assert.equal(machines.length, machineCount);
      var machine = machines.find((machine) => {return machine.name === machineName;});
      machine.status((status) => {
        var refStatus = JSON.parse(fs.readFileSync(path.join(cwd, 'status.json')).toString())[machineName];
        assert.equal(JSON.stringify(status), JSON.stringify(refStatus));
        machine.up().on('close', (code) => {
          assert.equal(code, 0);
          machine.provision().on('close', (code) => {
            assert.equal(code, 0);
            machine.ssh(['echo \'Hello Vagrant\'']).on('close', (code) => {
              assert.equal(code, 0);
              machine.suspend().on('close', (code) => {
                assert.equal(code, 0);
                machine.halt().on('close', (code) => {
                  assert.equal(code, 0);
                  machine.destroy().on('close', (code) => {
                    assert.equal(code, 0);
                    callback();
                  });
                });
              });
            });
          });
        });
      });
    });
  }
  test('Vagrantfile.machines()-single-machine', (done) => {
    testVagrantFileMachine(singleMachineDir, 1, 'default', done);
  });
  test('Vagrantfile.machines()-multi-machine-trusty', (done) => {
    testVagrantFileMachine(multiMachineDir, 2, 'trusty', done);
  });
  test('Vagrantfile.machines()-multi-machine-wily', (done) => {
    testVagrantFileMachine(multiMachineDir, 2, 'wily', done);
  });
});
