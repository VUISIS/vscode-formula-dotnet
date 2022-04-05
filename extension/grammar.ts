import * as vscode from 'vscode';
import Parser, { Tree } from "web-tree-sitter";
import * as path from 'path';

export enum QUERY_TYPE {
    MATCH,
    CAPTURE
}

export default class Grammar 
{
    private readonly lang: string;
    private parser: Parser;
    private tstree: Map<vscode.Uri, Tree> = new Map<vscode.Uri, Tree>();
    private parserPromise = Parser.init();
    private includedTypes : Set<string> = new Set();
    private formula: Parser.Language;

    constructor(lang: string) {
        this.lang = lang;

        this.includedTypes.add("domain");
        this.includedTypes.add("model");
        this.includedTypes.add("conforms");
        this.includedTypes.add("no");
        this.includedTypes.add("new");
        this.includedTypes.add("::=");
        this.includedTypes.add(":");
        this.includedTypes.add("|");
        this.includedTypes.add("is");
        this.includedTypes.add(">");
        this.includedTypes.add("<");
        this.includedTypes.add("<=");
        this.includedTypes.add(">=");
        this.includedTypes.add("=>");
        this.includedTypes.add("!=");
        this.includedTypes.add("of");
        this.includedTypes.add("constant");
        this.includedTypes.add("real");
        this.includedTypes.add("digits");
        this.includedTypes.add("=");
        this.includedTypes.add("comment");
        this.includedTypes.add("compr");
        this.includedTypes.add(".");
        this.includedTypes.add(":-");
        this.includedTypes.add("partial");
        this.includedTypes.add("transform");
        this.includedTypes.add("enum_cnst");
        this.includedTypes.add("string");
        this.includedTypes.add("fun");
        this.includedTypes.add("any");
        this.includedTypes.add("mod_ref");
        this.includedTypes.add("func_term");
        this.includedTypes.add("id");
        this.includedTypes.add("unnbody");
        this.includedTypes.add("func_term_list");
        this.includedTypes.add("func_or_compr");
    }

    async init() {
        await this.parserPromise;
        this.parser = new Parser();
        let langFile = path.join(__dirname, "../../parser/tree-sitter-formula.wasm");
        this.formula = await Parser.Language.load(langFile);
        this.parser.setLanguage(this.formula);
    }

    public tree(doc: vscode.TextDocument) {
        if(this.tstree.has(doc.uri))
        {
            return;
        }
        this.tstree.set(doc.uri, this.parser.parse(doc.getText()));
    }

    getTree(doc: vscode.TextDocument)
    {
        return this.tstree.get(doc.uri);
    }

    docExists(doc: vscode.TextDocument)
    {
        if(this.tstree.has(doc.uri))
        {
            return true;
        }
        return false;
    }

    updateTree(event: vscode.TextDocumentChangeEvent)
    {
        if(event.contentChanges.length === 0)
        {
            return;
        }

        for(const e of event.contentChanges)
        {
            const startIndex = e.rangeOffset;
			const oldEndIndex = e.rangeOffset + e.rangeLength;
			const newEndIndex = e.rangeOffset + e.text.length;
			const startPos = event.document.positionAt(startIndex);
			const oldEndPos = event.document.positionAt(oldEndIndex);
			const newEndPos = event.document.positionAt(newEndIndex);
			const startPosition = this.asPoint(startPos);
			const oldEndPosition = this.asPoint(oldEndPos);
			const newEndPosition = this.asPoint(newEndPos);
			const delta = {startIndex, oldEndIndex, newEndIndex, startPosition, oldEndPosition, newEndPosition};
			const tree = this.tstree.get(event.document.uri);
            if(tree !== undefined)
            {
                tree.edit(delta);
            }
        }
        this.tstree.set(event.document.uri, this.parser.parse(event.document.getText(), this.tstree.get(event.document.uri)));
    }

    asPoint(pos: vscode.Position): Parser.Point 
    {
		return {row: pos.line, column: pos.character};
	}

    query(query: string, doc: vscode.TextDocument, type: QUERY_TYPE) : (Parser.QueryMatch[] | Parser.QueryCapture[])
    {
        const pq = this.formula.query(query);
        let matches: (Parser.QueryMatch[] | Parser.QueryCapture[]);
        if(type === QUERY_TYPE.MATCH)
        {
            matches = pq.matches(this.getTree(doc).rootNode);
        }
        else if (type === QUERY_TYPE.CAPTURE)
        {
            matches = pq.captures(this.getTree(doc).rootNode);
        }
        return matches;
    }

    parse(tree: Parser.Tree) 
    {
        let terms: { term: string, parentTerm: any, range: vscode.Range, text: string }[] = [];
        if(tree)
        {
            let cursor = tree.walk();
            let reachedRoot = false;
            while(reachedRoot === false)
            {   
                let node = cursor.currentNode();
                let type = node.type;
                let txt = node.text;

                let range = new vscode.Range(new vscode.Position(node.startPosition.row, node.startPosition.column),
                                            new vscode.Position(node.endPosition.row, node.endPosition.column));

                terms.push({ term: type, parentTerm: node.parent, range: range, text: txt});
                
                if(cursor.gotoFirstChild())
                {
                    continue;
                }

                if(cursor.gotoNextSibling())
                {
                    continue;
                }

                let retracing = true;
                while(retracing)
                {
                    if(!cursor.gotoParent())
                    {
                        retracing = false;
                        reachedRoot = true;
                    }

                    if(cursor.gotoNextSibling())
                    {
                        retracing = false;
                    }
                }
            }
        }
        return terms;
    }
}