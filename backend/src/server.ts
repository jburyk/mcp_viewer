import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { MCPSession } from './mcpSession.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Store active MCP sessions
const sessions = new Map<string, MCPSession>();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', activeSessions: sessions.size });
});

// Create a new MCP session with stdio transport
app.post('/api/sessions', async (req: Request, res: Response) => {
  try {
    const { command, args = [], env = {} } = req.body;

    if (!command) {
      res.status(400).json({ error: 'Command is required' });
      return;
    }

    const sessionId = uuidv4();
    const session = new MCPSession(sessionId, {
      command,
      args,
      env: { ...process.env, ...env } as Record<string, string>,
    });

    // Store session
    sessions.set(sessionId, session);

    // Connect to the MCP server
    await session.connect();

    // Fetch initial context
    const context = await session.getContext();

    res.json({
      sessionId,
      context,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      error: 'Failed to create session',
      details: (error as Error).message,
    });
  }
});

// Get context for an existing session
app.get('/api/sessions/:sessionId/context', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const context = await session.getContext();
    res.json(context);
  } catch (error) {
    console.error('Error getting context:', error);
    res.status(500).json({
      error: 'Failed to get context',
      details: (error as Error).message,
    });
  }
});

// Call a tool
app.post('/api/sessions/:sessionId/tools/call', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { toolName, args } = req.body;
    const session = sessions.get(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const result = await session.callTool(toolName, args);
    res.json(result);
  } catch (error) {
    console.error('Error calling tool:', error);
    res.status(500).json({
      error: 'Failed to call tool',
      details: (error as Error).message,
    });
  }
});

// Read a resource
app.post('/api/sessions/:sessionId/resources/read', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { uri } = req.body;
    const session = sessions.get(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const result = await session.readResource(uri);
    res.json(result);
  } catch (error) {
    console.error('Error reading resource:', error);
    res.status(500).json({
      error: 'Failed to read resource',
      details: (error as Error).message,
    });
  }
});

// Get a prompt
app.post('/api/sessions/:sessionId/prompts/get', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { promptName, args } = req.body;
    const session = sessions.get(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const result = await session.getPrompt(promptName, args);
    res.json(result);
  } catch (error) {
    console.error('Error getting prompt:', error);
    res.status(500).json({
      error: 'Failed to get prompt',
      details: (error as Error).message,
    });
  }
});

// Delete a session
app.delete('/api/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await session.disconnect();
    sessions.delete(sessionId);

    res.json({ message: 'Session closed successfully' });
  } catch (error) {
    console.error('Error closing session:', error);
    res.status(500).json({
      error: 'Failed to close session',
      details: (error as Error).message,
    });
  }
});

// List all sessions
app.get('/api/sessions', (_req: Request, res: Response) => {
  const sessionList = Array.from(sessions.entries()).map(([id, session]) => ({
    id,
    connected: session.isConnected(),
    command: session.getCommand(),
  }));

  res.json({ sessions: sessionList });
});

// Cleanup on server shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');

  // Close all sessions
  for (const [sessionId, session] of sessions.entries()) {
    try {
      await session.disconnect();
      console.log(`Closed session ${sessionId}`);
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }

  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`MCP Proxy Server running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  POST   /api/sessions - Create new MCP session`);
  console.log(`  GET    /api/sessions - List all sessions`);
  console.log(`  GET    /api/sessions/:id/context - Get session context`);
  console.log(`  DELETE /api/sessions/:id - Close session`);
});
