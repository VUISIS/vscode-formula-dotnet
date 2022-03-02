import { kernelInfoRequest } from './messaging';
import * as vscode from 'vscode';
import { IKernelSpec, KernelProvider } from './kernelProvider';
import { FormulaNotebookKernel, FormulaNotebookSerializer } from './notebookProvider';

export async function activate(context: vscode.ExtensionContext) {
  /*const val = await vscode.window.showInputBox({ignoreFocusOut: false,
                              password: false,
                              placeHolder: "BAM",
                              prompt: "GIB ME",
                              title: "MY INPUT",
                              value: "NOTHING",
                              valueSelection: undefined});*/
  const ch = vscode.window.createOutputChannel("Formula");
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
    ch.appendLine("Formula kernel not found.");
    vscode.window.showErrorMessage("Formula kernel not found.");
  }
  
  context.subscriptions.push(new FormulaNotebookKernel(kp, ks));
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
