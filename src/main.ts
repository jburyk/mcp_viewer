import './style.css';
import { MCPClientWrapper, MCPContext } from './mcpClient';
import { analyzeContext, ContextAnalysis, initTokenizer } from './tokenCounter';

class MCPViewerApp {
  private mcpClient: MCPClientWrapper;
  private currentContext: MCPContext | null = null;
  private currentAnalysis: ContextAnalysis | null = null;
  private currentTab: 'all' | 'tools' | 'resources' | 'prompts' = 'all';
  private enabledTools: Set<string> = new Set();
  private enabledResources: Set<string> = new Set();
  private enabledPrompts: Set<string> = new Set();

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

    // Select all/deselect all buttons
    document.getElementById('selectAllTools')?.addEventListener('click', () => this.selectAll('tools'));
    document.getElementById('deselectAllTools')?.addEventListener('click', () => this.deselectAll('tools'));
    document.getElementById('selectAllResources')?.addEventListener('click', () => this.selectAll('resources'));
    document.getElementById('deselectAllResources')?.addEventListener('click', () => this.deselectAll('resources'));
    document.getElementById('selectAllPrompts')?.addEventListener('click', () => this.selectAll('prompts'));
    document.getElementById('deselectAllPrompts')?.addEventListener('click', () => this.deselectAll('prompts'));
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

    // Initialize enabled sets on first load
    if (this.enabledTools.size === 0) {
      this.currentContext.tools.forEach(tool => this.enabledTools.add(tool.name));
    }
    if (this.enabledResources.size === 0) {
      this.currentContext.resources.forEach(resource => this.enabledResources.add(resource.uri));
    }
    if (this.enabledPrompts.size === 0) {
      this.currentContext.prompts.forEach(prompt => this.enabledPrompts.add(prompt.name));
    }

    this.renderTools(this.currentContext.tools);
    this.renderResources(this.currentContext.resources);
    this.renderPrompts(this.currentContext.prompts);
    this.recalculateTokens();
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
      .map((tool) => {
        const isEnabled = this.enabledTools.has(tool.name);
        return `
      <div class="tool-item ${isEnabled ? '' : 'disabled'}" data-tool="${this.escapeHtml(tool.name)}">
        <input type="checkbox" class="item-checkbox tool-checkbox" ${isEnabled ? 'checked' : ''} data-name="${this.escapeHtml(tool.name)}">
        <div class="item-content">
          <h4>${this.escapeHtml(tool.name)}</h4>
          <p>${this.escapeHtml(tool.description || 'No description')}</p>
        </div>
      </div>
    `;
      })
      .join('');

