/**
 * Pi Agent Provider Adapter
 *
 * Connects ZCode to Pi AI (pi.ai) via MCP protocol.
 * Pi is an AI coding assistant from Zhipu AI that provides conversational coding assistance.
 *
 * API Reference: https://pi.ai/api
 */

import { randomUUID } from "node:crypto";
import type { Logger } from "@zcode/contracts";
import { createMcpAdapter, type McpPort } from "../mcp/index.js";

export const PI_AGENT_PROVIDER_ID = "pi-agent";

export interface PiAgentConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly workspaceId?: string;
}

export interface PiAgentSession {
  readonly sessionId: string;
  readonly createdAt: Date;
  readonly messages: PiAgentMessage[];
  readonly mcpServerName: string;
}

export interface PiAgentMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: Date;
  readonly toolCalls?: PiAgentToolCall[];
}

export interface PiAgentToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

export interface PiAgentToolResult {
  readonly callId: string;
  readonly output: string;
  readonly isError?: boolean;
}

/**
 * Pi Agent MCP server configuration
 * Pi provides an MCP server for programmatic access
 */
export interface PiAgentMcpServerConfig {
  readonly type: "http" | "stdio";
  readonly command?: string;
  readonly args?: string[];
  readonly env?: Record<string, string>;
  readonly url?: string;
  /** Bearer token for HTTP authentication, passed via Authorization header */
  readonly bearerToken?: string;
}

/**
 * Create MCP server config for Pi Agent
 */
export function createPiAgentMcpServerConfig(options: {
  apiKey: string;
  baseUrl?: string;
}): PiAgentMcpServerConfig {
  return {
    type: "http",
    url: options.baseUrl ?? "https://api.pi.ai/mcp",
    bearerToken: options.apiKey,
  };
}

/**
 * Pi Agent provider capabilities
 */
export interface PiAgentProviderCapabilities {
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
 * Default Pi Agent capabilities
 */
export const PI_AGENT_DEFAULT_CAPABILITIES: PiAgentProviderCapabilities = {
  supportsToolCall: true,
  supportsMultiModal: true,
  supportsCodeExecution: true,
  supportsFileOperations: true,
  supportsWebSearch: false,
  maxContextLength: 200_000,
  supportedModels: ["pi-3-mini-highspeed", "pi-3-mini", "pi-3-highspeed", "pi-3"],
  supportedApiType: "anthropic-messages",
};

/**
 * Pi Agent provider errors
 */
export class PiAgentError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "PiAgentError";
  }
}

/**
 * Pi Agent session manager with MCP integration
 */
