# MCP Context Viewer

A web-based tool to analyze and visualize the context that MCP (Model Context Protocol) servers add to conversations, including token counts.

## Features

- Connect to MCP servers via SSE (Server-Sent Events) or stdio (via proxy)
- Backend proxy server for stdio MCP connections
- View all available tools, resources, and prompts from the MCP server
- **Toggle tools/resources/prompts on/off** to see live token count updates
- **Select All / Deselect All** controls for easy bulk management
- Analyze token usage broken down by category with **live recalculation**
- Display raw JSON context content (filtered to enabled items only)
- Modern, responsive UI with visual indicators for enabled/disabled items

## Installation

### Frontend

```bash
npm install
```

### Backend Proxy (for stdio connections)

```bash
cd backend
npm install
```

## Usage

### Frontend Only (for SSE connections)

```bash
npm run dev
```

This will start the development server at `http://localhost:3000`.

### Full Stack (for stdio connections)

**Terminal 1 - Start the backend proxy:**
```bash
cd backend
npm run dev
```

The proxy server will run on `http://localhost:3001`.

**Terminal 2 - Start the frontend:**
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`.

### Build

**Frontend:**
```bash
npm run build
```

**Backend:**
```bash
cd backend
npm run build
```

## Connecting to MCP Servers

### stdio (Local Command) - Recommended

This is the easiest way to connect to local MCP servers.

1. Start the backend proxy server (see Full Stack usage above)
2. In the web UI, select "stdio (Local Command)" as the connection type
3. Enter the command to run your MCP server (e.g., `npx -y @modelcontextprotocol/server-everything`)
4. Optionally enter arguments
5. Verify the proxy URL is set to `http://localhost:3001`
6. Click "Connect"

The backend proxy will spawn the MCP server process and connect to it via stdio.

### SSE (Server-Sent Events)

For MCP servers that expose an SSE endpoint directly:

1. Select "SSE (Server-Sent Events)" as the connection type
2. Enter the endpoint URL (e.g., `http://localhost:3001/sse`)
3. Click "Connect"

This connects directly from the browser to the SSE endpoint without using the proxy.

## Using the Toggle Feature

Once connected to an MCP server, you can interactively control which tools, resources, and prompts are included in the token count:

### Individual Toggles

- Each tool, resource, and prompt has a checkbox
- Check/uncheck to enable/disable individual items
- Disabled items appear dimmed and are excluded from token calculations
- Token counts update **instantly** when you toggle items

### Bulk Controls

Each section (Tools, Resources, Prompts) has bulk control buttons:

- **Select All**: Enable all items in that section
- **Deselect All**: Disable all items in that section

### Live Token Analysis

As you toggle items on/off:
- Token counts recalculate in real-time
- The raw JSON content updates to show only enabled items
- Visual feedback shows which items are included in the count

This feature is useful for:
- Understanding which tools contribute most to context size
- Testing different combinations of tools/resources
- Optimizing your MCP server configuration
- Planning context budgets for LLM applications

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

**Frontend:**
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **MCP SDK**: Official Model Context Protocol SDK
- **js-tiktoken**: Token counting library
- **Vanilla JS/CSS**: No heavy framework dependencies

**Backend:**
- **Node.js**: Runtime for proxy server
- **Express**: Web server framework
- **MCP SDK**: stdio transport for MCP connections
- **TypeScript**: Type-safe development

## Project Structure

```
mcp_viewer/
├── backend/              # Backend proxy server
│   ├── src/
│   │   ├── server.ts       # Express server
│   │   └── mcpSession.ts   # MCP session management
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── src/                  # Frontend application
│   ├── main.ts             # Main application logic
│   ├── mcpClient.ts        # MCP client wrapper
│   ├── tokenCounter.ts     # Token counting utilities
│   └── style.css           # Styling
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Example MCP Servers

You can test with example MCP servers:

- `@modelcontextprotocol/server-everything`: A demo server with various capabilities
- Custom MCP servers that implement the MCP protocol

## Architecture

### stdio Connection Flow (via Proxy)

```
┌─────────────┐    HTTP/REST     ┌──────────────┐    stdio    ┌──────────────┐
│   Browser   │ ◄───────────────► │ Proxy Server │ ◄──────────► │  MCP Server  │
│  (Frontend) │                   │  (Node.js)   │             │  (Process)   │
└─────────────┘                   └──────────────┘             └──────────────┘
```

### SSE Connection Flow (Direct)

```
┌─────────────┐         SSE         ┌──────────────┐
│   Browser   │ ◄──────────────────► │  MCP Server  │
│  (Frontend) │                      │  (SSE)       │
└─────────────┘                      └──────────────┘
```

## Notes

- **stdio connections**: Require the backend proxy server to be running
- **CORS**: SSE connections require the MCP server to have appropriate CORS headers
- **Security**: The proxy server can execute arbitrary commands - only run in trusted environments

## Contributing

Feel free to submit issues or pull requests to improve the tool.

## License

MIT
