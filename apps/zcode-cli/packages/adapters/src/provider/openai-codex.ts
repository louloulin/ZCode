/**
 * OpenAI Codex Provider Adapter
 *
 * Connects ZCode to OpenAI Codex (OpenAI's coding model via Responses API).
 * Codex provides powerful code generation and editing capabilities.
 *
 * API Reference: https://platform.openai.com/docs/guides/code-execution
 */

import { randomUUID } from "node:crypto";
import type { Logger } from "@zcode/contracts";
import { createMcpAdapter, type McpPort } from "../mcp/index.js";

export const OPENAI_CODEX_PROVIDER_ID = "openai-codex";

export interface OpenAICodexConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly workspaceId?: string;
}

export interface OpenAICodexSession {
  readonly sessionId: string;
  readonly createdAt: Date;
  readonly conversationHistory: readonly OpenAICodexMessage[];
  readonly mcpServerName: string;
}

export interface OpenAICodexMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: Date;
}

export interface OpenAICodexToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

export interface OpenAICodexToolResult {
  readonly callId: string;
  readonly output: string;
  readonly isError?: boolean;
}

/**
 * OpenAI Codex MCP server configuration
 * OpenAI Codex can be accessed via the Responses API with code execution
 */
export interface OpenAICodexMcpServerConfig {
  readonly type: "http";
  readonly url: string;
  /** Bearer token for HTTP authentication, passed via Authorization header */
  readonly bearerToken?: string;
}

/**
 * Create MCP server config for OpenAI Codex
 */
export function createOpenAICodexMcpServerConfig(options: {
  apiKey: string;
  baseUrl?: string;
}): OpenAICodexMcpServerConfig {
  return {
    type: "http",
    url: options.baseUrl ?? "https://api.openai.com/v1",
    bearerToken: options.apiKey,
  };
}

/**
 * OpenAI Codex provider capabilities
 */
export interface OpenAICodexProviderCapabilities {
  readonly supportsToolCall: boolean;
  readonly supportsCodeExecution: boolean;
  readonly supportsMultiModal: boolean;
  readonly supportsFileOperations: boolean;
  readonly supportsWebSearch: boolean;
  readonly maxContextLength: number;
  readonly supportedModels: readonly string[];
  readonly supportedApiType: "openai-responses";
  readonly supportedReasoningLevels: readonly ("low" | "medium" | "high")[];
}

/**
 * Default OpenAI Codex capabilities
 */
export const OPENAI_CODEX_DEFAULT_CAPABILITIES: OpenAICodexProviderCapabilities = {
  supportsToolCall: true,
  supportsCodeExecution: true,
  supportsMultiModal: true,
  supportsFileOperations: true,
  supportsWebSearch: true,
  maxContextLength: 400_000,
  supportedModels: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "o3",
    "o3-mini",
    "o4-mini",
    "o1",
    "o1-mini",
    "o1-pro",
    "gpt-5.3-codex",
    "gpt-5.3-codex-spark",
  ],
  supportedApiType: "openai-responses",
  supportedReasoningLevels: ["low", "medium", "high"],
};

/**
 * OpenAI Codex provider errors
 */
export class OpenAICodexError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "OpenAICodexError";
  }
}

/**
 * OpenAI Codex session manager with MCP integration
 */
