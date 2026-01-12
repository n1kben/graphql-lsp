#!/usr/bin/env node

const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
  DefinitionParams,
  HoverParams,
  DocumentSymbolParams,
  SymbolKind,
} = require('vscode-languageserver/node');

const { TextDocument } = require('vscode-languageserver-textdocument');

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents = new TextDocuments(TextDocument);

// Parse GraphQL definitions from a document
function parseGraphQLDefinitions(document) {
  const text = document.getText();
  const lines = text.split('\n');
  const definitions = [];

  const definitionPattern = /^(type|enum|union|interface|scalar|input)\s+(\w+)([^a-zA-Z0-9_]|$)/;

  let currentDoc = [];
  let inMultiLineComment = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Handle multi-line comments (""")
    if (trimmed.startsWith('"""')) {
      currentDoc.push(line);
      // Check if it's a single-line """ comment """
      const quoteCount = (trimmed.match(/"""/g) || []).length;
      if (quoteCount === 2) {
        // Single line comment, don't change state
        return;
      }
      // Toggle multi-line comment state
      inMultiLineComment = !inMultiLineComment;
      return;
    }

    // If we're inside a multi-line comment, collect the line
    if (inMultiLineComment) {
      currentDoc.push(line);
      return;
    }

    // Handle single-line comments (#)
    if (trimmed.startsWith('#')) {
      currentDoc.push(line);
      return;
    }

    // Check if line is a definition
    const match = line.match(definitionPattern);
    if (match) {
      const [, kind, name] = match;
      definitions.push({
        kind,
        name,
        line: index,
        text: line.trim(),
        documentation: currentDoc.length > 0 ? currentDoc.join('\n') : null,
      });
      currentDoc = [];
    } else if (trimmed.length > 0) {
      // Reset doc if we hit a non-empty, non-doc line
      currentDoc = [];
    }
  });

  return definitions;
}

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      definitionProvider: true,
      hoverProvider: true,
      documentSymbolProvider: true,
    },
  };
});

// Go to definition
connection.onDefinition((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const position = params.position;
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Get word at cursor
  const wordPattern = /[a-zA-Z0-9_]+/g;
  let match;
  let word = null;

  while ((match = wordPattern.exec(text)) !== null) {
    if (match.index <= offset && offset <= match.index + match[0].length) {
      word = match[0];
      break;
    }
  }

  if (!word) return null;

  // Find definition
  const definitions = parseGraphQLDefinitions(document);
  const def = definitions.find(d => d.name === word);

  if (!def) return null;

  return {
    uri: params.textDocument.uri,
    range: {
      start: { line: def.line, character: 0 },
      end: { line: def.line, character: def.text.length },
    },
  };
});

// Built-in GraphQL scalar types
const BUILTIN_SCALARS = {
  String: 'The String scalar type represents textual data, represented as UTF-8 character sequences.',
  Int: 'The Int scalar type represents non-fractional signed whole numeric values. Int can represent values between -(2^31) and 2^31 - 1.',
  Float: 'The Float scalar type represents signed double-precision fractional values as specified by IEEE 754.',
  Boolean: 'The Boolean scalar type represents true or false.',
  ID: 'The ID scalar type represents a unique identifier, often used to refetch an object or as the key for a cache. The ID type is serialized in the same way as a String.',
};

// Hover
connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const position = params.position;
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Get word at cursor
  const wordPattern = /[a-zA-Z0-9_]+/g;
  let match;
  let word = null;

  while ((match = wordPattern.exec(text)) !== null) {
    if (match.index <= offset && offset <= match.index + match[0].length) {
      word = match[0];
      break;
    }
  }

  if (!word) return null;

  // Check if it's a built-in scalar
  if (BUILTIN_SCALARS[word]) {
    return {
      contents: {
        kind: 'markdown',
        value: '```graphql\nscalar ' + word + '\n```\n\n' + BUILTIN_SCALARS[word],
      },
    };
  }

  // Find definition
  const definitions = parseGraphQLDefinitions(document);
  const def = definitions.find(d => d.name === word);

  if (!def) return null;

  // Get full definition (including fields for types, enums, and multi-line unions)
  const lines = text.split('\n');
  let fullDef = lines[def.line];

  // If it's a type/interface/input/enum with braces, include everything inside
  if (['type', 'interface', 'input', 'enum'].includes(def.kind)) {
    let endLine = def.line + 1;
    let braceCount = (fullDef.match(/{/g) || []).length - (fullDef.match(/}/g) || []).length;

    while (endLine < lines.length && braceCount > 0) {
      const line = lines[endLine];
      fullDef += '\n' + line;
      braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      endLine++;
    }
  }
  // For unions, check if they span multiple lines
  else if (def.kind === 'union') {
    let endLine = def.line + 1;
    // Continue if the next line starts with | (multi-line union)
    while (endLine < lines.length && lines[endLine].trim().startsWith('|')) {
      fullDef += '\n' + lines[endLine];
      endLine++;
    }
  }

  // Build hover content with documentation as comments
  let hoverContent = '```graphql\n';

  // Add documentation if present
  if (def.documentation) {
    hoverContent += def.documentation + '\n';
  }

  hoverContent += fullDef + '\n```';

  return {
    contents: {
      kind: 'markdown',
      value: hoverContent,
    },
  };
});

// Document symbols (for outline)
connection.onDocumentSymbol((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const definitions = parseGraphQLDefinitions(document);

  const symbolKindMap = {
    type: SymbolKind.Class,
    enum: SymbolKind.Enum,
    union: SymbolKind.Interface,
    interface: SymbolKind.Interface,
    scalar: SymbolKind.Constant,
    input: SymbolKind.Struct,
  };

  return definitions.map(def => ({
    name: def.name,
    kind: symbolKindMap[def.kind] || SymbolKind.Class,
    range: {
      start: { line: def.line, character: 0 },
      end: { line: def.line, character: def.text.length },
    },
    selectionRange: {
      start: { line: def.line, character: 0 },
      end: { line: def.line, character: def.text.length },
    },
  }));
});

documents.listen(connection);
connection.listen();
