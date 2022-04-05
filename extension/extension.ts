import * as vscode from 'vscode';
import Grammar from './grammar';
import { IKernelSpec, KernelProvider } from './kernelProvider';
import { FormulaNotebookKernel, FormulaNotebookSerializer } from './notebookProvider';
import SemanticTokensProvider from './providers/semanticTokensProvider';
import TypeHoverProvider from './providers/typeHoverProvider';
import DiagnosticProvider from './providers/diagnosticProvider';

var _fnk : FormulaNotebookKernel = null;

export async function activate(context: vscode.ExtensionContext) {
  const kp = new KernelProvider();
  const kernels = kp.getFormulaKernel();
  let flag = false;
  let ks : IKernelSpec;
  for(const k of kernels)
  {
    if(k.displayName === "Formula")
    {
      ks = k;
      flag = true;
      break;
    }
  }
  if(!flag)
  {
    vscode.window.showErrorMessage("Formula kernel not found.");
    return;
  }
  
  _fnk = new FormulaNotebookKernel(kp, ks);
  await _fnk.create();

  context.subscriptions.push(_fnk);
	context.subscriptions.push(vscode.workspace.registerNotebookSerializer('formula-notebook', new FormulaNotebookSerializer(), {	}));

  context.subscriptions.push(vscode.commands.registerCommand('kernel.restart', function () {
	    _fnk.restart();
	}));

  const grammar = new Grammar('formula');
  await grammar.init();

  const stp = new SemanticTokensProvider(grammar);
  const thp = new TypeHoverProvider(grammar);

  context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'formula', scheme: 'file', pattern: '**/*.4ml' }, 
                             stp,
                             stp.getLegend()));

  context.subscriptions.push(vscode.languages.registerHoverProvider({ language: 'formula', scheme: 'file', pattern: '**/*.4ml' }, thp));

  const dp = new DiagnosticProvider(grammar);
  const collection = vscode.languages.createDiagnosticCollection("formula-lint");
  context.subscriptions.push(collection);

  vscode.workspace.onDidOpenTextDocument((event) => {
    const docs = vscode.workspace.textDocuments;
    for(var doc of docs)
    {
      if(doc.fileName.endsWith("4ml"))
      {
          if(!grammar.docExists(doc))
          {
            grammar.tree(doc);
            let token = new vscode.CancellationTokenSource();
            dp.provideDiagnostics(doc, collection, token.token);
          }
      }
    }
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    if(event.contentChanges.length === 0 ||
      event.document === undefined)
    {
      return;
    }
    grammar.updateTree(event);
    let token = new vscode.CancellationTokenSource();
    dp.provideDiagnostics(event.document, collection, token.token);
});  
}

export function deactivate() {
  _fnk.dispose();
}
