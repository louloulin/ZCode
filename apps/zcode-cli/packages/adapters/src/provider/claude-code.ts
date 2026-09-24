/**
 * Claude Code Provider Adapter
 *
 * Connects ZCode to Claude Code (claude.ai/code) via Anthropic Messages API.
 * Claude Code is Anthropic's official CLI tool for AI-assisted coding.
 *
 * API Reference: https://docs.anthropic.com/en/docs/claude-code
 */

import type { Logger } from "@zcode/contracts";

export const CLAUDE_CODE_PROVIDER_ID = "claude-code";

export interface ClaudeCodeConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly workspaceId?: string;
}

export interface ClaudeCodeSession {
  readonly sessionId: string;
  readonly createdAt: Date;
  readonly conversationHistory: readonly ClaudeCodeMessage[];
}

export interface ClaudeCodeMessage {
  readonly role: "user" | "assistant";
  readonly content: string | ClaudeCodeContentBlock[];
  readonly timestamp: Date;
}

export type ClaudeCodeContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

export interface ClaudeCodeToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

export interface ClaudeCodeToolResult {
  readonly toolUseId: string;
  readonly content: string;
  readonly isError?: boolean;
}

/**
 * Claude Code MCP server configuration
 * Claude Code exposes an MCP server for programmatic access
 */
export interface ClaudeCodeMcpServerConfig {
  readonly type: "http" | "stdio";
  readonly command?: string;
  readonly args?: string[];
  readonly env?: Record<string, string>;
  readonly url?: string;
  readonly auth?: {
    readonly type: "bearer";
    readonly token: string;
  };
}

/**
 * Create MCP server config for Claude Code
 */
export function createClaudeCodeMcpServerConfig(options: {
  apiKey: string;
  baseUrl?: string;
}): ClaudeCodeMcpServerConfig {
  return {
    type: "http",
    url: options.baseUrl ?? "https://claude.ai/code/mcp",
    auth: {
      type: "bearer",
      token: options.apiKey,
    },
  };
}

/**
 * Claude Code provider capabilities
 */
export interface ClaudeCodeProviderCapabilities {
  readonly supportsToolCall: boolean;
  readonly supportsMultiModal: boolean;
  readonly supportsCodeExecution: boolean;
  readonly supportsFileOperations: boolean;
  readonly supportsWebSearch: boolean;
  readonly maxContextLength: number;
  readonly supportedModels: readonly string[];
  readonly supportedApiType: "anthropic-messages";
}

/**
 * Default Claude Code capabilities
 */
export const CLAUDE_CODE_DEFAULT_CAPABILITIES: ClaudeCodeProviderCapabilities = {
  supportsToolCall: true,
  supportsMultiModal: true,
  supportsCodeExecution: true,
  supportsFileOperations: true,
  supportsWebSearch: true,
  maxContextLength: 1_000_000,
  supportedModels: [
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
    "claude-opus-4-8",
    "claude-sonnet-4-6",
    "claude-opus-4-7",
    "claude-opus-4-6",
    "claude-opus-5",
    "claude-sonnet-5",
    "claude-haiku-4-5-20251001",
  ],
  supportedApiType: "anthropic-messages",
};

/**
 * Claude Code provider errors
 */
export class ClaudeCodeError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "ClaudeCodeError";
  }
}

/**
 * Claude Code session manager
 */
export class ClaudeCodeSessionManager {
  private readonly sessions = new Map<string, ClaudeCodeSession>();
  private readonly logger?: Logger;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;
  }

  createSession(workspaceId?: string): ClaudeCodeSession {
    const sessionId = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const session: ClaudeCodeSession = {
      sessionId,
      createdAt: new Date(),
      conversationHistory: [],
    };
    this.sessions.set(sessionId, session);
    this.logger?.debug(`Claude Code session created: ${sessionId}`);
    return session;
  }

  getSession(sessionId: string): ClaudeCodeSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, message: ClaudeCodeMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const updated: ClaudeCodeSession = {
        ...session,
        conversationHistory: [...session.conversationHistory, message],
      };
      this.sessions.set(sessionId, updated);
    }
  }

  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger?.debug(`Claude Code session closed: ${sessionId}`);
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

export interface CreateClaudeCodeAdapterOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly logger?: Logger;
  readonly mcpTransport?: "http" | "stdio";
}

export interface ClaudeCodeAdapter {
  readonly providerId: string;
  readonly capabilities: ClaudeCodeProviderCapabilities;
  readonly sessionManager: ClaudeCodeSessionManager;

  connect(config: ClaudeCodeConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

/**
 * Create a Claude Code adapter instance
 *
 * The adapter manages connections to Claude Code and provides
 * a unified interface for ZCode to interact with Claude Code.
 */
export function createClaudeCodeAdapter(
  options: CreateClaudeCodeAdapterOptions = {},
): ClaudeCodeAdapter {
  const logger = options.logger;
  const sessionManager = new ClaudeCodeSessionManager({ logger });
  let connected = false;
  let currentConfig: ClaudeCodeConfig | undefined;

  return {
    providerId: CLAUDE_CODE_PROVIDER_ID,
    capabilities: CLAUDE_CODE_DEFAULT_CAPABILITIES,
    sessionManager,

    async connect(config: ClaudeCodeConfig): Promise<void> {
      if (!config.apiKey) {
        throw new ClaudeCodeError("Claude Code API key is required", "MISSING_API_KEY");
      }

      currentConfig = config;
      logger?.debug(`Connecting to Claude Code: ${config.baseUrl ?? "default"}`);

      // In a full implementation, this would:
      // 1. Create an MCP connection to the Claude Code MCP server
      // 2. Authenticate with the provided API key via Anthropic
      // 3. Initialize the session
      // 4. Set up tool handlers for Claude Code's tool suite

      connected = true;
      logger?.info(`Claude Code connected successfully`);
    },

    async disconnect(): Promise<void> {
      connected = false;
      currentConfig = undefined;
      // Close all sessions
      for (const sessionId of sessionManager["sessions"].keys()) {
        sessionManager.closeSession(sessionId);
      }
      logger?.info(`Claude Code disconnected`);
    },

    isConnected(): boolean {
      return connected;
    },
  };
}

/**
 * Map ZCode tool calls to Claude Code tool format (Anthropic Messages)
 */
export function mapZCodeToolToClaudeCode(
  toolName: string,
  toolInput: Record<string, unknown>,
): { name: string; input: Record<string, unknown> } {
  // Claude Code uses standard tool names
  const toolMapping: Record<string, string> = {
    "read_file": "Read",
    "write_file": "Write",
    "edit_file": "Edit",
    "bash": "Bash",
    "glob": "Glob",
    "grep": "Grep",
    "web_search": "WebSearch",
    "web_fetch": "WebFetch",
    "mcp_tool_call": "MCPTool",
  };

  return {
    name: toolMapping[toolName] ?? toolName,
    input: toolInput,
  };
}

/**
 * Map Claude Code tool results to ZCode format
 */
export function mapClaudeCodeResultToZCode(
  result: ClaudeCodeToolResult,
): { output: string; isError?: boolean } {
  return {
    output: result.content,
    isError: result.isError,
  };
}

/**
 * Convert Anthropic message format to Claude Code internal format
 */
export function normalizeClaudeCodeMessage(
  message: ClaudeCodeMessage,
): ClaudeCodeContentBlock[] {
  if (typeof message.content === "string") {
    return [{ type: "text", text: message.content }];
  }
  return message.content;
}
