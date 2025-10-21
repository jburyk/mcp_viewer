import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';

let tokenizer: Tiktoken | null = null;

export function initTokenizer(): void {
  if (!tokenizer) {
    tokenizer = new Tiktoken(cl100k_base);
  }
}

export function countTokens(text: string): number {
  if (!tokenizer) {
    initTokenizer();
  }
  return tokenizer!.encode(text).length;
}

export function formatJSON(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

export interface TokenBreakdown {
  text: string;
  tokens: number;
}

export interface ContextAnalysis {
  total: TokenBreakdown;
  tools: TokenBreakdown;
  resources: TokenBreakdown;
  prompts: TokenBreakdown;
}

export function analyzeContext(data: {
  tools?: unknown[];
  resources?: unknown[];
  prompts?: unknown[];
}): ContextAnalysis {
  const toolsText = formatJSON(data.tools || []);
  const resourcesText = formatJSON(data.resources || []);
  const promptsText = formatJSON(data.prompts || []);
  const totalText = formatJSON(data);

  return {
    total: {
      text: totalText,
      tokens: countTokens(totalText),
    },
    tools: {
      text: toolsText,
      tokens: countTokens(toolsText),
    },
    resources: {
      text: resourcesText,
      tokens: countTokens(resourcesText),
    },
    prompts: {
      text: promptsText,
      tokens: countTokens(promptsText),
    },
  };
}
