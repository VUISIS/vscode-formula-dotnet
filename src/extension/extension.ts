import * as vscode from 'vscode';
import { IKernelSpec, KernelProvider } from './kernelProvider';
import { FormulaNotebookKernel, FormulaNotebookSerializer } from './notebookProvider';

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
	context.subscriptions.push(vscode.workspace.registerNotebookSerializer('formula-notebook', new FormulaNotebookSerializer(), {
		transientOutputs: true,
		transientCellMetadata: {
			inputCollapsed: true,
			outputCollapsed: true,
		}
	}));
  context.subscriptions.push(vscode.commands.registerCommand('kernel.restart', function () {
	    _fnk.restart();
	}));
}

export function deactivate() {
  _fnk.dispose();
}
