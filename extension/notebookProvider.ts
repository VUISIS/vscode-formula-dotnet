import * as vscode from 'vscode';
import { IKernelSpec, IRunningKernel, KernelProvider } from './kernelProvider';
import { DisplayData, executeRequest, inputReply, StreamOutput, UpdateDisplayData } from './messaging';
import * as path from 'path';
import { Buffer } from 'buffer';
import { networkInterfaces } from 'os';

export class FormulaNotebookKernel {

	private _controller: vscode.NotebookController;
	private readonly _kernelProvider: KernelProvider;
	private readonly _kernelSpec: IKernelSpec;
	private _runningKernel: IRunningKernel;
	private _execution: vscode.NotebookCellExecution;
	private _solution: Object = new Object();
	private _loaded4ML: vscode.Uri = null;
	private _4mlText: string = null;
	private _extractOut: string[];
	private _collect: Boolean = true;
	private _save: Boolean = false;

	constructor(
		kernelProvider: KernelProvider,
		kernelSpec: IKernelSpec
	) 
	{
		this._kernelProvider = kernelProvider;
		this._kernelSpec = kernelSpec;
	}

	public restart()
	{
		this._runningKernel.dispose();
		this.launchKernelAndConnectSubject();
	}

	public async saveCallback()
	{
		if(this._save)
		{
			await this._runningKernel.connection.sendRaw(executeRequest("extract 0 1 save_solution"));
		}
	}

	public async saveSolution()
	{
		if(this._4mlText.includes("model " + this._solution["PartialModel"] + this._solution["SolNum"] + " of " + this._solution["Domain"]))
		{
			await vscode.window.showErrorMessage("Solution already saved to " + this._loaded4ML.fsPath + ".");
			return;
		}

		if(this._loaded4ML !== null)
		{
			var txt = Buffer.from(this._4mlText).toString('utf-8');
			txt += "\n";
			txt += "\n";
			txt += "model " + this._solution["PartialModel"] + this._solution["SolNum"] + " of " + this._solution["Domain"];
			txt += " {";
			txt += "\n";
			this._extractOut.forEach(element => {
				txt += "\t" + element;
				txt += "\n";
			});
			txt += "}";
			await vscode.workspace.fs.writeFile(this._loaded4ML, Buffer.from(txt));
			vscode.window.showInformationMessage("Solution successfully saved to " + this._loaded4ML.fsPath + ".");
			this._4mlText = (await vscode.workspace.openTextDocument(this._loaded4ML)).getText();
			this._save = false;
			await this._runningKernel.connection.sendRaw(executeRequest("tunload *"));
			await this._runningKernel.connection.sendRaw(executeRequest("reload"));
			return;
		}
		await vscode.window.showErrorMessage("No 4ml file loaded.");
		return;
	}

	private async storeSolution(cmd: string, metaCode: string)
	{
		const matches = /solve\s([\w\d]+)\s(\d+)/.exec((metaCode));
		var obj = new Object();
		obj["PartialModel"] = matches[1];
		obj["SolNum"] = matches[2];
		const re = new RegExp('partial model ' + matches[1] + ' of ([\\w\\d]+)');
		const m4ml = re.exec(this._4mlText);
		obj["Domain"] = m4ml[1];

		this._solution = obj;
	}

	private async launchKernelAndConnectSubject()
	{
		this._runningKernel = await this._kernelProvider.launchKernel(this._kernelSpec);
		this._runningKernel.connection.msgSubject.pipe(
		).subscribe({
			next: (msg) => {
				if(msg.header.msg_type === 'stream')
				{
					this._execution.appendOutput([
						new vscode.NotebookCellOutput([
							vscode.NotebookCellOutputItem.text((msg as StreamOutput).content.text)
						])
					]);
				}
				else if(msg.header.msg_type === 'display_data')
				{
					var cont = (msg as DisplayData).content;
					var metaCode = cont.metadata.code;
					var cmd = (metaCode as string).split(" ");
					var out = cont.data['text/plain'];
					if(cmd[0] === "solve" || cmd[0] === "sl")
					{
						this.storeSolution(cmd[0], (metaCode as string));
						this._save = true;
					}
					else if(cmd[0] === "extract" && cmd[3] === "save_solution")
					{
						this._extractOut = [];
						this._collect = true;
					}

					if(cmd[0] !== "tunload")
					{
						this._execution.appendOutput([
							new vscode.NotebookCellOutput([
								vscode.NotebookCellOutputItem.text(out)
							])
						]);
					}
				}
				else if(msg.header.msg_type === 'update_display_data')
				{
					var cont = (msg as DisplayData).content;
					var metaCode = cont.metadata.code;
					var cmd = (metaCode as string).split(" ");
					var out = cont.data['text/plain'];
					var outPut = out.split("\n");

					if(cmd[0] === "extract" && cmd[3] === "save_solution")
					{
						outPut.forEach(element => {
							if(element.startsWith("INFO") && this._collect)
							{
								if(!element.startsWith("INFO Solution number") && !element.endsWith("s."))
								{
									var temp = element.replace("INFO ", "");
									temp += '.';
									this._extractOut.push(temp);
								}
								else if(element.endsWith("s."))
								{
									this._collect = false;
									this.saveSolution();
								}
							}
						});
					}

					if(cmd[0] !== "tunload")
					{
						this._execution.replaceOutput([
							new vscode.NotebookCellOutput([
								vscode.NotebookCellOutputItem.text(out)
							])
						]);
					}
				}
				else if(msg.header.msg_type === 'input_request')
				{
					vscode.window.showInputBox({ignoreFocusOut: true,
						password: false,
						placeHolder: "Selection",
						prompt: "Input Selection",
						title: "Selection",
						value: "0",
						valueSelection: undefined}).then(async (val) => {
							await this._runningKernel.connection.sendRaw(inputReply(val));
					});
				}
				else if(msg.header.msg_type === 'execute_reply')
				{
					this._execution.end(true, Date.now());
				}
			}
		});
	}

