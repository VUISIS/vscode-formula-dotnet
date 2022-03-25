import * as vscode from 'vscode';
import Parser, { Tree } from "web-tree-sitter";
import * as path from 'path';

export default class Grammar 
{
    readonly lang: string;
    parser: Parser;
    tstree: Map<vscode.Uri, Tree> = new Map<vscode.Uri, Tree>();
    parserPromise = Parser.init();
    includedTypes : Set<string> = new Set();

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
        const langObj = await Parser.Language.load(langFile);
        this.parser.setLanguage(langObj);
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

    parse(tree: Parser.Tree) 
    {
        let terms: { term: string; parentType: string, range: vscode.Range }[] = [];
        if(tree)
        {
            let cursor = tree.walk();
            let reachedRoot = false;
            while(reachedRoot === false)
            {   
                let type = cursor.currentNode().type;
                //console.log("--------------------------");
                //console.log(type);
                let node = cursor.currentNode();
                let name = node.text;
                //console.log(name);
                //console.log("--------------------------");

                let range = new vscode.Range(new vscode.Position(node.startPosition.row, node.startPosition.column),
                                                new vscode.Position(node.endPosition.row, node.endPosition.column));

                if(this.includedTypes.has(type))
                {
                    terms.push({ term: type, parentType: node.parent.type, range: range});
                }
                
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