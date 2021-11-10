import {
	createConnection,
	Diagnostic,
	InitializeParams,
	DidChangeConfigurationNotification,
	InitializeResult,
	ProposedFeatures,
	CompletionItem,
	CompletionItemKind,
    TextDocuments,
	TextDocumentPositionParams,
	TextDocumentSyncKind
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((_params: InitializeParams) => {
	let capabilities = _params.capabilities;

	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: {
				openClose: true,
				change: TextDocumentSyncKind.None
			},
            codeActionProvider: false,
            hoverProvider: false
		}
	};

	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}

	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

interface Settings {
	maxNumberOfProblems: number;
}

let workspaceFolder: string | null;

const defaultSettings: Settings = { maxNumberOfProblems: 1000 };
let globalSettings: Settings = defaultSettings;

let documentSettings: Map<string, Thenable<Settings>> = new Map();

documents.onDidOpen((event) => {
	connection.console.log(`[Server(${process.pid}) ${workspaceFolder}] Document opened: ${event.document.uri}`);
});

connection.onDidChangeConfiguration(_change => {
	documents.all().forEach(validateTextDocument);
});

documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

function getDocumentSettings(resource: string): Thenable<Settings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'Formula'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

async function validateTextDocument(textDocument: TextDocument) {
	try 
	{
		const version = textDocument.version;
		const diagnostics: Diagnostic[] = [];
		if (textDocument.languageId === 'formula') 
		{
			const latestTextDocument = documents.get(textDocument.uri);
			if (latestTextDocument && latestTextDocument.version === version) 
			{
				const settings = await getDocumentSettings(textDocument.uri);
				connection.sendDiagnostics({ uri: latestTextDocument.uri, diagnostics });
			}
		}
	} 
	catch (e) 
	{
		connection.console.error(`Error while validating ${textDocument.uri}`);
		connection.console.error(String(e));
	}
}

connection.onDidChangeWatchedFiles(_change => {
	connection.console.log('We received a file change event');
});

connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
	  return [
		{
		  label: 'Formula',
		  kind: CompletionItemKind.Text,
		  data: 1
		}
	  ];
	}
  );

connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
	  if (item.data === 1) {
		item.detail = 'Formula details';
		item.documentation = 'Formula documentation';
	  } 
	  return item;
	}
);

documents.listen(connection);

connection.listen();