	public async create()
	{
		this._controller = vscode.notebooks.createNotebookController(
			'formulaKernel',
			'formula-notebook',
			'Formula',
		);
		this._controller.supportedLanguages = ['formula'];
		this._controller.description = 'Formula';
		this._controller.executeHandler = this._executeAll.bind(this);
		this._controller.interruptHandler = this._interruptHandler.bind(this);
		this.launchKernelAndConnectSubject();
	}

	dispose(): void 
	{
		this._controller.dispose();
		this._runningKernel.dispose();
	}

	private async _executeAll(cells: vscode.NotebookCell[]): Promise<void> {
        for (const cell of cells) 
		{
			await this._doExecuteCell(cell);
		}
	}

	private async _interruptHandler(cells: vscode.NotebookCell[]): Promise<void> {
		this._execution.appendOutput([
			new vscode.NotebookCellOutput([
				vscode.NotebookCellOutputItem.text("Command interrupted.")
			])
		]);
		this._execution.end(false, Date.now());
	}

	private async _doExecuteCell(cell: vscode.NotebookCell): Promise<void> {
        this._execution = this._controller.createNotebookCellExecution(cell);
		this._execution.start(Date.now());
		this._execution.clearOutput(cell);

		if(cell.document.lineCount > 1)
		{
			this._execution.appendOutput([
				new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text("Only one command at a time.")
				])
			]);
			this._execution.end(false, Date.now());
			return;
		}

		var cmd = cell.document.getText();
		if(cmd.startsWith("load ") || cmd.startsWith("l "))
		{
			try
			{
				var filePath = "";
				if(cmd.startsWith("load "))
				{
					filePath = cmd.replace("load ", "");
				}
				else if(cmd.startsWith("l "))
				{
					filePath = cmd.replace("l ", "");
				}

				if(process.platform === "win32")
				{
					filePath = "file:///" + filePath;
				}

				var folder = path.dirname(cell.notebook.uri.path);

				cmd = cmd + " " + folder;

				var uri : vscode.Uri | undefined = undefined;
				if(path.isAbsolute(filePath))
				{
					uri = vscode.Uri.parse(filePath);
				}
				else
				{
					filePath = path.join(folder, filePath);
					uri = vscode.Uri.parse(filePath);
				}

				await vscode.workspace.fs.stat(uri);
				this._loaded4ML = uri;
				const doc = await vscode.workspace.openTextDocument(uri);
				this._4mlText = doc.getText();
				await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside, false);
			}
			catch (error)
			{
				this._execution.appendOutput([
					new vscode.NotebookCellOutput([
						vscode.NotebookCellOutputItem.text("Invalid file path.")
					])
				]);
				this._execution.end(false, Date.now());
				return;
			}
		}

		try 
		{
			await this._runningKernel.connection.sendRaw(executeRequest(cmd));
		} 
		catch (error) 
		{
			this._execution.appendOutput([
				new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.error(error)
				])
			]);
		} 
	}
}

interface RawNotebookCell {
	language: string;
	value: string;
	kind: vscode.NotebookCellKind;
	editable?: boolean;
}

declare class TextDecoder {
	decode(data: Uint8Array): string;
}

declare class TextEncoder {
	encode(data: string): Uint8Array;
}

export class FormulaNotebookSerializer implements vscode.NotebookSerializer {
	async deserializeNotebook(
		content: Uint8Array,
		_token: vscode.CancellationToken
	  ): Promise<vscode.NotebookData> {
		var contents = new TextDecoder().decode(content);
	
		let raw: RawNotebookCell[];
		try {
		  raw = <RawNotebookCell[]>JSON.parse(contents);
		} catch {
		  raw = [];
		}
	
		const cells = raw.map(
		  item => new vscode.NotebookCellData(item.kind, item.value, item.language)
		);
	
		return new vscode.NotebookData(cells);
	  }
	
	  async serializeNotebook(
		data: vscode.NotebookData,
		_token: vscode.CancellationToken
	  ): Promise<Uint8Array> {
		let contents: RawNotebookCell[] = [];
	
		for (const cell of data.cells) {
		  contents.push({
			kind: cell.kind,
			language: cell.languageId,
			value: cell.value
		  });
		}
	
		return new TextEncoder().encode(JSON.stringify(contents));
	}
}