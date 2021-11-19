import * as vscode from 'vscode';
import * as path from 'path';

export function updateDiagnostics(collection: vscode.DiagnosticCollection) : void {
	let document = vscode.window.activeTextEditor.document;
	if (document && path.basename(document.uri.fsPath).endsWith('.4ml')) {
		let cols = [];
        let cGC = checkGenericCase(document);
        if(cGC.length > 0)
        {
            for(let i = 0;i < cGC.length;++i)
            {
                cols.push(cGC[i]);
            }
        }

		collection.set(document.uri, cols);
	} else {
		collection.clear();
	}
}

function checkGenericCase(document: vscode.TextDocument) : Array<{}>
{
    let cols = [];
    for(let i = 0;i < document.lineCount;++i)
    {
        let line = document.lineAt(i);
        let match =/([\)}]$)|([a-zA-Z0-9]$)/g.test(line.text);
        if(match)
        {
            let whitespaceRemoved = line.text.replace(/\s/g, "");
            let isComment = checkForSingleLineComments(whitespaceRemoved);
            let isClosingBracket = checkForClosingBracket(whitespaceRemoved);
            let isDefinition = false;
            if((i+1) < document.lineCount)
            {
                let nextLine = document.lineAt(i+1);
                isDefinition = checkForDefinition(line, nextLine);
            }
            if(isDefinition ||
               isClosingBracket ||
               isComment)
            {
                continue;
            }
            else
            {
                cols.push({
                    code: '',
                    message: "Statements end in a '.' or ','",
                    range: new vscode.Range(line.range.end, line.range.end.translate(0,1)),
                    severity: vscode.DiagnosticSeverity.Error
                });
            }
        }
    }
    return cols;
}

function checkForDefinition(line: vscode.TextLine, nextLine: vscode.TextLine) : boolean
{
    let re = /(requires|ensures|initially|next|domain|model|transform|returns|machine)/g;
    let re2 = /({|returns)/g;
    console.log(nextLine.text);
    return re.test(line.text) && re2.test(nextLine.text);
}

function checkForSingleLineComments(text: string) : boolean
{
    let re = /(^ *)(\/.*)/g;
    return re.test(text);
}

function checkForClosingBracket(text: string) : boolean
{
    if(text.includes("}") &&
       text.length < 2)
    {
        return true;
    }
    return false;
}