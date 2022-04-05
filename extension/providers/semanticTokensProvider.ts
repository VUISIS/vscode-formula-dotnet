import * as vscode from 'vscode';
import Grammar, { QUERY_TYPE } from '../grammar';
import * as fs from 'fs';
import * as path from 'path';
import { QueryCapture } from 'web-tree-sitter';

const ch = vscode.window.createOutputChannel("semanticTokensProvider");
export default class SemanticTokensProvider implements vscode.DocumentSemanticTokensProvider
{
    private grammar: Grammar;
    private tokensBuilder: vscode.SemanticTokensBuilder;

    private tokenTypes = ["namespace", "type", "class", "enum", "interface", "struct", "typeParameter",
                          "parameter", "variable", "property", "enumMember", "event", "function", "member",
                          "macro", "label", "comment", "string", "keyword", "number", "regexp", "operator", 
                          "method"];
    private tokenModifiers = ["declaration", "readonly", "static", "deprecated", "abstract", "async", 
                              "modification", "documentation", "defaultLibrary"];
    private legend : vscode.SemanticTokensLegend = null;

    private highlightFile : string | undefined = undefined;

    constructor(grammar: Grammar)
    {
        this.legend = new vscode.SemanticTokensLegend(this.tokenTypes, this.tokenModifiers);
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

    public getLegend() : vscode.SemanticTokensLegend
    {
        return this.legend;
    }

    public async provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SemanticTokens> 
    {
        ch.clear();
        this.tokensBuilder = new vscode.SemanticTokensBuilder(this.legend);
        
        if(this.highlightFile)
        {
            const caps = this.grammar.query(this.highlightFile, document, QUERY_TYPE.CAPTURE) as QueryCapture[];
            for(let cap of caps)
            {
                let name = cap.name.trim();

                let range = new vscode.Range(new vscode.Position(cap.node.startPosition.row,cap.node.startPosition.column), 
                                                        new vscode.Position(cap.node.endPosition.row,cap.node.endPosition.column));
                if(range.start.line === range.end.line)
                {
                    ch.appendLine(name);
                    switch(name)
                    {
                        case "keyword":
                            this.tokensBuilder.push(range, 'keyword', ["declaration"]);                   
                            break;                                   
                       case "comment":
                            this.tokensBuilder.push(range, 'comment', ["declaration"]);                   
                            break;
                        case "number":
                            this.tokensBuilder.push(range, 'number', ["declaration"]);                   
                            break;
                        case "string":
                            this.tokensBuilder.push(range, 'string', ["declaration"]);                   
                            break;
                        case "type":
                            this.tokensBuilder.push(range, 'type', ["declaration"]);                   
                            break;
                        case "function.builtin":
                            this.tokensBuilder.push(range, 'function', ["declaration"]);                   
                            break;
                        case "operator":
                            this.tokensBuilder.push(range, 'operator', ["declaration"]);                   
                            break;
                        case "variable.builtin":
                            this.tokensBuilder.push(range, 'variable', ["declaration"]);                   
                            break;
                        case "constant.builtin":
                            this.tokensBuilder.push(range, 'enum', ["declaration"]);                   
                            break;
                        case "attribute":
                            this.tokensBuilder.push(range, 'parameter', ["declaration"]);                   
                            break;
                        case "module":
                            this.tokensBuilder.push(range, 'interface', ["declaration"]);                   
                            break;
                        case "function":
                            this.tokensBuilder.push(range, 'method', ["declaration"]);                   
                            break;
                        case "constructor":
                            this.tokensBuilder.push(range, 'class', ["declaration"]);                   
                            break;
                        default:
                            break;
                    }
                }
                else if(range.start.line !== range.end.line && 
                        cap.name === "comment")
                {
                    for(let l = range.start.line;l <= range.end.line;++l)
                    {
                        let endCol = document.lineAt(l).range.end.character;
                        let startCol = document.lineAt(l).range.start.character;
                        let tempRange = new vscode.Range(new vscode.Position(l,startCol), 
                                                        new vscode.Position(l,endCol));
                        this.tokensBuilder.push(tempRange, 'comment', ["declaration"]);                   
                    }
                }
            }
        }
        
        return this.tokensBuilder.build();
    }
}