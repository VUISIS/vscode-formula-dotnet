import * as vscode from 'vscode';
import Grammar from '../grammar';

export default class DiagnosticProvider 
{
    grammar: Grammar;

    constructor(grammar: Grammar)
    {
        this.grammar = grammar;
    }

    public async provideDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection, token: vscode.CancellationToken) 
    {
       /* if (document && document.fileName.endsWith('4ml')) 
        {
            collection.set(document.uri, [{

            }]);
        }
        else
        {
            collection.clear();
        }*/
        return null;
    }
}