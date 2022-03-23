import * as vscode from 'vscode';
import { IKernelSpec, KernelProvider } from './kernelProvider';
import { FormulaNotebookKernel, FormulaNotebookSerializer } from './notebookProvider';

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
  
  var knp = new FormulaNotebookKernel(kp, ks);
  await knp.create();

  context.subscriptions.push(knp);
	context.subscriptions.push(vscode.workspace.registerNotebookSerializer('formula-notebook', new FormulaNotebookSerializer(), {
		transientOutputs: true,
		transientCellMetadata: {
			inputCollapsed: true,
			outputCollapsed: true,
		}
	}));
}

export function deactivate() {

}
