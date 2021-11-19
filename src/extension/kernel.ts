import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { FormulaCommands } from './util';
import { EventEmitter } from 'events';

var isWin = process.platform === "win32";
var isLinux = process.platform === "linux";
var isMac = process.platform === "darwin";

export class FormulaKernel {
    readonly id = 'formula-kernel';
    public readonly label = 'Formula';
    readonly supportedLanguages = ['formula'];
  
    private _formulaRuntime: cp.ChildProcess | undefined;
    private _outputBuffer = '';
    private flag = true;
    private _execution: vscode.NotebookCellExecution | undefined;
    private readonly _controller: vscode.NotebookController;

    private _cellFinished = new EventEmitter();
    private _executionQueue: vscode.NotebookCellExecution[] =[];

    constructor() {
      this._controller = vscode.notebooks.createNotebookController(this.id,
                                                                  'formula-notebook-renderer',
                                                                  this.label);
  
      this._controller.supportedLanguages = this.supportedLanguages;
      this._controller.supportsExecutionOrder = true;
      this._controller.executeHandler = this._executeAll.bind(this);

      var self = this;
      this._cellFinished.on('done', () => {
        self.run();
        if(this._executionQueue.length === 0) {
            this.flag = true;
        }  
      });

      this.start();
    }
  
    dispose(): void {
        this._controller.dispose();
        this._formulaRuntime.kill();
        this.stop();
    }

    private run() {

        if(this._executionQueue.length > 0)
        {   
            this.flag = false;
            this._execution = this._executionQueue.shift();
            this._execution.start(Date.now());
            if(this._execution.cell.document.getText().length === 0)
            {
                this.outputToCell(" ");
                this._cellFinished.emit("done");
                return;
            }
            
            this._execution.token.onCancellationRequested(e => {
                this.restart();
                this._cellFinished.emit("done");
            });
            
            if(this.checkExitAndDoubleCommand(this._execution.cell.document.getText())) {
                this.sendCommand(this._execution.cell.document.getText());
            }  
        }

        return;
    }

    public start() {
        if(!this._formulaRuntime)
        {
            const clPath = vscode.workspace.getConfiguration('formula');
            if(clPath['commandLinePath'].length === 0)
            {
                vscode.window.showErrorMessage('CommandLine path not set in settings.', 'Open Settings').then(val => {
                    if (val) {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'formula.commandLinePath');
                    }
                });
                return;
            }
            let pathCL = clPath['commandLinePath'];
            pathCL = pathCL.replace(/['"]+/g, '');
            if(isLinux)
            {
                if(pathCL.endsWith('CommandLine'))
                    this._formulaRuntime = cp.spawn(pathCL);
                else
                    this._formulaRuntime = cp.spawn(path.join(pathCL,"CommandLine"));
            }
            else if(isWin)
            {
                if(pathCL.endsWith('CommandLine.exe'))
                    this._formulaRuntime = cp.spawn(pathCL);
                else
                    this._formulaRuntime = cp.spawn(path.join(pathCL, "CommandLine.exe"));
            }
            else if(isMac)
            {
                if(pathCL.endsWith('CommandLine.dll'))
                    this._formulaRuntime = cp.spawn("dotnet", [pathCL]);
                else
                    this._formulaRuntime = cp.spawn("dotnet", [path.join(pathCL, "CommandLine.dll")]);
            }

            this._formulaRuntime.stdout.on('data', (data) => {
                this._outputBuffer += data;
                this.getData(data.toString());
            });

            this._formulaRuntime.stderr.on('data', (data) => {
                this._outputBuffer += "Error: ";
                this._outputBuffer += data;
            });
        }
    }

    private async getData(data): Promise<void>
    {		
        if(this.checkEndOfOutput()) {
            this._outputBuffer = this._outputBuffer.replace(/[[\]>]/g,"");
            this._outputBuffer = this._outputBuffer.replace(/^[\s]/g,"");
            this.outputToCell(this._outputBuffer);
            this._outputBuffer = "";
            this._cellFinished.emit('done');  
        }
        return Promise.resolve();
    }

    private checkEndOfOutput(): boolean
    {
        let re = /[>\s].$/g;
        if(re.test(this._outputBuffer))
        {
            return true;
        }
        return false;
    }

    private checkExitAndDoubleCommand(msg: string): boolean
    {
        if (this._formulaRuntime) 
        {
            let re = /^(exit|exit\s|x|x\s)/g;
            if(!re.test(msg))
            {
                let regx = "^(";
                regx = regx + FormulaCommands.join("|") + ")";
                let re2 = new RegExp(regx, 'gm');
                let matches = msg.match(re2);
                if(matches && matches.length > 1)
                {
                    this.outputToCell("Error: Can't run more than one command at a time.");
                }
                else
                {
                    return true;
                }
            }
            else
            {
                this.outputToCell("Error: Can't run command. Exit will end interpreter process.");
            }
        }
        else
        {
            this.outputToCell("Kernel not started. Restart VSCode.");
            this.start();
        }
        this._outputBuffer = "";
        this._cellFinished.emit('done');
        return false;
    }

    private sendCommand(msg: string)
    {
        this._formulaRuntime.stdin.cork();
        this._formulaRuntime.stdin.write(msg+"\n");
        this._formulaRuntime.stdin.uncork();
    }

    public stop() {
        if (this._formulaRuntime) {
            this._formulaRuntime.kill();
            this._formulaRuntime = undefined;
        }

        if(this._execution) {
            this._execution.end(false, Date.now());
            this._execution = undefined;
        }

        this._outputBuffer = "";
    }

    private outputToCell(msg: string) {
        if(this._execution) {
            try {
                this._execution.replaceOutput([new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.text(msg)
                ])]);
    
                this._execution.end(true, Date.now());      
            } catch (err) {
                this._execution.replaceOutput([new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.error(err)
                ])]);
                this._execution.end(false, Date.now());
            }
        }
    }

    public restart() {
        this.stop();

        this.start();
    }
  
    private async _executeAll(cells: vscode.NotebookCell[], _notebook: vscode.NotebookDocument, _controller: vscode.NotebookController): Promise<void> {
        for (let cell of cells) {
            this._executionQueue.push(_controller.createNotebookCellExecution(cell));
        }
 
        if(this.flag)
        {
            this._outputBuffer = "";
            this.run();
        } 
    }
}