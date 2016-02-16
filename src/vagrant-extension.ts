import * as vscode from 'vscode'; 
import * as childProcess from 'child_process';
import * as vagrant from './vagrant';
import * as path from 'path';

function ignoreError() {
}

function showError(msg) {
  return vscode.window.showErrorMessage(msg);
}

function showInfo(msg) {
  return vscode.window.showInformationMessage(msg);
}

function findVagranfiles() {
  return vscode.workspace.findFiles('**/Vagrantfile', '');
}

function getVagrantfile(fileName:string) {
  return new Promise<vagrant.Vagrantfile>((accept, reject) => {
    accept(new vagrant.Vagrantfile(fileName));
  });
}

function getVagrantfiles(uris:vscode.Uri[]) {
  return Promise.all(
    uris.map((uri) => {return uri.fsPath;})
      .sort()
      .map((fileName) => {return getVagrantfile(fileName);}));
}

function getVagrantfileMachines(vagrantfile:vagrant.Vagrantfile) {
  return new Promise<any>((accept, reject) => {
    vagrantfile.machines((machines, status) => {
      accept({machines:machines, status:status});
    });
  });
}

function getMachines(vagrantfiles:vagrant.Vagrantfile[]) {
  return Promise.all(vagrantfiles.map((vagrantfile) => {return getVagrantfileMachines(vagrantfile)}));
}

function findMachines() {
  return new Promise<any[]>((accept, reject) => {
    findVagranfiles()
      .then(getVagrantfiles)
      .then(getMachines)
      .then(accept);
  });
}

function listMachines(infos:any[]) {
  return new Promise<vagrant.Machine>((accept, reject) => {
    var quickPickItems = [];
    infos.forEach((info) => {
      info.machines.forEach((machine) => {
        var dir = path.relative(vscode.workspace.rootPath, machine.directory);
        var status = info.status[machine.name]['state-human-short'];
        switch (info.status[machine.name]['state']) {
          case 'not_created': status = '$(x)'; break;
          case 'running': status = '$(triangle-right)'; break;
          case 'saved': status = '$(history)'; break;
          case 'poweroff': status = '$(primitive-square)'; break;
        }
        quickPickItems.push({
          label: `${machine.name} - ${status}`,
          description: dir, machine: machine
        });
      });
    });
    return vscode.window.showQuickPick(quickPickItems).then((item) => {
      if (item) {
        accept(item.machine);
      } else {
        reject('Operation canceled.');
      }
    }, reject);
  });
}

function listMachinesIfMultiple(infos:any[]) {
  return new Promise<vagrant.Machine>((accept, reject) => {
    if (infos.length == 0) {
      reject('No machine found.');
    } else if (infos.length == 1 && infos[0].machines.length == 1) {
      accept(infos[0].machines[0]);
    } else {
      listMachines(infos).then(accept, reject);
    }
  });
}

function registerCmd(
  cmdName : string,
  vagrantfileAction : (machine:vagrant.Machine) => childProcess.ChildProcess
) {
  return vscode.commands.registerCommand(cmdName, () => {
    findMachines()
      .then(listMachinesIfMultiple)
      .then(vagrantfileAction)
      .then(executeChildProcess)
      .then(showInfo);
  });
}

function executeChildProcess(proc:childProcess.ChildProcess) {
  return new Promise((accept, reject) => {
    var commandOutput = vscode.window.createOutputChannel("Vagrant");
    commandOutput.clear();
    proc.stdout.on('data', (data) => {commandOutput.append(`${data}`);});
    proc.stderr.on('data', (data) => {commandOutput.append(`${data}`);});
    proc.on('close', (code) => {
      if (code) {
        commandOutput.show();
        reject(`Vagrant exited with code ${code}`);
      }
      accept('Vagrant operation suceeded.');
    });
  });
}

export function registerCommands(context:vscode.ExtensionContext) {
  [ {name: 'extension.vagrantUp',
      action: (machine) => { return machine.up(); }},
    {name: 'extension.vagrantProvision',
      action: (machine) => { return machine.provision(); }},
    {name: 'extension.vagrantSuspend',
      action: (machine) => { return machine.suspend(); }},
    {name: 'extension.vagrantHalt',
      action: (machine) => { return machine.halt(); }},
    {name: 'extension.vagrantReload',
      action: (machine) => { return machine.reload(); }},
    {name: 'extension.vagrantDestroy',
      action: (machine) => { return machine.destroy(); }}
  ].map((description) => {
    return registerCmd(description.name, description.action);
  }).forEach((disposable) => {
    context.subscriptions.push(disposable);
  });
  vscode.commands.registerCommand('extension.vagrantStatus', () => {
    findMachines().then(listMachines).catch(console.log);
  });
}
