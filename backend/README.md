# MCP Proxy Server

A backend proxy server that allows browser-based applications to connect to MCP servers via stdio transport.

## Why?

Browser applications cannot directly spawn processes or use stdio due to security restrictions. This proxy server runs in Node.js and:

1. Spawns MCP servers as child processes using stdio transport
2. Manages multiple concurrent MCP server sessions
3. Exposes a REST API that the frontend can use
4. Handles all MCP protocol communication

## Installation

```bash
cd backend
npm install
```

## Usage

### Development

```bash
npm run dev
```

This starts the server on `http://localhost:3001` with hot-reloading.

### Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

Returns server status and number of active sessions.

### Create Session
```
POST /api/sessions
Content-Type: application/json

{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-everything"],
  "env": {}
}
```

Creates a new MCP session and returns the session ID and initial context.

**Response:**
```json
{
  "sessionId": "uuid-here",
  "context": {
    "serverInfo": { ... },
    "tools": [ ... ],
    "resources": [ ... ],
    "prompts": [ ... ]
  }
}
```

### Get Context
```
GET /api/sessions/:sessionId/context
```

Retrieves the current context from an active session.

### Call Tool
```
POST /api/sessions/:sessionId/tools/call
Content-Type: application/json

{
  "toolName": "example_tool",
  "args": { ... }
}
```

Calls a tool on the MCP server.

### Read Resource
```
POST /api/sessions/:sessionId/resources/read
Content-Type: application/json

{
  "uri": "file:///example.txt"
}
```

Reads a resource from the MCP server.

### Get Prompt
```
POST /api/sessions/:sessionId/prompts/get
Content-Type: application/json

{
  "promptName": "example_prompt",
  "args": { ... }
}
```

Gets a prompt from the MCP server.

### Close Session
```
DELETE /api/sessions/:sessionId
```

Closes an active MCP session and cleans up resources.

### List Sessions
```
GET /api/sessions
```

Lists all active sessions.

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid-here",
      "connected": true,
      "command": "npx"
    }
  ]
}
```

## Environment Variables

- `PORT`: Server port (default: 3001)

## Architecture

```
┌─────────────┐         HTTP/REST          ┌──────────────┐
│   Browser   │ ◄─────────────────────────► │ Proxy Server │
│  (Frontend) │                             │  (Node.js)   │
└─────────────┘                             └──────┬───────┘
                                                   │
                                                   │ stdio
                                                   │
                                            ┌──────▼───────┐
                                            │  MCP Server  │
                                            │  (Process)   │
                                            └──────────────┘
```

## Session Management

- Each connection creates a unique session with a UUID
- Sessions persist until explicitly closed or server shutdown
- Multiple sessions can run concurrently
- Automatic cleanup on server shutdown (SIGINT)

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (missing parameters)
- `404`: Session not found
- `500`: Server error

Error responses include details:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Security Considerations

- The proxy server can execute arbitrary commands - only run in trusted environments
- Consider adding authentication if exposing publicly
- Use environment variable validation for production deployments
- Implement rate limiting for production use

## Development

### Type Checking
```bash
npm run type-check
```

### File Structure
```
backend/
├── src/
│   ├── server.ts       # Main Express server
│   └── mcpSession.ts   # MCP session management
├── package.json
└── tsconfig.json
```
