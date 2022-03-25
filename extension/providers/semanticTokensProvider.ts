import * as vscode from 'vscode';
import Grammar from '../grammar';

export default class SemanticTokensProvider implements vscode.DocumentSemanticTokensProvider
{
    grammar: Grammar;
    tokensBuilder: vscode.SemanticTokensBuilder;

    private tokenTypes = ["namespace", "type", "class", "enum", "interface", "struct", "typeParameter",
                          "parameter", "variable", "property", "enumMember", "event", "function", "member",
                          "macro", "label", "comment", "string", "keyword", "number", "regexp", "operator", 
                          "method"];
    private tokenModifiers = ["declaration", "readonly", "static", "deprecated", "abstract", "async", 
                              "modification", "documentation", "defaultLibrary"];
    private legend : vscode.SemanticTokensLegend = null;

    constructor(grammar: Grammar)
    {
        this.legend = new vscode.SemanticTokensLegend(this.tokenTypes, this.tokenModifiers);
        this.grammar = grammar;
    }

    public getLegend() : vscode.SemanticTokensLegend
    {
        return this.legend;
    }

    public async provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SemanticTokens> 
    {
        this.tokensBuilder = new vscode.SemanticTokensBuilder(this.legend);
        const tree = this.grammar.getTree(vscode.window.activeTextEditor.document);
        const terms = this.grammar.parse(tree);
        for(var t of terms)
        {
            if(t.range.isSingleLine)
            {
                if(t.term === 'unnbody')
                {
                    this.tokensBuilder.push(t.range, 'type', ['declaration']);                   
                }
                else if(t.term === 'mod_ref')
                {
                    this.tokensBuilder.push(t.range, 'interface', ['declaration']);
                }
                else if(t.term === 'func_term_list')
                {
                    if(t.parentType === 'rule')
                    {
                        this.tokensBuilder.push(t.range, 'typeParameter', ['declaration']);
                    }
                }
                else if(t.term === 'func_or_compr')
                {
                    if(t.parentType === 'func_term_list')
                    {
                        this.tokensBuilder.push(t.range, 'property', ['declaration']);
                    }
                }
                else if(t.term === 'domain' ||
                        t.term === 'model' ||
                        t.term === 'transform' ||
                        t.term === 'new' ||
                        t.term === 'is' ||
                        t.term === 'of' ||
                        t.term === 'conforms' ||
                        t.term === 'no' ||
                        t.term === 'any' ||
                        t.term === 'fun')
                {
                    this.tokensBuilder.push(t.range, 'keyword', ['declaration']);
                }
                else if(t.term === '::=' ||
                        t.term === ':' ||
                        t.term === '|' ||
                        t.term === '>' ||
                        t.term === '<' ||
                        t.term === '<=' ||
                        t.term === '>=' ||
                        t.term === '!=' ||
                        t.term === '=>' ||
                        t.term === '=' ||
                        t.term === '.' ||
                        t.term === ':-')
                {
                    this.tokensBuilder.push(t.range, 'operator', ['declaration']);
                }
                else if(t.term === 'constant' ||
                        t.term === 'real' ||
                        t.term === 'digits')
                {
                    this.tokensBuilder.push(t.range, 'number', ['declaration']);
                }
                else if(t.term === 'comment')
                {
                    this.tokensBuilder.push(t.range, 'comment', ['declaration']);
                }
                else if(t.term === 'partial' ||
                        t.term === 'transform')
                {
                    this.tokensBuilder.push(t.range, 'method', ['declaration']);
                }
                else if(t.term === 'enum_cnst')
                {
                    this.tokensBuilder.push(t.range, 'enum', ['declaration']);
                }
                else if(t.term === 'string')
                {
                    this.tokensBuilder.push(t.range, 'string', ['declaration']);
                }
                else if(t.term === 'compr')
                {
                    let firstBrace = new vscode.Range(new vscode.Position(t.range.start.line, t.range.start.character),
                                                        new vscode.Position(t.range.start.line, t.range.start.character + 1));
                    this.tokensBuilder.push(firstBrace, 'operator', ['declaration']);
    
                    let lastBrace = new vscode.Range(new vscode.Position(t.range.end.line, t.range.end.character - 1),
                                                        new vscode.Position(t.range.end.line, t.range.end.character));
                    this.tokensBuilder.push(lastBrace, 'operator', ['declaration']);
                }
                else if(t.term === 'id')
                {
                    if(t.parentType === 'func_term')
                    {
                        this.tokensBuilder.push(t.range, 'function', ['declaration']);
                    }
                }
            }
            else
            {
                if(t.term === 'comment')
                {
                    for(var i = t.range.start.line;i <= t.range.end.line;++i)
                    {
                        let range = new vscode.Range(new vscode.Position(i, 0),
                                                     new vscode.Position(i, document.lineAt(i).range.end.character));
                        this.tokensBuilder.push(range, 'comment', ['declaration']);
                    }                    
                }
            }
        }
        return this.tokensBuilder.build();
    }
}