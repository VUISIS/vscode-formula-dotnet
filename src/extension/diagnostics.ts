import * as vscode from 'vscode';
import * as path from 'path';

export function updateDiagnostics(collection: vscode.DiagnosticCollection) : void {
	let document = vscode.window.activeTextEditor.document;
	if (document && path.basename(document.uri.fsPath).endsWith('.4ml')) {
		let cols = [];
        let cCC = checkConstructorCase(document);
        if(cCC.length > 0)
        {
            for(let i = 0;i < cCC.length;++i)
            {
                cols.push(cCC[i]);
            }
        }
           
        let cFE = checkForExpression(document);
        if(cFE.length > 0)
        {
            for(let i = 0;i < cFE.length;++i)
            {
                cols.push(cFE[i]);
            }
        }

        let cSE = checkForSubExpression(document);
        if(cSE.length > 0)
        {
            for(let i = 0;i < cSE.length;++i)
            {
                cols.push(cSE[i]);
            }
        }

        let cCE = checkConformsExpression(document);
        if(cCE.length > 0)
        {
            for(let i = 0;i < cCE.length;++i)
            {
                cols.push(cCE[i]);
            }
        }

		collection.set(document.uri, cols);
	} else {
		collection.clear();
	}
}

function checkConstructorCase(document: vscode.TextDocument) : Array<{}>
{
    let cols = [];
    let re = new RegExp('::=', 'g');
    let match;
    let txt = document.getText();
    while ((match = re.exec(txt)) != null) 
    {
        let pos = document.positionAt(match.index);
        let line = document.lineAt(pos.line);
        let whitespaceRemoved = line.text.replace(/\s/g, "");
        let dotReg = new RegExp('[\)]$', 'g');;
        let endOfLine = dotReg.exec(whitespaceRemoved);
        let check = checkForSingleLineComments(whitespaceRemoved);
        if(endOfLine === null || 
           endOfLine.length <= 0 ||
           whitespaceRemoved.endsWith(".") ||
           check)
        {
            continue;
        }
        else
        {
            cols.push({
                code: '',
                message: "Constructor statements end with a '.'",
                range: new vscode.Range(line.range.end, line.range.end.translate(0,1)),
                severity: vscode.DiagnosticSeverity.Error
            });
        }
    }
    return cols;
} 

function checkForSingleLineComments(text: string) : boolean
{
    let re = new RegExp('^\/+', 'g');
    return re.test(text);
}

function checkForExpression(document: vscode.TextDocument) : Array<{}>
{
    let cols = [];
    let re = new RegExp('[\+]', 'g');
    let match;
    let txt = document.getText();
    while ((match = re.exec(txt)) != null) 
    {
        let pos = document.positionAt(match.index);
        let line = document.lineAt(pos.line);
        let whitespaceRemoved = line.text.replace(/\s/g, "");
        let dotReg = new RegExp('[a-z]$', 'g');;
        let endOfLine = dotReg.exec(whitespaceRemoved);
        let check = checkForSingleLineComments(whitespaceRemoved);
        if(endOfLine === null || 
           endOfLine.length <= 0 ||
           whitespaceRemoved.endsWith(".") ||
           check)
        {
            continue;
        }
        else
        {
            cols.push({
                code: '',
                message: "Expression statements end with a '.'",
                range: new vscode.Range(line.range.end, line.range.end.translate(0,1)),
                severity: vscode.DiagnosticSeverity.Error
            });
        }
    }
    return cols;
}


