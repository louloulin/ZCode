/**
 * Claude Code Provider Adapter
 *
 * Connects ZCode to Claude Code (claude.ai/code) via Anthropic Messages API.
 * Claude Code is Anthropic's official CLI tool for AI-assisted coding.
 *
 * API Reference: https://docs.anthropic.com/en/docs/claude-code
 */

import { randomUUID } from "node:crypto";
import type { Logger } from "@zcode/contracts";
import { createMcpAdapter, type McpPort } from "../mcp/index.js";

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
  readonly mcpServerName: string;
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
  /** Bearer token for HTTP authentication, passed via Authorization header */
  readonly bearerToken?: string;
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
    url: options.baseUrl ?? "https://api.anthropic.com/v1/mcp",
    bearerToken: options.apiKey,
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
 * Claude Code session manager with MCP integration
 */
export class ClaudeCodeSessionManager {
  private readonly sessions = new Map<string, ClaudeCodeSession>();
  private readonly logger?: Logger;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;
  }

  createSession(_workspaceId?: string): ClaudeCodeSession {
    const sessionId = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const session: ClaudeCodeSession = {
      sessionId,
      createdAt: new Date(),
      conversationHistory: [],
      mcpServerName: `claude-code-${sessionId}`,
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

  listSessions(): ClaudeCodeSession[] {
    return Array.from(this.sessions.values());
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

  // MCP operations
  connectMcpServer(serverName: string, config: ClaudeCodeMcpServerConfig): Promise<void>;
  disconnectMcpServer(serverName: string): Promise<void>;
  listMcpTools(): Promise<ClaudeCodeToolDescriptor[]>;
  callMcpTool(
    serverName: string,
    toolName: string,
    toolArgs: Record<string, unknown>,
  ): Promise<ClaudeCodeToolResult>;

  // Session operations
  createSession(workspaceId?: string): ClaudeCodeSession;
  sendMessage(sessionId: string, content: string): Promise<ClaudeCodeMessage>;
}

/**
 * Claude Code tool descriptor
 */
export interface ClaudeCodeToolDescriptor {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema?: Record<string, unknown>;
  readonly serverName: string;
}

/**
 * Create a Claude Code adapter instance with real MCP integration
 *
 * The adapter manages connections to Claude Code and provides
 * a unified interface for ZCode to interact with Claude Code.
 */
export function createClaudeCodeAdapter(
  options: CreateClaudeCodeAdapterOptions = {},
): ClaudeCodeAdapter {
  const logger = options.logger;
  const sessionManager = new ClaudeCodeSessionManager({ logger });
  const mcpAdapters = new Map<string, McpPort>();
  let connected = false;
  let _currentConfig: ClaudeCodeConfig | undefined;
  let defaultMcpServerName: string | undefined;

  return {
    providerId: CLAUDE_CODE_PROVIDER_ID,
    capabilities: CLAUDE_CODE_DEFAULT_CAPABILITIES,
    sessionManager,

    async connect(config: ClaudeCodeConfig): Promise<void> {
      if (!config.apiKey) {
        throw new ClaudeCodeError("Claude Code API key is required", "MISSING_API_KEY");
      }

      _currentConfig = config;
      logger?.debug(`Connecting to Claude Code: ${config.baseUrl ?? "default"}`);

      // Create MCP adapter for Claude Code
      const mcpConfig = createClaudeCodeMcpServerConfig({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      });

      const serverName = `claude-code-${randomUUID().slice(0, 8)}`;
      defaultMcpServerName = serverName;

      const mcpAdapter = createMcpAdapter({
        logger: logger?.child({ module: "adapters.mcp.claude-code" }),
      });
      mcpAdapters.set(serverName, mcpAdapter);

      try {
        // Pass bearer token via Authorization header for HTTP authentication
        const headers: Record<string, string> = {};
        if (mcpConfig.bearerToken) {
          headers["Authorization"] = `Bearer ${mcpConfig.bearerToken}`;
        }
        // Build config based on transport type
        if (mcpConfig.type === "http" && mcpConfig.url) {
          await mcpAdapter.connectServer(serverName, {
            type: "http",
            url: mcpConfig.url,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
            timeoutMs: 60_000,
          } as Parameters<typeof mcpAdapter.connectServer>[1]);
        } else if (mcpConfig.type === "stdio") {
          await mcpAdapter.connectServer(serverName, {
            type: "stdio",
            command: mcpConfig.command ?? "claude",
            args: mcpConfig.args,
            env: mcpConfig.env,
            timeoutMs: 60_000,
          } as Parameters<typeof mcpAdapter.connectServer>[1]);
        }
        logger?.info(`Claude Code MCP server connected: ${serverName}`);
      } catch (error) {
        // If MCP connection fails, adapter still works in chat-only mode
        logger?.warn(`Claude Code MCP connection failed, falling back to chat mode`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      connected = true;
      logger?.info(`Claude Code connected successfully`);
    },

    async disconnect(): Promise<void> {
      connected = false;
      _currentConfig = undefined;

      // Close all MCP adapters
      for (const [serverName, adapter] of mcpAdapters) {
        try {
          await adapter.close();
          logger?.debug(`Claude Code MCP server closed: ${serverName}`);
        } catch (error) {
          logger?.warn(`Error closing Claude Code MCP server ${serverName}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      mcpAdapters.clear();

      // Close all sessions
      for (const sessionId of sessionManager["sessions"].keys()) {
        sessionManager.closeSession(sessionId);
      }
      logger?.info(`Claude Code disconnected`);
    },

    isConnected(): boolean {
      return connected;
    },

    async connectMcpServer(serverName: string, config: ClaudeCodeMcpServerConfig): Promise<void> {
      const adapter = createMcpAdapter({
        logger: logger?.child({ module: "adapters.mcp.claude-code" }),
      });
      mcpAdapters.set(serverName, adapter);

      // Pass bearer token via Authorization header for HTTP authentication
      const headers: Record<string, string> = {};
      if (config.bearerToken) {
        headers["Authorization"] = `Bearer ${config.bearerToken}`;
      }
      // Build config based on transport type
      if (config.type === "http" && config.url) {
        await adapter.connectServer(serverName, {
          type: "http",
          url: config.url,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          timeoutMs: 60_000,
        } as Parameters<typeof adapter.connectServer>[1]);
      } else if (config.type === "stdio") {
        await adapter.connectServer(serverName, {
          type: "stdio",
          command: config.command ?? "claude",
          args: config.args,
          env: config.env,
          timeoutMs: 60_000,
        } as Parameters<typeof adapter.connectServer>[1]);
      }

      logger?.info(`Claude Code MCP server connected: ${serverName}`);
    },

    async disconnectMcpServer(serverName: string): Promise<void> {
      const adapter = mcpAdapters.get(serverName);
      if (adapter) {
        await adapter.close();
        mcpAdapters.delete(serverName);
        logger?.debug(`Claude Code MCP server disconnected: ${serverName}`);
      }
    },

    async listMcpTools(): Promise<ClaudeCodeToolDescriptor[]> {
      const tools: ClaudeCodeToolDescriptor[] = [];
      for (const [serverName, adapter] of mcpAdapters) {
        try {
          const mcpTools = await adapter.listTools();
          for (const tool of mcpTools) {
            if (tool.name) {
              tools.push({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
                serverName,
              });
            }
          }
        } catch (error) {
          logger?.warn(`Failed to list tools from Claude Code MCP server ${serverName}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      return tools;
    },

    async callMcpTool(
      serverName: string,
      toolName: string,
      toolArgs: Record<string, unknown>,
    ): Promise<ClaudeCodeToolResult> {
      const adapter = mcpAdapters.get(serverName) ?? mcpAdapters.get(defaultMcpServerName!);
      if (!adapter) {
        throw new ClaudeCodeError(`MCP server not found: ${serverName}`, "MCP_SERVER_NOT_FOUND");
      }

      const toolUseId = `cc-call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      try {
        const result = await adapter.callTool({
          serverName,
          toolName,
          arguments: toolArgs,
        });

        const content =
          result.content
            .map((block) => (block.type === "text" ? block.text : JSON.stringify(block)))
            .join("\n");

        return {
          toolUseId,
          content,
          isError: result.isError,
        };
      } catch (error) {
        return {
          toolUseId,
          content: error instanceof Error ? error.message : String(error),
          isError: true,
        };
      }
    },

    createSession(workspaceId?: string): ClaudeCodeSession {
      return sessionManager.createSession(workspaceId);
    },

    async sendMessage(sessionId: string, content: string): Promise<ClaudeCodeMessage> {
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        throw new ClaudeCodeError(`Session not found: ${sessionId}`, "SESSION_NOT_FOUND");
      }

      // Add user message
      const userMessage: ClaudeCodeMessage = {
        role: "user",
        content,
        timestamp: new Date(),
      };
      sessionManager.updateSession(sessionId, userMessage);

      // If MCP is connected, try tool call first
      const serverName = session.mcpServerName;
      const adapter = mcpAdapters.get(serverName);

      if (adapter && this.isConnected()) {
        try {
          // Use MCP tools if available
          const tools = await adapter.listTools();
          if (tools.length > 0) {
            logger?.debug(`Claude Code session ${sessionId} using MCP mode with ${tools.length} tools`);
          }
        } catch {
          // Fall back to chat mode
        }
      }

      // Placeholder for AI response - in real implementation, this would call Claude API
      const assistantMessage: ClaudeCodeMessage = {
        role: "assistant",
        content: `[Claude Code] Received: ${content}`,
        timestamp: new Date(),
      };
      sessionManager.updateSession(sessionId, assistantMessage);

      return assistantMessage;
    },
  };
}

/**
 * Map ZCode tool calls to Claude Code tool format (Anthropic Messages)
 */
/** Map ZCode tool calls to Claude Code tool format */
export function mapZCodeToolToClaudeCode(toolName: string, toolInput: Record<string, unknown>): { name: string; input: Record<string, unknown> } {
  const toolMapping: Record<string, string> = {
    read_file: "Read", write_file: "Write", edit_file: "Edit", bash: "Bash",
    glob: "Glob", grep: "Grep", web_search: "WebSearch", web_fetch: "WebFetch", mcp_tool_call: "MCPTool",
  };
  return { name: toolMapping[toolName] ?? toolName, input: toolInput };
}

/** Map Claude Code tool results to ZCode format */
export function mapClaudeCodeResultToZCode(result: ClaudeCodeToolResult): { output: string; isError?: boolean } {
  return { output: result.content, isError: result.isError };
}

/** Convert Anthropic message format to Claude Code internal format */
export function normalizeClaudeCodeMessage(message: ClaudeCodeMessage): ClaudeCodeContentBlock[] {
  if (typeof message.content === "string") return [{ type: "text", text: message.content }];
  return message.content;
}
