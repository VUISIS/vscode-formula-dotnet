import * as vscode from 'vscode';

export class IssuesStatusBarProvider implements vscode.NotebookCellStatusBarItemProvider {

	provideCellStatusBarItems(cell: vscode.NotebookCell): vscode.ProviderResult<vscode.NotebookCellStatusBarItem[]> {
		const cellContent = cell.document.getText();
        const flags = new Set<string>();
        try {
            const idx = cellContent.lastIndexOf('/');
            if (idx > 0 && idx < cellContent.length) {
                cellContent.substring(idx + 1).split('').map(f => {
                    switch (f) {
                        case 'g': return flags.add('global');
                        case 'i': return flags.add('ignoreCase');
                        case 'm': return flags.add('multiline');
                        case 'u': return flags.add('unicode');
                        case 'y': return flags.add('sticky');
                    }
                    return '';
                }).sort().filter(s => !!s);
            }
        } catch { }

        if (flags.size > 0) {
            return [new vscode.NotebookCellStatusBarItem(
                'Flags: ' + Array.from(flags).join(', '),
                vscode.NotebookCellStatusBarAlignment.Right
            )];
        }
	}
}