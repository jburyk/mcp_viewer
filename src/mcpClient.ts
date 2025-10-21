import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface MCPServerInfo {
  name: string;
  version: string;
  capabilities?: Record<string, unknown>;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPContext {
  serverInfo: MCPServerInfo;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
}

export type ConnectionType = 'stdio' | 'sse';

export interface StdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface SSEConfig {
  url: string;
}

export interface ProxyConfig {
  proxyUrl: string;
}

export class MCPClientWrapper {
  private client: Client | null = null;
  private transport: StdioClientTransport | SSEClientTransport | null = null;
  private sessionId: string | null = null;
  private proxyUrl: string | null = null;
  private connectionType: 'direct' | 'proxy' = 'direct';

  async connectStdio(config: StdioConfig, proxyConfig?: ProxyConfig): Promise<MCPContext> {
    // Use proxy server for stdio connections
    const proxyUrl = proxyConfig?.proxyUrl || 'http://localhost:3001';
    this.proxyUrl = proxyUrl;
    this.connectionType = 'proxy';

    const response = await fetch(`${proxyUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: config.command,
        args: config.args || [],
        env: config.env || {},
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Failed to connect to proxy');
    }

    const data = await response.json();
    this.sessionId = data.sessionId;

    return data.context;
  }

  async connectSSE(config: SSEConfig): Promise<MCPContext> {
    this.connectionType = 'direct';
    this.client = new Client(
      {
        name: 'mcp-context-viewer',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    this.transport = new SSEClientTransport(new URL(config.url));
    await this.client.connect(this.transport);

    return this.fetchContext();
  }

  private async fetchContext(): Promise<MCPContext> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const [serverInfo, toolsResponse, resourcesResponse, promptsResponse] = await Promise.all([
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
  }

  async disconnect(): Promise<void> {
    if (this.connectionType === 'proxy' && this.sessionId && this.proxyUrl) {
      // Close proxy session
      await fetch(`${this.proxyUrl}/api/sessions/${this.sessionId}`, {
        method: 'DELETE',
      });
      this.sessionId = null;
      this.proxyUrl = null;
    } else {
      // Close direct connection
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }
    }
  }

  isConnected(): boolean {
    if (this.connectionType === 'proxy') {
      return this.sessionId !== null;
    }
    return this.client !== null;
  }
}
