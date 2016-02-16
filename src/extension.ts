import * as vscode from 'vscode'; 
import * as vagrantExt from './vagrant-extension';

export function activate(context:vscode.ExtensionContext) {
  vagrantExt.registerCommands(context);
}