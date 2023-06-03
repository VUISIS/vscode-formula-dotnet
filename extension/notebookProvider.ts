import * as vscode from 'vscode';
import { IKernelSpec, IRunningKernel, KernelProvider } from './kernelProvider';
import { DisplayData, executeRequest, inputReply, StreamOutput, UpdateDisplayData } from './messaging';
import * as path from 'path';

export class FormulaNotebookKernel {

	private _controller: vscode.NotebookController;
	private readonly _kernelProvider: KernelProvider;
	private readonly _kernelSpec: IKernelSpec;
	private _runningKernel: IRunningKernel;
	private _execution: vscode.NotebookCellExecution;

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
					this._execution.appendOutput([
						new vscode.NotebookCellOutput([
							vscode.NotebookCellOutputItem.text((msg as DisplayData).content.data['text/plain'])
						])
					]);
				}
				else if(msg.header.msg_type === 'update_display_data')
				{
					this._execution.replaceOutput([
						new vscode.NotebookCellOutput([
							vscode.NotebookCellOutputItem.text((msg as UpdateDisplayData).content.data['text/plain'])
						])
					]);
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

				var folder = path.dirname(cell.notebook.uri.fsPath);

				cmd = cmd + " " + folder;

				var uri : vscode.Uri | undefined = undefined;
				if(path.isAbsolute(filePath))
				{
					if(process.platform === "win32")
					{
						filePath = "file:///" + filePath;
					}
					uri = vscode.Uri.parse(filePath);
				}
				else
				{
					filePath = path.join(folder, filePath);
					if(process.platform === "win32")
					{
						filePath = "file:///" + filePath;
					}
					uri = vscode.Uri.parse(filePath);
				}

				await vscode.workspace.fs.stat(uri);
				const doc = await vscode.workspace.openTextDocument(uri);
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