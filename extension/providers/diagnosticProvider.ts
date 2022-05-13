import * as vscode from 'vscode';
import Grammar, { QUERY_TYPE } from '../grammar';
import * as fs from 'fs';
import * as path from 'path';
import { QueryCapture } from 'web-tree-sitter';

export default class DiagnosticProvider 
{
    private grammar: Grammar;
    private lintingFile : string | undefined = undefined;

    constructor(grammar: Grammar)
    {
        this.grammar = grammar;

        this.lintingFile = "";

        const data = fs.readFileSync(path.join(__dirname, "../../queries/linting.scm"), "utf-8");
        data.split(/\r?\n/).forEach(line => {
            if(!line.includes("<!--"))
            {
                this.lintingFile += line + '\n';
            }
        });
    }

    public async provideDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection, token: vscode.CancellationToken) 
    {
        let diagnostics: vscode.Diagnostic[] = [];

        if(this.lintingFile && document.isDirty)
        {
            const caps = this.grammar.query(this.lintingFile, document, QUERY_TYPE.CAPTURE) as QueryCapture[];

            collection.set(document.uri, diagnostics);
        }
        return collection;
    }
}