    // Add event listeners to checkboxes
    toolsEl.querySelectorAll('.tool-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const toolName = target.dataset.name!;
        this.toggleTool(toolName, target.checked);
      });
    });
  }

  private renderResources(resources: MCPContext['resources']): void {
    const resourcesEl = document.getElementById('resources');
    if (!resourcesEl) return;

    if (resources.length === 0) {
      resourcesEl.innerHTML = '<p class="placeholder">No resources available</p>';
      return;
    }

    resourcesEl.innerHTML = resources
      .map((resource) => {
        const isEnabled = this.enabledResources.has(resource.uri);
        return `
      <div class="resource-item ${isEnabled ? '' : 'disabled'}" data-resource="${this.escapeHtml(resource.uri)}">
        <input type="checkbox" class="item-checkbox resource-checkbox" ${isEnabled ? 'checked' : ''} data-uri="${this.escapeHtml(resource.uri)}">
        <div class="item-content">
          <h4>${this.escapeHtml(resource.name)}</h4>
          <p>${this.escapeHtml(resource.description || 'No description')}</p>
          <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.25rem;">
            URI: ${this.escapeHtml(resource.uri)}
          </p>
        </div>
      </div>
    `;
      })
      .join('');

    // Add event listeners to checkboxes
    resourcesEl.querySelectorAll('.resource-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const resourceUri = target.dataset.uri!;
        this.toggleResource(resourceUri, target.checked);
      });
    });
  }

  private renderPrompts(prompts: MCPContext['prompts']): void {
    const promptsEl = document.getElementById('prompts');
    if (!promptsEl) return;

    if (prompts.length === 0) {
      promptsEl.innerHTML = '<p class="placeholder">No prompts available</p>';
      return;
    }

    promptsEl.innerHTML = prompts
      .map((prompt) => {
        const isEnabled = this.enabledPrompts.has(prompt.name);
        return `
      <div class="prompt-item ${isEnabled ? '' : 'disabled'}" data-prompt="${this.escapeHtml(prompt.name)}">
        <input type="checkbox" class="item-checkbox prompt-checkbox" ${isEnabled ? 'checked' : ''} data-name="${this.escapeHtml(prompt.name)}">
        <div class="item-content">
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
      </div>
    `;
      })
      .join('');

    // Add event listeners to checkboxes
    promptsEl.querySelectorAll('.prompt-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const promptName = target.dataset.name!;
        this.togglePrompt(promptName, target.checked);
      });
    });
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

  private toggleTool(toolName: string, enabled: boolean): void {
    if (enabled) {
      this.enabledTools.add(toolName);
    } else {
      this.enabledTools.delete(toolName);
    }

    // Update item appearance
    const item = document.querySelector(`[data-tool="${toolName}"]`);
    if (item) {
      if (enabled) {
        item.classList.remove('disabled');
      } else {
        item.classList.add('disabled');
      }
    }

    this.recalculateTokens();
    this.updateRawContent();
  }

  private toggleResource(resourceUri: string, enabled: boolean): void {
    if (enabled) {
      this.enabledResources.add(resourceUri);
    } else {
      this.enabledResources.delete(resourceUri);
    }

    // Update item appearance
    const item = document.querySelector(`[data-resource="${resourceUri}"]`);
    if (item) {
      if (enabled) {
        item.classList.remove('disabled');
      } else {
        item.classList.add('disabled');
      }
    }

    this.recalculateTokens();
    this.updateRawContent();
  }

  private togglePrompt(promptName: string, enabled: boolean): void {
    if (enabled) {
      this.enabledPrompts.add(promptName);
    } else {
      this.enabledPrompts.delete(promptName);
    }

    // Update item appearance
    const item = document.querySelector(`[data-prompt="${promptName}"]`);
    if (item) {
      if (enabled) {
        item.classList.remove('disabled');
      } else {
        item.classList.add('disabled');
      }
    }

    this.recalculateTokens();
    this.updateRawContent();
  }

  private selectAll(type: 'tools' | 'resources' | 'prompts'): void {
    if (!this.currentContext) return;

    if (type === 'tools') {
      this.currentContext.tools.forEach(tool => this.enabledTools.add(tool.name));
      this.renderTools(this.currentContext.tools);
    } else if (type === 'resources') {
      this.currentContext.resources.forEach(resource => this.enabledResources.add(resource.uri));
      this.renderResources(this.currentContext.resources);
    } else if (type === 'prompts') {
      this.currentContext.prompts.forEach(prompt => this.enabledPrompts.add(prompt.name));
      this.renderPrompts(this.currentContext.prompts);
    }

    this.recalculateTokens();
    this.updateRawContent();
  }

  private deselectAll(type: 'tools' | 'resources' | 'prompts'): void {
    if (!this.currentContext) return;

    if (type === 'tools') {
      this.enabledTools.clear();
      this.renderTools(this.currentContext.tools);
    } else if (type === 'resources') {
      this.enabledResources.clear();
      this.renderResources(this.currentContext.resources);
    } else if (type === 'prompts') {
      this.enabledPrompts.clear();
      this.renderPrompts(this.currentContext.prompts);
    }

    this.recalculateTokens();
    this.updateRawContent();
  }

  private recalculateTokens(): void {
    if (!this.currentContext) return;

    // Filter to only enabled items
    const enabledTools = this.currentContext.tools.filter(tool =>
      this.enabledTools.has(tool.name)
    );
    const enabledResources = this.currentContext.resources.filter(resource =>
      this.enabledResources.has(resource.uri)
    );
    const enabledPrompts = this.currentContext.prompts.filter(prompt =>
      this.enabledPrompts.has(prompt.name)
    );

    // Recalculate token analysis
    this.currentAnalysis = analyzeContext({
      tools: enabledTools,
      resources: enabledResources,
      prompts: enabledPrompts,
    });

    this.updateTokenStats();
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

    // Clear enabled sets
    this.enabledTools.clear();
    this.enabledResources.clear();
    this.enabledPrompts.clear();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app
new MCPViewerApp();
