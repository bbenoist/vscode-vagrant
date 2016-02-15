import * as vscode from 'vscode'; 
import * as vagrantExt from './vagrant-extension';

export function activate(context:vscode.ExtensionContext) {
  var ext = new vagrantExt.VagrantExtension(context);
  ext.registerCommands();
}