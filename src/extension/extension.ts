import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';
import { FormulaSerializer } from './serializer';
import { FormulaKernel } from './kernel';
import { FormulaHoverProvider } from './languageProvider';
import { updateDiagnostics } from './diagnostics';

export function activate(context: ExtensionContext) 
{
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer('formula-notebook-renderer', new FormulaSerializer(), { transientOutputs: true }),
		new FormulaKernel()
	);

	const formulaDiagnostics = vscode.languages.createDiagnosticCollection("domain");
	context.subscriptions.push(formulaDiagnostics);

	context.subscriptions.push(vscode.languages.registerHoverProvider('formula', new FormulaHoverProvider()));

	const provider = vscode.languages.registerCompletionItemProvider(
		[{ scheme: 'file', language: 'formula' }],
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext)
			{
				const linePrefix = document.lineAt(position).text.substr(0, position.character);
				if (!linePrefix.endsWith(')') || !linePrefix.endsWith('))')) 
				{
					return undefined;
				}
				return [
					new vscode.CompletionItem('.', vscode.CompletionItemKind.Property)
				];
			}
		},
		')'
	);

	const collection = vscode.languages.createDiagnosticCollection('period');
	if (vscode.window.activeTextEditor) {
		updateDiagnostics(collection);
	}
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(event => {
		updateDiagnostics(collection);
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
		updateDiagnostics(collection);
	}));
	
	context.subscriptions.push(provider);
}

