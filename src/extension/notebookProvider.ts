import { takeWhile } from 'rxjs';
import { reduce } from 'rxjs/operators';
import * as vscode from 'vscode';
import { IKernelSpec, IRunningKernel, KernelProvider } from './kernelProvider';
import { executeRequest, isMessageType } from './messaging';
export class FormulaNotebookKernel {

	private readonly _controller: vscode.NotebookController;
	private readonly _kernelProvider: KernelProvider;
	private readonly _kernelSpec: IKernelSpec;
	private readonly _runningKernel: IRunningKernel;

	constructor(
		kernelProvider: KernelProvider,
		kernelSpec: IKernelSpec
	) {

		this._controller = vscode.notebooks.createNotebookController(
			'formulaKernel',
			'formula-notebook',
			'Formula',
		);
		this._controller.supportedLanguages = ['formula'];
		this._controller.description = 'Formula';
		this._controller.executeHandler = this._executeAll.bind(this);

		this._kernelProvider = kernelProvider;
		this._kernelSpec = kernelSpec;

		this._runningKernel = this._kernelProvider.launchKernel(this._kernelSpec);
	}

	dispose(): void {
		this._controller.dispose();
	}

	private async _executeAll(cells: vscode.NotebookCell[]): Promise<void> {
        for (const cell of cells) {
			await this._doExecuteCell(cell);
		}
	}

	private async _doExecuteCell(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
		execution.start(Date.now());
		console.log(cell.document.getText());

		try {
			const output = this._runningKernel.connection.sendAndReceive(executeRequest(cell.document.getText())).pipe(
				takeWhile(msg => msg.header.msg_type !== 'execute_reply', true)
			);
			
			const kernelOutputs = output
			.pipe(
				reduce((acc: vscode.NotebookCellOutput[], msg): vscode.NotebookCellOutput[] => {
				if (isMessageType('execute_result', msg)) {
					return [
					...acc,
						{
							items: [vscode.NotebookCellOutputItem.text(msg.content.data["plain/text"])]
						}
					];
				}

				return acc;
				}, []),
			);
				
		} 
		catch (error) 
		{
			execution.appendOutput([
				new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.error(error)
				])
			]);
		} 

		execution.end(true, Date.now());
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