function checkForSubExpression(document: vscode.TextDocument) : Array<{}>
{
    let cols = [];
    let re = new RegExp('(::=)', 'g');
    let match;
    let txt = document.getText();
    while ((match = re.exec(txt)) != null) 
    {
        let pos = document.positionAt(match.index);
        let line = document.lineAt(pos.line);
        let whitespaceRemoved = line.text.replace(/\s/g, "");
        let check = checkForSingleLineComments(whitespaceRemoved);
        if(whitespaceRemoved.endsWith(".") ||
           check)
        {
            continue;
        }
        else if(whitespaceRemoved.endsWith(","))
        {
            let flag = true;
            let nextPos = pos.translate(1,0);
            let nextLine = document.lineAt(nextPos.line);
            let wsRemoved = nextLine.text.replace(/\s/g, "");
            while(flag)
            {        
                if(wsRemoved.endsWith(","))
                {
                    nextPos = nextPos.translate(1,0);
                    nextLine = document.lineAt(nextPos.line);
                    wsRemoved = nextLine.text.replace(/\s/g, "");
                }
                else if (wsRemoved.endsWith(".") || wsRemoved.endsWith(")"))
                {
                    flag = false;
                }
            }

            if(wsRemoved.endsWith("."))
            {
                continue;
            }
            else
            {
                cols.push({
                    code: '',
                    message: "Sub expression statements end with a '.'",
                    range: new vscode.Range(nextLine.range.end, nextLine.range.end.translate(0,1)),
                    severity: vscode.DiagnosticSeverity.Error
                });
            }
        }
    }
    return cols;
}

function checkConformsExpression(document: vscode.TextDocument) : Array<{}>
{
    let cols = [];
    let re = new RegExp('(conforms)', 'g');
    let match;
    let txt = document.getText();
    while ((match = re.exec(txt)) != null) 
    {
        let pos = document.positionAt(match.index);
        let line = document.lineAt(pos.line);
        let whitespaceRemoved = line.text.replace(/\s/g, "");
        let dotReg = new RegExp('[\|]$', 'g');
        let endOfLine = dotReg.test(whitespaceRemoved);
        let check = checkForSingleLineComments(whitespaceRemoved);
        let checkAfterKeyword = new RegExp('(conforms)$', 'g');
        if(whitespaceRemoved.endsWith(".") ||
           check)
        {
            continue;
        }
        else if(checkAfterKeyword.test(whitespaceRemoved))
        {
            cols.push({
                code: '',
                message: "Conform expressions end with a '.'",
                range: new vscode.Range(line.range.end, line.range.end.translate(0,1)),
                severity: vscode.DiagnosticSeverity.Error
            });
            continue;
        }
        else if(endOfLine)
        {
            let flag = true;
            let nextPos = pos.translate(1,0);
            let nextLine = document.lineAt(nextPos.line);
            let wsRemoved = nextLine.text.replace(/\s/g, "");
            if(checkForSingleLineComments(wsRemoved))
            {
                flag = false;
            }
            let endOfRec = new RegExp('[\|]','g');
            let endOfExpr = new RegExp('[}]$','g');
            while(flag)
            {        
                if(endOfRec.test(wsRemoved))
                {
                    nextPos = nextPos.translate(1,0);
                    nextLine = document.lineAt(nextPos.line);
                    wsRemoved = nextLine.text.replace(/\s/g, "");
                    if(checkForSingleLineComments(wsRemoved))
                    {
                        flag = false;
                    }
                }
                else if (wsRemoved.endsWith(".") || endOfExpr.test(wsRemoved))
                {
                    flag = false;
                }
            }

            if(wsRemoved.endsWith(".") || checkForSingleLineComments(wsRemoved))
            {
                continue;
            }
            else
            {
                cols.push({
                    code: '',
                    message: "Conform expressions end with a '.'",
                    range: new vscode.Range(nextLine.range.end, nextLine.range.end),
                    severity: vscode.DiagnosticSeverity.Error
                });
            }
        }
        else if(whitespaceRemoved.endsWith("}") || whitespaceRemoved.endsWith(")"))
        {
            cols.push({
                code: '',
                message: "Conform expressions end with a '.'",
                range: new vscode.Range(line.range.end, line.range.end),
                severity: vscode.DiagnosticSeverity.Error
            });
        }
    }
    return cols;
}