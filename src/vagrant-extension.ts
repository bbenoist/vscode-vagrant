import * as vscode from 'vscode'; 
import * as childProcess from 'child_process';
import * as vagrant from './vagrant';
import * as path from 'path';

export class VagrantExtension {
  private context:vscode.ExtensionContext

  constructor(context:vscode.ExtensionContext) {
    this.context = context;
  }

  private selectVagrantfile(files:vscode.Uri[]) {
    return new Promise<vagrant.Vagrantfile>((accept, reject) => {
      if (files.length == 0) {
        reject('No Vagrantfile found in workspace directory.');
      } else if (files.length == 1) {
        accept(new vagrant.Vagrantfile(files[0].fsPath));
      } else {
        var quickPickItems : vscode.QuickPickItem[] =
              files
                .map((file) => {return file.fsPath;})
                .sort()
                .map((file) => {
                  return {
                    label: path.relative(vscode.workspace.rootPath, file),
                    description: file
                  };
                });
            vscode.window.showQuickPick(quickPickItems).then((item) => {
              accept(new vagrant.Vagrantfile(item.description));
            }, reject);
      }
    });
  }

  private selectMachine(vagrantfile:vagrant.Vagrantfile) {
    return new Promise<vagrant.Machine>((accept, reject) => {
      vagrantfile.machines((machines) => {
        if (machines.length == 0) {
          reject();
        } else if (machines.length == 1) {
          accept(machines[0]);
        } else {
          var machinesQuickPickItems : vscode.QuickPickItem[] =
            machines
              .map((machine) => { return machine.name; })
              .sort()
              .map((name) => { return {label: name, description: name}; });
          vscode.window.showQuickPick(machinesQuickPickItems).then((item) => {
            accept(new vagrant.Machine(item.description, vagrantfile.directory));
          }, reject);
        }
      });
    });
  }

  private executeChildProcess(proc:childProcess.ChildProcess) {
    return new Promise((accept, reject) => {
      var commandOutput = vscode.window.createOutputChannel("Vagrant");
      commandOutput.clear();
      proc.stdout.on('data', (data) => {commandOutput.append(`${data}`);});
      proc.stderr.on('data', (data) => {commandOutput.append(`${data}`);});
      proc.on('close', (code) => {
        if (code) {
          vscode.window.showErrorMessage(`Vagrant exited with code ${code}`);
          commandOutput.show();
          reject(`Vagrant exited with code ${code}`);
        } else {
          vscode.window.showInformationMessage('Vagrant operation suceeded.');
          accept();
        }
      });
    });
  }

  private registerCommand(
    cmdName : string,
    vagrantfileAction : (machine:vagrant.Machine) => childProcess.ChildProcess
  ) {
    return vscode.commands.registerCommand(cmdName, () => {
      vscode.workspace.findFiles('**/Vagrantfile', '')
        .then(this.selectVagrantfile)
        .then(this.selectMachine)
        .then(vagrantfileAction)
        .then(this.executeChildProcess)
    });
  }
  
  registerCommands() {
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
      return this.registerCommand(description.name, description.action);
    }).forEach((disposable) => {
      this.context.subscriptions.push(disposable);
    });
  }
}
