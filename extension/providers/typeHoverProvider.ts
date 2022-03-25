import * as vscode from 'vscode';
import Grammar from '../grammar';

export default class TypeHoverProvider implements vscode.HoverProvider
{
    grammar: Grammar;

    constructor(grammar: Grammar)
    {
        this.grammar = grammar;
    }

    async provideHover(
        doc: vscode.TextDocument,
        pos: vscode.Position,
        token: vscode.CancellationToken): Promise<vscode.Hover>
    {
        let hover : vscode.Hover = undefined;
        let type : string | undefined = undefined;
        const tree = this.grammar.getTree(vscode.window.activeTextEditor.document);
        const terms = this.grammar.parse(tree);
        for(var t of terms) {
            if(t.range.isSingleLine)
            {
                if(t.range.contains(pos))
                {
                    if(t.term === 'unnbody')
                    {
                        type = 'type';
                    }
                    else if(t.term === 'id' &&
                            t.parentType === 'func_term')
                    {
                        type = 'function';
                    }
                    else if(t.term === 'mod_ref')
                    {
                        type = 'domain reference';
                    }
                    else
                    {
                        type = t.term;
                    }
                }   
            }
        };
        if(type)
        {
            hover = new vscode.Hover(type, doc.getWordRangeAtPosition(pos));
        }
        return hover;
    }
}