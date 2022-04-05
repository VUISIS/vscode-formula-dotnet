import * as vscode from 'vscode';
import Grammar, { QUERY_TYPE } from '../grammar';
import * as path from 'path';
import * as fs from 'fs';
import { QueryCapture } from 'web-tree-sitter';

export default class TypeHoverProvider implements vscode.HoverProvider
{
    private grammar: Grammar;
    private highlightFile: string | undefined = undefined;

    constructor(grammar: Grammar)
    {
        this.grammar = grammar;

        this.highlightFile = "";

        const data = fs.readFileSync(path.join(__dirname, "../../queries/highlight.scm"), "utf-8");
        data.split(/\r?\n/).forEach(line => {
            if(!line.includes("<!--"))
            {
                this.highlightFile += line + '\n';
            }
        });
    }

    async provideHover(
        doc: vscode.TextDocument,
        pos: vscode.Position,
        token: vscode.CancellationToken): Promise<vscode.Hover>
    {
        let hover: vscode.Hover | undefined = undefined;
        if(this.highlightFile)
        {
            const caps = this.grammar.query(this.highlightFile, doc, QUERY_TYPE.CAPTURE) as QueryCapture[];
            for(let cap of caps)
            {
                let range = new vscode.Range(new vscode.Position(cap.node.startPosition.row,cap.node.startPosition.column), 
                                                        new vscode.Position(cap.node.endPosition.row,cap.node.endPosition.column));
                if(range.start.line === range.end.line &&
                   range.contains(pos))
                {
                    switch(cap.name)
                    {
                        case "keyword":
                            hover = new vscode.Hover("keyword", doc.getWordRangeAtPosition(pos));
                            break;
                        case "comment":
                            hover = new vscode.Hover("comment", doc.getWordRangeAtPosition(pos));
                            break;
                        case "number":
                            hover = new vscode.Hover("number", doc.getWordRangeAtPosition(pos));
                            break;           
                        default:
                            break;
                    }
                }
            }
        }

        return hover;
    }
}