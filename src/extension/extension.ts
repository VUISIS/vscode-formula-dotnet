import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from 'vscode';
import { FormulaSerializer } from './serializer';
import { FormulaKernel } from './kernel';
import { FormulaHoverProvider } from './languageProvider';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

let client: LanguageClient;

export function activate(context: ExtensionContext) 
{
	const serverModule = context.asAbsolutePath(
		path.join('out', 'server', 'server.js')
	);
	const debugOptions = { execArgv: ['--no-lazy','--inspect=6009'] };

	const serverOptions: ServerOptions = 
	{
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	const clientOptions: LanguageClientOptions = 
  	{
		documentSelector: [{ scheme: 'file', language: 'formula' }],
		synchronize: {
			fileEvents: vscode.workspace.createFileSystemWatcher('**/.4ml')
		}
	};

	client = new LanguageClient(
		'formulaServer',
		'Formula Server',
		serverOptions,
		clientOptions
	);

	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer('formula-notebook-renderer', new FormulaSerializer(), { transientOutputs: true }),
		new FormulaKernel()
	);

	const formulaDiagnostics = vscode.languages.createDiagnosticCollection("domain");
	context.subscriptions.push(formulaDiagnostics);

	context.subscriptions.push(vscode.languages.registerHoverProvider('formula', new FormulaHoverProvider()));
	
	client.start();
}

export function deactivate(): Thenable<void> | undefined 
{
	if (!client) {
		return undefined;
	}
	return client.stop();
}