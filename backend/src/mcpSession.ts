import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface StdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPContext {
  serverInfo: {
    name: string;
    version: string;
    capabilities?: Record<string, unknown>;
  };
  tools: Array<{
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
  }>;
  resources: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }>;
  prompts: Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
}

export class MCPSession {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private config: StdioConfig;
  private sessionId: string;

  constructor(sessionId: string, config: StdioConfig) {
    this.sessionId = sessionId;
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      this.client = new Client(
        {
          name: 'mcp-context-viewer-proxy',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      this.transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args || [],
        env: this.config.env,
      });

      await this.client.connect(this.transport);
      console.log(`Session ${this.sessionId} connected to MCP server`);
    } catch (error) {
      console.error(`Failed to connect session ${this.sessionId}:`, error);
      throw error;
    }
  }

  async getContext(): Promise<MCPContext> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    try {
      const [serverInfo, toolsResponse, resourcesResponse, promptsResponse] =
        await Promise.all([
          this.client.getServerVersion(),
          this.client.listTools().catch(() => ({ tools: [] })),
          this.client.listResources().catch(() => ({ resources: [] })),
          this.client.listPrompts().catch(() => ({ prompts: [] })),
        ]);

      return {
        serverInfo: {
          name: serverInfo?.name || 'Unknown',
          version: serverInfo?.version || '0.0.0',
          capabilities: (serverInfo?.capabilities as Record<string, unknown>) || {},
        },
        tools: toolsResponse.tools || [],
        resources: resourcesResponse.resources || [],
        prompts: promptsResponse.prompts || [],
      };
    } catch (error) {
      console.error(`Error fetching context for session ${this.sessionId}:`, error);
      throw error;
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    try {
      const result = await this.client.callTool({ name, arguments: args });
      return result;
    } catch (error) {
      console.error(`Error calling tool ${name} in session ${this.sessionId}:`, error);
      throw error;
    }
  }

  async readResource(uri: string): Promise<unknown> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    try {
      const result = await this.client.readResource({ uri });
      return result;
    } catch (error) {
      console.error(`Error reading resource ${uri} in session ${this.sessionId}:`, error);
      throw error;
    }
  }

  async getPrompt(name: string, args?: Record<string, unknown>): Promise<unknown> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    try {
      const result = await this.client.getPrompt({
        name,
        arguments: args as Record<string, string> | undefined
      });
      return result;
    } catch (error) {
      console.error(`Error getting prompt ${name} in session ${this.sessionId}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }
      console.log(`Session ${this.sessionId} disconnected`);
    } catch (error) {
      console.error(`Error disconnecting session ${this.sessionId}:`, error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  getCommand(): string {
    return this.config.command;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}