export class PiAgentSessionManager {
  private readonly sessions = new Map<string, PiAgentSession>();
  private readonly logger?: Logger;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;
  }

  createSession(_workspaceId?: string): PiAgentSession {
    const sessionId = `pi-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const session: PiAgentSession = {
      sessionId,
      createdAt: new Date(),
      messages: [],
      mcpServerName: `pi-agent-${sessionId}`,
    };
    this.sessions.set(sessionId, session);
    this.logger?.debug(`PiAgent session created: ${sessionId}`);
    return session;
  }

  getSession(sessionId: string): PiAgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  addMessage(sessionId: string, message: PiAgentMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const updated: PiAgentSession = {
        ...session,
        messages: [...session.messages, message],
      };
      this.sessions.set(sessionId, updated);
    }
  }

  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger?.debug(`PiAgent session closed: ${sessionId}`);
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  listSessions(): PiAgentSession[] {
    return Array.from(this.sessions.values());
  }
}

export interface CreatePiAgentAdapterOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly logger?: Logger;
  readonly mcpTransport?: "http" | "stdio";
}

export interface PiAgentAdapter {
  readonly providerId: string;
  readonly capabilities: PiAgentProviderCapabilities;
  readonly sessionManager: PiAgentSessionManager;

  connect(config: PiAgentConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // MCP operations
  connectMcpServer(serverName: string, config: PiAgentMcpServerConfig): Promise<void>;
  disconnectMcpServer(serverName: string): Promise<void>;
  listMcpTools(): Promise<PiAgentToolDescriptor[]>;
  callMcpTool(
    serverName: string,
    toolName: string,
    toolArgs: Record<string, unknown>,
  ): Promise<PiAgentToolResult>;

  // Session operations
  createSession(workspaceId?: string): PiAgentSession;
  sendMessage(sessionId: string, content: string): Promise<PiAgentMessage>;
}

/**
 * Pi Agent tool descriptor
 */
export interface PiAgentToolDescriptor {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema?: Record<string, unknown>;
  readonly serverName: string;
}

/**
 * Create a Pi Agent adapter instance with real MCP integration
 *
 * The adapter manages connections to the Pi MCP server and provides
 * a unified interface for ZCode to interact with Pi Agent.
 */
export function createPiAgentAdapter(options: CreatePiAgentAdapterOptions = {}): PiAgentAdapter {
  const logger = options.logger;
  const sessionManager = new PiAgentSessionManager({ logger });
  const mcpAdapters = new Map<string, McpPort>();
  let connected = false;
  let _currentConfig: PiAgentConfig | undefined;
  let defaultMcpServerName: string | undefined;

  return {
    providerId: PI_AGENT_PROVIDER_ID,
    capabilities: PI_AGENT_DEFAULT_CAPABILITIES,
    sessionManager,

    async connect(config: PiAgentConfig): Promise<void> {
      if (!config.apiKey) {
        throw new PiAgentError("Pi Agent API key is required", "MISSING_API_KEY");
      }

      _currentConfig = config;
      logger?.debug(`Connecting to Pi Agent: ${config.baseUrl ?? "default"}`);

      // Create MCP adapter for Pi Agent
      const mcpConfig = createPiAgentMcpServerConfig({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      });

      const serverName = `pi-agent-${randomUUID().slice(0, 8)}`;
      defaultMcpServerName = serverName;

      const mcpAdapter = createMcpAdapter({
        logger: logger?.child({ module: "adapters.mcp.pi-agent" }),
      });
      mcpAdapters.set(serverName, mcpAdapter);

      try {
        // Pass bearer token via Authorization header for HTTP authentication
        const headers: Record<string, string> = {};
        if (mcpConfig.bearerToken) {
          headers["Authorization"] = `Bearer ${mcpConfig.bearerToken}`;
        }
        // Build config based on transport type - use type assertion as these configs are pre-validated
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
            command: mcpConfig.command ?? "pi-agent",
            args: mcpConfig.args,
            env: mcpConfig.env,
            timeoutMs: 60_000,
          } as Parameters<typeof mcpAdapter.connectServer>[1]);
        }
        logger?.info(`Pi Agent MCP server connected: ${serverName}`);
      } catch (error) {
        // If MCP connection fails, adapter still works in chat-only mode
        logger?.warn(`Pi Agent MCP connection failed, falling back to chat mode`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      connected = true;
      logger?.info(`Pi Agent connected successfully`);
    },

    async disconnect(): Promise<void> {
      connected = false;
      _currentConfig = undefined;

      // Close all MCP adapters
      for (const [serverName, adapter] of mcpAdapters) {
        try {
          await adapter.close();
          logger?.debug(`Pi Agent MCP server closed: ${serverName}`);
        } catch (error) {
          logger?.warn(`Error closing Pi Agent MCP server ${serverName}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      mcpAdapters.clear();

      // Close all sessions
      for (const sessionId of sessionManager["sessions"].keys()) {
        sessionManager.closeSession(sessionId);
      }
      logger?.info(`Pi Agent disconnected`);
    },

    isConnected(): boolean {
      return connected;
    },

    async connectMcpServer(serverName: string, config: PiAgentMcpServerConfig): Promise<void> {
      const adapter = createMcpAdapter({
        logger: logger?.child({ module: "adapters.mcp.pi-agent" }),
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
          command: config.command ?? "pi-agent",
          args: config.args,
          env: config.env,
          timeoutMs: 60_000,
        } as Parameters<typeof adapter.connectServer>[1]);
      }

      logger?.info(`Pi Agent MCP server connected: ${serverName}`);
    },

    async disconnectMcpServer(serverName: string): Promise<void> {
      const adapter = mcpAdapters.get(serverName);
      if (adapter) {
        await adapter.close();
        mcpAdapters.delete(serverName);
        logger?.debug(`Pi Agent MCP server disconnected: ${serverName}`);
      }
    },

    async listMcpTools(): Promise<PiAgentToolDescriptor[]> {
      const tools: PiAgentToolDescriptor[] = [];
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
          logger?.warn(`Failed to list tools from Pi Agent MCP server ${serverName}`, {
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
    ): Promise<PiAgentToolResult> {
      const adapter = mcpAdapters.get(serverName) ?? mcpAdapters.get(defaultMcpServerName!);
      if (!adapter) {
        throw new PiAgentError(`MCP server not found: ${serverName}`, "MCP_SERVER_NOT_FOUND");
      }

      const callId = `pi-call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

    createSession(workspaceId?: string): PiAgentSession {
      return sessionManager.createSession(workspaceId);
    },

    async sendMessage(sessionId: string, content: string): Promise<PiAgentMessage> {
      const session = sessionManager.getSession(sessionId);
      if (!session) {
        throw new PiAgentError(`Session not found: ${sessionId}`, "SESSION_NOT_FOUND");
      }

      // Add user message
      const userMessage: PiAgentMessage = {
        role: "user",
        content,
        timestamp: new Date(),
      };
      sessionManager.addMessage(sessionId, userMessage);

      // If MCP is connected, try tool call first
      const serverName = session.mcpServerName;
      const adapter = mcpAdapters.get(serverName);

      if (adapter && this.isConnected()) {
        try {
          // Use MCP tools if available
          const tools = await adapter.listTools();
          if (tools.length > 0) {
            logger?.debug(`Pi Agent session ${sessionId} using MCP mode`);
          }
        } catch {
          // Fall back to chat mode
        }
      }

      // Placeholder for AI response - in real implementation, this would call the Pi Agent API
      const assistantMessage: PiAgentMessage = {
        role: "assistant",
        content: `[Pi Agent] Received: ${content}`,
        timestamp: new Date(),
      };
      sessionManager.addMessage(sessionId, assistantMessage);

      return assistantMessage;
    },
  };
}

/** Map ZCode tool calls to Pi Agent tool format */
export function mapZCodeToolToPiAgent(toolName: string, toolInput: Record<string, unknown>): { name: string; input: Record<string, unknown> } {
  const toolMapping: Record<string, string> = {
    read_file: "read_file", write_file: "write_file", edit_file: "edit_file", bash: "run_command",
    glob: "glob_files", grep: "search_files", web_search: "web_search", web_fetch: "fetch_url",
  };
  return { name: toolMapping[toolName] ?? toolName, input: toolInput };
}

/** Map Pi Agent tool results to ZCode format */
export function mapPiAgentResultToZCode(result: PiAgentToolResult): { output: string; isError?: boolean } {
  return { output: result.output, isError: result.isError };
}
