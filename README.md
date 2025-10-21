# MCP Context Viewer

A web-based tool to analyze and visualize the context that MCP (Model Context Protocol) servers add to conversations, including token counts.

## Features

- Connect to MCP servers via SSE (Server-Sent Events)
- View all available tools, resources, and prompts from the MCP server
- Analyze token usage broken down by category
- Display raw JSON context content
- Modern, responsive UI

## Installation

```bash
npm install
```

## Usage

### Development

```bash
npm run dev
```

This will start the development server at `http://localhost:3000`.

### Build

```bash
npm run build
```

This will create a production build in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Connecting to MCP Servers

### SSE (Server-Sent Events)

1. Select "SSE (Server-Sent Events)" as the connection type
2. Enter the endpoint URL (e.g., `http://localhost:3001/sse`)
3. Click "Connect"

### stdio (Local Command)

**Note:** stdio connections are not supported directly in the browser. You would need to implement a backend proxy that runs the stdio command and exposes it via SSE or WebSocket.

To use stdio connections, you can:
1. Create a simple Node.js backend that runs the MCP server via stdio
2. Expose the MCP server functionality via SSE
3. Connect to that SSE endpoint using this tool

## How It Works

1. **Connection**: Connects to an MCP server using the MCP SDK client
2. **Context Fetching**: Retrieves available tools, resources, and prompts
3. **Token Counting**: Uses `js-tiktoken` with the cl100k_base encoding (same as GPT-4) to count tokens
4. **Visualization**: Displays the context content and token statistics

## Token Counting

Token counts are calculated using the same tokenizer as GPT-4 (cl100k_base). The tool provides:

- **Total Tokens**: Total tokens in all context
- **Tools Tokens**: Tokens used by tool definitions
- **Resources Tokens**: Tokens used by resource definitions
- **Prompts Tokens**: Tokens used by prompt definitions

## Technology Stack

- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **MCP SDK**: Official Model Context Protocol SDK
- **js-tiktoken**: Token counting library
- **Vanilla JS/CSS**: No heavy framework dependencies

## Project Structure

```
mcp_viewer/
├── src/
│   ├── main.ts           # Main application logic
│   ├── mcpClient.ts      # MCP client wrapper
│   ├── tokenCounter.ts   # Token counting utilities
│   └── style.css         # Styling
├── index.html            # HTML template
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── vite.config.ts        # Vite config
```

## Example MCP Servers

You can test with example MCP servers:

- `@modelcontextprotocol/server-everything`: A demo server with various capabilities
- Custom MCP servers that implement the MCP protocol

## Browser Limitations

Due to browser security restrictions:

- **stdio connections**: Not directly supported (requires backend proxy)
- **CORS**: The MCP server must have appropriate CORS headers for browser connections
- **Local servers**: May need to be exposed via HTTP/SSE rather than stdio

## Contributing

Feel free to submit issues or pull requests to improve the tool.

## License

MIT