export class OpenAICodexSessionManager {
  private readonly sessions = new Map<string, OpenAICodexSession>();
  private readonly logger?: Logger;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;
  }

  createSession(_workspaceId?: string): OpenAICodexSession {
    const sessionId = `ccx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const session: OpenAICodexSession = {
      sessionId,
      createdAt: new Date(),
      conversationHistory: [],
      mcpServerName: `openai-codex-${sessionId}`,
    };
    this.sessions.set(sessionId, session);
    this.logger?.debug(`OpenAI Codex session created: ${sessionId}`);
    return session;
  }

  getSession(sessionId: string): OpenAICodexSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, message: OpenAICodexMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const updated: OpenAICodexSession = {
        ...session,
        conversationHistory: [...session.conversationHistory, message],
      };
      this.sessions.set(sessionId, updated);
    }
  }

  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger?.debug(`OpenAI Codex session closed: ${sessionId}`);
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  listSessions(): OpenAICodexSession[] {
    return Array.from(this.sessions.values());
  }
}

export interface CreateOpenAICodexAdapterOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly logger?: Logger;
}

export interface OpenAICodexAdapter {
  readonly providerId: string;
  readonly capabilities: OpenAICodexProviderCapabilities;
  readonly sessionManager: OpenAICodexSessionManager;

  connect(config: OpenAICodexConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // MCP operations
  connectMcpServer(serverName: string, config: OpenAICodexMcpServerConfig): Promise<void>;
  disconnectMcpServer(serverName: string): Promise<void>;
  listMcpTools(): Promise<OpenAICodexToolDescriptor[]>;
  callMcpTool(
    serverName: string,
    toolName: string,
    toolArgs: Record<string, unknown>,
  ): Promise<OpenAICodexToolResult>;

  // Session operations
  createSession(workspaceId?: string): OpenAICodexSession;
  sendMessage(sessionId: string, content: string): Promise<OpenAICodexMessage>;
}

/**
 * OpenAI Codex tool descriptor
 */
export interface OpenAICodexToolDescriptor {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema?: Record<string, unknown>;
  readonly serverName: string;
}

/**
 * Create an OpenAI Codex adapter instance with real MCP integration
 *
 * The adapter manages connections to OpenAI Codex via the Responses API
 * and provides a unified interface for ZCode to interact with Codex.
 */
export function createOpenAICodexAdapter(
  options: CreateOpenAICodexAdapterOptions = {},
): OpenAICodexAdapter {
  const logger = options.logger;
  const sessionManager = new OpenAICodexSessionManager({ logger });
  const mcpAdapters = new Map<string, McpPort>();
  let connected = false;
  let _currentConfig: OpenAICodexConfig | undefined;
  let defaultMcpServerName: string | undefined;

  return {
    providerId: OPENAI_CODEX_PROVIDER_ID,
    capabilities: OPENAI_CODEX_DEFAULT_CAPABILITIES,
    sessionManager,

    async connect(config: OpenAICodexConfig): Promise<void> {
      if (!config.apiKey) {
        throw new OpenAICodexError(
          "OpenAI API key is required for Codex",
          "MISSING_API_KEY",
        );
      }

      _currentConfig = config;
      logger?.debug(`Connecting to OpenAI Codex: ${config.baseUrl ?? "default"}`);

      // Create MCP adapter for OpenAI Codex (via Responses API)
      const mcpConfig = createOpenAICodexMcpServerConfig({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      });

      const serverName = `openai-codex-${randomUUID().slice(0, 8)}`;
      defaultMcpServerName = serverName;

      const mcpAdapter = createMcpAdapter({
        logger: logger?.child({ module: "adapters.mcp.openai-codex" }),
      });
      mcpAdapters.set(serverName, mcpAdapter);

      try {
        // Pass bearer token via Authorization header for HTTP authentication
        const headers: Record<string, string> = {};
        if (mcpConfig.bearerToken) {
          headers["Authorization"] = `Bearer ${mcpConfig.bearerToken}`;
        }
        // OpenAI Codex only supports HTTP transport
        if (mcpConfig.url) {
          await mcpAdapter.connectServer(serverName, {
            type: "http",
            url: mcpConfig.url,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
            timeoutMs: 60_000,
          } as Parameters<typeof mcpAdapter.connectServer>[1]);
        }
        logger?.info(`OpenAI Codex MCP server connected: ${serverName}`);
      } catch (error) {
        // If MCP connection fails, adapter still works in chat-only mode
        logger?.warn(`OpenAI Codex MCP connection failed, falling back to chat mode`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      connected = true;
      logger?.info(`OpenAI Codex connected successfully`);
    },

    async disconnect(): Promise<void> {
      connected = false;
      _currentConfig = undefined;

      // Close all MCP adapters
      for (const [serverName, adapter] of mcpAdapters) {
        try {
          await adapter.close();
          logger?.debug(`OpenAI Codex MCP server closed: ${serverName}`);
        } catch (error) {
          logger?.warn(`Error closing OpenAI Codex MCP server ${serverName}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      mcpAdapters.clear();

      // Close all sessions
      for (const sessionId of sessionManager["sessions"].keys()) {
        sessionManager.closeSession(sessionId);
      }
      logger?.info(`OpenAI Codex disconnected`);
    },

    isConnected(): boolean {
      return connected;
    },

    async connectMcpServer(serverName: string, config: OpenAICodexMcpServerConfig): Promise<void> {
      const adapter = createMcpAdapter({
        logger: logger?.child({ module: "adapters.mcp.openai-codex" }),
      });
      mcpAdapters.set(serverName, adapter);

      // Pass bearer token via Authorization header for HTTP authentication
      const headers: Record<string, string> = {};
      if (config.bearerToken) {
        headers["Authorization"] = `Bearer ${config.bearerToken}`;
      }
      // OpenAI Codex only supports HTTP transport
      if (config.url) {
        await adapter.connectServer(serverName, {
          type: "http",
          url: config.url,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          timeoutMs: 60_000,
        } as Parameters<typeof adapter.connectServer>[1]);
      }

      logger?.info(`OpenAI Codex MCP server connected: ${serverName}`);
    },

    async disconnectMcpServer(serverName: string): Promise<void> {
      const adapter = mcpAdapters.get(serverName);
      if (adapter) {
        await adapter.close();
        mcpAdapters.delete(serverName);
        logger?.debug(`OpenAI Codex MCP server disconnected: ${serverName}`);
      }
    },

    async listMcpTools(): Promise<OpenAICodexToolDescriptor[]> {
      const tools: OpenAICodexToolDescriptor[] = [];
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
          logger?.warn(`Failed to list tools from OpenAI Codex MCP server ${serverName}`, {
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
    ): Promise<OpenAICodexToolResult> {
      const adapter = mcpAdapters.get(serverName) ?? mcpAdapters.get(defaultMcpServerName!);
      if (!adapter) {
        throw new OpenAICodexError(
          `MCP server not found: ${serverName}`,
          "MCP_SERVER_NOT_FOUND",
        );
      }

      const callId = `ccx-call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      try {
        const result = await adapter.callTool({
          serverName,
          toolName,
          arguments: toolArgs,
        });

        const output =
          result.content
            .map((block) => (block.type === "text" ? block.text : JSON.stringify(block)))
            .join("\n");

        return {
          callId,
          output,
          isError: result.isError,
        };
      } catch (error) {
        return {
          callId,
          output: error instanceof Error ? error.message : String(error),
          isError: true,
        };
      }
    },

    createSession(workspaceId?: string): OpenAICodexSession {
      return sessionManager.createSession(workspaceId);
    },

    async sendMessage(sessionId: string, content: string): Promise<OpenAICodexMessage> {
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        throw new OpenAICodexError(
          `Session not found: ${sessionId}`,
          "SESSION_NOT_FOUND",
        );
      }

      // Add user message
      const userMessage: OpenAICodexMessage = {
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
            logger?.debug(`OpenAI Codex session ${sessionId} using MCP mode with ${tools.length} tools`);
          }
        } catch {
          // Fall back to chat mode
        }
      }

      // Placeholder for AI response - in real implementation, this would call the OpenAI API
      const assistantMessage: OpenAICodexMessage = {
        role: "assistant",
        content: `[OpenAI Codex] Received: ${content}`,
        timestamp: new Date(),
      };
      sessionManager.updateSession(sessionId, assistantMessage);

      return assistantMessage;
    },
  };
}

/**
 * Map ZCode tool calls to OpenAI Codex tool format (Responses API)
 */
/** Map ZCode tool calls to OpenAI Codex tool format */
export function mapZCodeToolToOpenAICodex(toolName: string, toolInput: Record<string, unknown>): { name: string; input: Record<string, unknown> } {
  const toolMapping: Record<string, string> = {
    read_file: "read", write_file: "write", edit_file: "str_replace_editor", bash: "bash",
    glob: "glob", grep: "grep", web_search: "browser_search", web_fetch: "browser_fetch", mcp_tool_call: "mcp",
  };
  return { name: toolMapping[toolName] ?? toolName, input: toolInput };
}

/** Map OpenAI Codex tool results to ZCode format */
export function mapOpenAICodexResultToZCode(result: OpenAICodexToolResult): { output: string; isError?: boolean } {
  return { output: result.output, isError: result.isError };
}

/** Build OpenAI Responses API request body */
export function buildCodexResponsesRequest(options: {
  model: string; input: string;
  tools?: readonly { name: string; input: Record<string, unknown> }[];
  reasoning?: { effort: "low" | "medium" | "high" }; maxTokens?: number;
}): Record<string, unknown> {
  const body: Record<string, unknown> = { model: options.model, input: options.input };
  if (options.tools?.length) body.tools = options.tools.map((t) => ({ type: "function", name: t.name, parameters: t.input }));
  if (options.reasoning) body.reasoning = options.reasoning;
  if (options.maxTokens) body.max_output_tokens = options.maxTokens;
  return body;
}
