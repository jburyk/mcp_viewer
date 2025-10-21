import './style.css';
import { MCPClientWrapper, MCPContext } from './mcpClient';
import { analyzeContext, ContextAnalysis, initTokenizer } from './tokenCounter';

class MCPViewerApp {
  private mcpClient: MCPClientWrapper;
  private currentContext: MCPContext | null = null;
  private currentAnalysis: ContextAnalysis | null = null;
  private currentTab: 'all' | 'tools' | 'resources' | 'prompts' = 'all';

  constructor() {
    this.mcpClient = new MCPClientWrapper();
    this.setupEventListeners();
    initTokenizer();
  }

  private setupEventListeners(): void {
    // Connection type radio buttons
    const radioButtons = document.querySelectorAll('input[name="connectionType"]');
    radioButtons.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.handleConnectionTypeChange(target.value as 'stdio' | 'sse');
      });
    });

    // Connect button
    const connectBtn = document.getElementById('connectBtn');
    connectBtn?.addEventListener('click', () => this.handleConnect());

    // Disconnect button
    const disconnectBtn = document.getElementById('disconnectBtn');
    disconnectBtn?.addEventListener('click', () => this.handleDisconnect());

    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const tab = target.dataset.tab as 'all' | 'tools' | 'resources' | 'prompts';
        this.switchTab(tab);
      });
    });
  }

  private handleConnectionTypeChange(type: 'stdio' | 'sse'): void {
    const stdioConfig = document.getElementById('stdio-config');
    const sseConfig = document.getElementById('sse-config');

    if (type === 'stdio') {
      stdioConfig!.style.display = 'block';
      sseConfig!.style.display = 'none';
    } else {
      stdioConfig!.style.display = 'none';
      sseConfig!.style.display = 'block';
    }
  }

  private async handleConnect(): Promise<void> {
    const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
    const disconnectBtn = document.getElementById('disconnectBtn') as HTMLButtonElement;

    try {
      connectBtn.disabled = true;
      this.updateStatus('Connecting...', 'info');

      const connectionType = (
        document.querySelector('input[name="connectionType"]:checked') as HTMLInputElement
      ).value as 'stdio' | 'sse';

      let context: MCPContext;

      if (connectionType === 'stdio') {
        const command = (document.getElementById('command') as HTMLInputElement).value;
        const argsStr = (document.getElementById('args') as HTMLInputElement).value;
        const proxyUrl = (document.getElementById('proxyUrl') as HTMLInputElement).value;
        const args = argsStr ? argsStr.split(' ').filter(arg => arg.trim()) : [];

        if (!command) {
          throw new Error('Please enter a command');
        }

        if (!proxyUrl) {
          throw new Error('Please enter a proxy server URL');
        }

        context = await this.mcpClient.connectStdio({ command, args }, { proxyUrl });
      } else {
        const endpoint = (document.getElementById('endpoint') as HTMLInputElement).value;

        if (!endpoint) {
          throw new Error('Please enter an endpoint URL');
        }

        context = await this.mcpClient.connectSSE({ url: endpoint });
      }

      this.currentContext = context;
      this.currentAnalysis = analyzeContext({
        tools: context.tools,
        resources: context.resources,
        prompts: context.prompts,
      });

      this.updateStatus(
        `Connected to ${context.serverInfo.name} v${context.serverInfo.version}`,
        'connected'
      );
      this.updateUI();

      connectBtn.style.display = 'none';
      disconnectBtn.style.display = 'inline-block';
    } catch (error) {
      this.updateStatus(`Error: ${(error as Error).message}`, 'error');
      connectBtn.disabled = false;
    }
  }

  private async handleDisconnect(): Promise<void> {
    const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
    const disconnectBtn = document.getElementById('disconnectBtn') as HTMLButtonElement;

    try {
      await this.mcpClient.disconnect();
      this.currentContext = null;
      this.currentAnalysis = null;

      this.updateStatus('Disconnected', 'info');
      this.clearUI();

      connectBtn.style.display = 'inline-block';
      connectBtn.disabled = false;
      disconnectBtn.style.display = 'none';
    } catch (error) {
      this.updateStatus(`Error disconnecting: ${(error as Error).message}`, 'error');
    }
  }

  private updateStatus(message: string, type: 'info' | 'connected' | 'error'): void {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = 'status-message';
      if (type !== 'info') {
        statusEl.classList.add(type);
      }
    }
  }

  private updateUI(): void {
    if (!this.currentContext || !this.currentAnalysis) return;

    this.renderTools(this.currentContext.tools);
    this.renderResources(this.currentContext.resources);
    this.renderPrompts(this.currentContext.prompts);
    this.updateTokenStats();
    this.updateRawContent();
  }

  private renderTools(tools: MCPContext['tools']): void {
    const toolsEl = document.getElementById('tools');
    if (!toolsEl) return;

    if (tools.length === 0) {
      toolsEl.innerHTML = '<p class="placeholder">No tools available</p>';
      return;
    }

    toolsEl.innerHTML = tools
      .map(
        (tool) => `
      <div class="tool-item">
        <h4>${this.escapeHtml(tool.name)}</h4>
        <p>${this.escapeHtml(tool.description || 'No description')}</p>
      </div>
    `
      )
      .join('');
  }

  private renderResources(resources: MCPContext['resources']): void {
    const resourcesEl = document.getElementById('resources');
    if (!resourcesEl) return;

    if (resources.length === 0) {
      resourcesEl.innerHTML = '<p class="placeholder">No resources available</p>';
      return;
    }

    resourcesEl.innerHTML = resources
      .map(
        (resource) => `
      <div class="resource-item">
        <h4>${this.escapeHtml(resource.name)}</h4>
        <p>${this.escapeHtml(resource.description || 'No description')}</p>
        <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.25rem;">
          URI: ${this.escapeHtml(resource.uri)}
        </p>
      </div>
    `
      )
      .join('');
  }

  private renderPrompts(prompts: MCPContext['prompts']): void {
    const promptsEl = document.getElementById('prompts');
    if (!promptsEl) return;

    if (prompts.length === 0) {
      promptsEl.innerHTML = '<p class="placeholder">No prompts available</p>';
      return;
    }

    promptsEl.innerHTML = prompts
      .map(
        (prompt) => `
      <div class="prompt-item">
        <h4>${this.escapeHtml(prompt.name)}</h4>
        <p>${this.escapeHtml(prompt.description || 'No description')}</p>
        ${
          prompt.arguments && prompt.arguments.length > 0
            ? `<p style="font-size: 0.8rem; color: #64748b; margin-top: 0.25rem;">
                Arguments: ${prompt.arguments.map(arg => arg.name).join(', ')}
              </p>`
            : ''
        }
      </div>
    `
      )
      .join('');
  }

  private updateTokenStats(): void {
    if (!this.currentAnalysis) return;

    const totalTokensEl = document.getElementById('totalTokens');
    const toolsTokensEl = document.getElementById('toolsTokens');
    const resourcesTokensEl = document.getElementById('resourcesTokens');
    const promptsTokensEl = document.getElementById('promptsTokens');

    if (totalTokensEl) totalTokensEl.textContent = this.currentAnalysis.total.tokens.toLocaleString();
    if (toolsTokensEl) toolsTokensEl.textContent = this.currentAnalysis.tools.tokens.toLocaleString();
    if (resourcesTokensEl) resourcesTokensEl.textContent = this.currentAnalysis.resources.tokens.toLocaleString();
    if (promptsTokensEl) promptsTokensEl.textContent = this.currentAnalysis.prompts.tokens.toLocaleString();
  }

  private updateRawContent(): void {
    if (!this.currentAnalysis) return;

    const contentEl = document.getElementById('rawContent');
    if (!contentEl) return;

    let content = '';
    switch (this.currentTab) {
      case 'all':
        content = this.currentAnalysis.total.text;
        break;
      case 'tools':
        content = this.currentAnalysis.tools.text;
        break;
      case 'resources':
        content = this.currentAnalysis.resources.text;
        break;
      case 'prompts':
        content = this.currentAnalysis.prompts.text;
        break;
    }

    contentEl.textContent = content;
  }

  private switchTab(tab: 'all' | 'tools' | 'resources' | 'prompts'): void {
    this.currentTab = tab;

    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');

    this.updateRawContent();
  }

  private clearUI(): void {
    document.getElementById('tools')!.innerHTML = '<p class="placeholder">Connect to a server to see available tools</p>';
    document.getElementById('resources')!.innerHTML = '<p class="placeholder">Connect to a server to see available resources</p>';
    document.getElementById('prompts')!.innerHTML = '<p class="placeholder">Connect to a server to see available prompts</p>';

    document.getElementById('totalTokens')!.textContent = '0';
    document.getElementById('toolsTokens')!.textContent = '0';
    document.getElementById('resourcesTokens')!.textContent = '0';
    document.getElementById('promptsTokens')!.textContent = '0';

    document.getElementById('rawContent')!.textContent = 'Connect to a server to view context';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app
new MCPViewerApp();
