import * as vscode from 'vscode';

export class FormulaHoverProvider implements vscode.HoverProvider
{
    provideHover(doc: vscode.TextDocument, pos: vscode.Position) 
    {			
        const range = doc.getWordRangeAtPosition(pos);
        const word = doc.getText(range);
        return new vscode.Hover(word);
    }
}