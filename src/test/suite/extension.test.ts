import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as FormulaDiagnostics from '../../extension/diagnostics';

suite('Extension Test Suite', () => {
  test('Diagnostics Generic', () => {
    let strCmt = "// This is a comment.";  
    let strNoCmt = "This is a comment.";
    let cmt = FormulaDiagnostics.checkForSingleLineComments(strCmt);
    let noCmt = FormulaDiagnostics.checkForSingleLineComments(strNoCmt);

    assert.strictEqual(true, cmt);
    assert.strictEqual(false, noCmt);
  });

  test('Diagnostics Detect Closing Bracket', () => {
    let strBracket = "}";  
    let strNoBracket = "This doesn't contain a bracket.";
    let bracket = FormulaDiagnostics.checkForClosingBracket(strBracket);
    let noBracket = FormulaDiagnostics.checkForSingleLineComments(strNoBracket);

    assert.strictEqual(true, bracket);
    assert.strictEqual(false, noBracket);
  });

  test('Diagnostics Detect Definition', () => {
    let line: vscode.TextLine = {
      lineNumber: 0,
      text: "transform A extends B",
      range: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,20)),
      rangeIncludingLineBreak: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,20)),
      firstNonWhitespaceCharacterIndex: 0,
      isEmptyOrWhitespace: false
    };
    let line2: vscode.TextLine = {
      lineNumber: 1,
      text: "returns",
      range: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,6)),
      rangeIncludingLineBreak: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,6)),
      firstNonWhitespaceCharacterIndex: 0,
      isEmptyOrWhitespace: false
    };
    let line3: vscode.TextLine = {
      lineNumber: 0,
      text: "A ::= B + C.",
      range: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,20)),
      rangeIncludingLineBreak: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,20)),
      firstNonWhitespaceCharacterIndex: 0,
      isEmptyOrWhitespace: false
    };
    let line4: vscode.TextLine = {
      lineNumber: 1,
      text: "D ::= E + F.",
      range: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,6)),
      rangeIncludingLineBreak: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,6)),
      firstNonWhitespaceCharacterIndex: 0,
      isEmptyOrWhitespace: false
    };
    let def = FormulaDiagnostics.checkForDefinition(line,line2);
    let noDef = FormulaDiagnostics.checkForDefinition(line3,line4);

    assert.strictEqual(true, def);
    assert.strictEqual(false, noDef);
  });
});
