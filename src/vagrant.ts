import * as childProcess from 'child_process';
import * as path from 'path';

export class OutputParser {
  static unescapeString(str:string) {
    return str
      .replace(/%!\(VAGRANT_COMMA\)/g,',')
      .replace(/\\n/g,'\n')
  }
}

export class Command {
  static spawn(args:string[], cwd?:any) {
    return childProcess.spawn('vagrant', args, {cwd:cwd});
  }

  static exec(
    args:string[], cwd?:string,
    callback?:(error:Error, stdout:Buffer, stderr:Buffer) => void
  ) {
    childProcess.exec('vagrant ' + args.join(' '), {cwd:cwd}, callback);
  }

  static status(cwd?:string, machine?:string, callback?:(status:any) => void) {
    Command.exec(
      ['status', '--machine-readable'], cwd,
      (error, stdout, stderr) => {
        if (error) throw error;
        var obj:any = {}
        stdout.toString()
          .split(/\r?\n/)
          .map((line) => {return line.trim();})
          .filter((line) => {return line.length > 0;})
          .map((line) => {return line.split(',');})
          .map((row) => {
            var unescaped = [];
            row.forEach((cell) => {
              unescaped.push(OutputParser.unescapeString(cell));
            });
            return unescaped;
          })
          .forEach((row) => {
            if (!Object.prototype.hasOwnProperty.call(obj, row[1])) {
              obj[row[1]] = {}
            }
            obj[row[1]][row[2]] = row[3];
          });
        callback(obj);
      });
  }

  public static up(cwd?:string, machine?:string, provision?:boolean) {
    var args = ['up'];
    if (machine) args.push(machine);
    if (provision) args.push('--provision');
    return this.spawn(args, cwd);
  }

  public static provision(cwd?:string, machine?:string) {
    var args = ['provision'];
    if (machine) args.push(machine);
    return this.spawn(args, cwd);
  }

  public static suspend(cwd?:string, machine?:string) {
    var args = ['suspend'];
    if (machine) args.push(machine);
    return this.spawn(args, cwd);
  }

  public static halt(cwd?:string, machine?:string) {
    var args = ['halt'];
    if (machine) args.push(machine);
    return this.spawn(args, cwd);
  }

  public static reload(cwd?:string, machine?:string, provision?:boolean) {
    var args = ['reload'];
    if (machine) args.push(machine);
    if (provision) args.push('--provision');
    return this.spawn(args, cwd);
  }

  public static destroy(cwd?:string, machine?:string) {
    var args = ['destroy', '-f'];
    if (machine) args.push(machine);
    return this.spawn(args, cwd);
  }

  public static ssh(commands?:string[], cwd?:string, machine?:string) {
    var args = ['ssh'];
    if (machine) args.push(machine);
    if (commands) {
      commands.forEach((cmd) => {
        args.push('-c');
        args.push(cmd);
      });
    }
    return this.spawn(args, cwd);
  }

  public static winrm(commands?:string[], cwd?:string, machine?:string, shell?:string) {
    var args = ['winrm'];
    if (machine) args.push(machine);
    if (shell) {
      args.push('-s');
      args.push(shell)
    }
    if (commands) {
      commands.forEach((cmd) => {
        args.push('-c');
        args.push(cmd);
      });
    }
    return this.spawn(args, cwd);
  }
}

export class Vagrantfile {
  private _file:string;
  get fileName():string {
    return this._file;
  }
  get directory():string {
    return path.dirname(this.fileName);
  }
  constructor(file:string) {
    this._file = file;
  }
  status(machine?:string, callback?:(status:any) => void) {
    Command.status(this.directory, machine, callback);
  }
  machines(callback?:(machines:Machine[], status:any) => void) {
    this.status(null, (status) => {
      callback(
        Object.keys(status).map((key) => {
          return new Machine(key, this.directory);
        }),
        status
      );
    })
  }
  up(machine?:string, provision?:boolean) {
    return Command.up(this.directory, machine, provision);
  }
  provision(machine?:string) {
    return Command.provision(this.directory, machine);
  }
  suspend(machine?:string) {
    return Command.suspend(this.directory, machine);
  }
  halt(machine?:string) {
    return Command.halt(this.directory, machine);
  }
  reload(machine?:string, provision?:boolean) {
    return Command.reload(this.directory, machine, provision);
  }
  destroy(machine?:string) {
    return Command.destroy(this.directory, machine);
  }
  ssh(commands?:string[], machine?:string) {
    return Command.ssh(commands, this.directory, machine);
  }
  winrm(commands?:string[], machine?:string, shell?:string) {
    return Command.winrm(commands, this.directory, machine, shell);
  }
}

export class Machine {
  private _name:string;
  private _directory:string;
  get name():string {
    return this._name;
  }
  get directory():string {
    return this._directory;
  }
  constructor(name:string, directory:string) {
    this._name = name;
    this._directory = directory;
  }
  status(callback?:(status:any) => void) {
    Command.status(this.directory, this.name, (status) => {
      callback(status[this.name]);
    })
  }
  up(provision?:boolean) {
    return Command.up(this.directory, this.name, provision);
  }
  provision() {
    return Command.provision(this.directory, this.name);
  }
  suspend() {
    return Command.suspend(this.directory, this.name);
  }
  halt() {
    return Command.halt(this.directory, this.name);
  }
  reload(provision?:boolean) {
    return Command.reload(this.directory, this.name, provision);
  }
  destroy() {
    return Command.destroy(this.directory, this.name);
  }
  ssh(commands?:string[]) {
    return Command.ssh(commands, this.directory, this.name);
  }
  winrm(commands?:string[], shell?:string) {
    return Command.winrm(commands, this.directory, this.name, shell);
  }
}
