# GraphQL LSP

A simple, zero-configuration GraphQL Language Server Protocol implementation.

## Features

- **No configuration required** - Works immediately without `.graphqlrc` or schema files
- **Go to definition** - Jump to type, enum, union, interface, scalar, and input definitions
- **Hover documentation** - View complete type definitions and documentation on hover
- **Document symbols** - See all definitions in the outline/symbol list
- **Built-in types** - Includes documentation for GraphQL's built-in scalar types (String, Int, Float, Boolean, ID)

## Installation

### NPM

```bash
npm install -g @n1kben/graphql-lsp
```

### From source

```bash
git clone https://github.com/n1kben/graphql-lsp.git
cd graphql-lsp
npm install
npm link
```

## Editor Setup

### Neovim

Create a file at `~/.config/nvim/lsp/graphql.lua`:

```lua
return {
  cmd = { "graphql-lsp", "--stdio" },
  filetypes = { "graphql" },
}
```

If you're using a custom LSP setup, you can configure it like this:

```lua
local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

-- Register the GraphQL LSP
if not configs.graphql then
  configs.graphql = {
    default_config = {
      cmd = { 'graphql-lsp', '--stdio' },
      filetypes = { 'graphql' },
      root_dir = lspconfig.util.root_pattern('.git', 'package.json'),
      single_file_support = true,
    },
  }
end

lspconfig.graphql.setup{}
```

### VS Code

Add to your `settings.json`:

```json
{
  "graphql.lsp": {
    "command": "graphql-lsp",
    "args": ["--stdio"]
  }
}
```

### Other Editors

Any editor that supports LSP can use this server. Configure it to run:

```bash
graphql-lsp --stdio
```

## Usage

Once installed and configured, the LSP will automatically provide:

1. **Go to Definition** - Place cursor on a type name and use your editor's "go to definition" command
2. **Hover Information** - Hover over any type to see its complete definition and documentation
3. **Document Outline** - Use your editor's symbol/outline view to see all GraphQL definitions

### Supported GraphQL Definitions

- `type` - Object types
- `interface` - Interface types
- `enum` - Enumeration types
- `union` - Union types
- `scalar` - Scalar types
- `input` - Input object types

### Documentation Comments

The LSP recognizes both GraphQL documentation styles:

```graphql
"""
Multi-line documentation
for types and fields
"""
type User {
  id: ID!
}

# Single line comment
enum Role {
  ADMIN
  USER
}
```

## Why This LSP?

Most GraphQL language servers require configuration files (`.graphqlrc`, `graphql.config.js`) and schema setup. This LSP is designed for:

- Quick editing of standalone GraphQL files
- Projects where you don't want to set up full GraphQL tooling
- Simple schema exploration and editing
- Working with GraphQL files without a complex project structure

## Limitations

- Single file support only (no cross-file references)
- No query/mutation validation against a schema
- No field-level go-to-definition within types
- No autocomplete (yet)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

n1kben
