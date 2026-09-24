/**
 * Claude Code Provider Adapter (ACP-based)
 *
 * Connects ZCode to Claude Code (claude.ai/code) via ACP (Agent Communication Protocol).
 * Uses HTTP to communicate with Claude Code API directly using ZCode Protocol.
 *
 * API Reference: https://docs.anthropic.com/en/docs/claude-code
 */

import { randomUUID } from "node:crypto";
import type { Logger } from "@zcode/contracts";
import {
  ZCODE_PROTOCOL_NAME,
  ZCODE_PROTOCOL_VERSION,
  ZCODE_PROTOCOL_V4_WIRE_VERSION,
} from "@zcode/shared";

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
  readonly workspaceRef: ClaudeCodeWorkspaceRef;
}

export interface ClaudeCodeWorkspaceRef {
  readonly workspacePath: string;
  readonly workspaceKey: string;
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
 * Claude Code ACP server configuration
 * Uses HTTP to connect directly to Claude Code API
 */
export interface ClaudeCodeAcpServerConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model?: string;
}

/**
 * Create ACP server config for Claude Code
 */
export function createClaudeCodeAcpServerConfig(options: {
  apiKey: string;
  baseUrl?: string;
}): ClaudeCodeAcpServerConfig {
  return {
    baseUrl: options.baseUrl ?? "https://api.anthropic.com/v1",
    apiKey: options.apiKey,
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

interface AcpSessionRecord {
  sessionId: string;
  createdAt: Date;
  conversationHistory: ClaudeCodeMessage[];
  workspaceRef: ClaudeCodeWorkspaceRef;
  httpClient: AcpHttpClient;
}

interface AcpHttpClient {
  post<T>(path: string, body: unknown): Promise<T>;
  get<T>(path: string): Promise<T>;
}

/**
 * Claude Code ACP Session Manager
 * Manages sessions using ZCode Protocol (ACP) via HTTP
 */
export class ClaudeCodeSessionManager {
  private readonly sessions = new Map<string, AcpSessionRecord>();
  private readonly logger?: Logger;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;
  }

  createSession(workspaceId?: string, httpClient?: AcpHttpClient): ClaudeCodeSession {
    const sessionId = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const workspacePath = workspaceId ?? process.cwd();
    const session: AcpSessionRecord = {
      sessionId,
      createdAt: new Date(),
      conversationHistory: [],
      workspaceRef: {
        workspacePath,
        workspaceKey: workspacePath,
      },
      httpClient: httpClient ?? this.createDefaultHttpClient(),
    };
    this.sessions.set(sessionId, session);
    this.logger?.debug(`Claude Code ACP session created: ${sessionId}`);
    return this.toClaudeCodeSession(session);
  }

  private createDefaultHttpClient(): AcpHttpClient {
    return {
      post: async <T>(_path: string, _body: unknown): Promise<T> => {
        throw new ClaudeCodeError("HTTP client not configured", "HTTP_CLIENT_NOT_CONFIGURED");
      },
      get: async <T>(_path: string): Promise<T> => {
        throw new ClaudeCodeError("HTTP client not configured", "HTTP_CLIENT_NOT_CONFIGURED");
      },
    };
  }

  private toClaudeCodeSession(record: AcpSessionRecord): ClaudeCodeSession {
    return {
      sessionId: record.sessionId,
      createdAt: record.createdAt,
      conversationHistory: record.conversationHistory,
      workspaceRef: record.workspaceRef,
    };
  }

  getSession(sessionId: string): ClaudeCodeSession | undefined {
    const record = this.sessions.get(sessionId);
    return record ? this.toClaudeCodeSession(record) : undefined;
  }

  getSessionRecord(sessionId: string): AcpSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, message: ClaudeCodeMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.conversationHistory.push(message);
    }
  }

  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger?.debug(`Claude Code ACP session closed: ${sessionId}`);
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  listSessions(): ClaudeCodeSession[] {
    return Array.from(this.sessions.values()).map((s) => this.toClaudeCodeSession(s));
  }
}

export interface CreateClaudeCodeAdapterOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly logger?: Logger;
  readonly httpClient?: AcpHttpClient;
}

export interface ClaudeCodeAdapter {
  readonly providerId: string;
  readonly capabilities: ClaudeCodeProviderCapabilities;
  readonly sessionManager: ClaudeCodeSessionManager;

  connect(config: ClaudeCodeConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // ACP operations
  createAcpSession(workspaceId?: string): ClaudeCodeSession;
  sendAcpMessage(sessionId: string, content: string): Promise<ClaudeCodeMessage>;
  sendAcpToolResult(sessionId: string, toolUseId: string, result: string, isError?: boolean): Promise<void>;
}

export interface ClaudeCodeToolDescriptor {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema?: Record<string, unknown>;
}

const CLAUDE_CODE_TOOLS: ClaudeCodeToolDescriptor[] = [
  { name: "Read", description: "Read file contents", inputSchema: { type: "object", properties: { file_path: { type: "string" } }, required: ["file_path"] } },
  { name: "Write", description: "Write content to file", inputSchema: { type: "object", properties: { file_path: { type: "string" }, content: { type: "string" } }, required: ["file_path", "content"] } },
  { name: "Edit", description: "Edit file contents", inputSchema: { type: "object", properties: { file_path: { type: "string" }, old_string: { type: "string" }, new_string: { type: "string" } }, required: ["file_path", "old_string", "new_string"] } },
  { name: "Bash", description: "Execute shell command", inputSchema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
  { name: "Glob", description: "Find files matching pattern", inputSchema: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] } },
  { name: "Grep", description: "Search file contents", inputSchema: { type: "object", properties: { pattern: { type: "string" }, path: { type: "string" } }, required: ["pattern"] } },
  { name: "WebSearch", description: "Search the web", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "WebFetch", description: "Fetch URL content", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
];

/**
 * Create a Claude Code adapter instance using ACP (Agent Communication Protocol)
 *
 * This adapter uses HTTP to communicate with Claude Code API directly,
 * implementing the ZCode Protocol for session management and tool calls.
 */
export function createClaudeCodeAdapter(
  options: CreateClaudeCodeAdapterOptions = {},
): ClaudeCodeAdapter {
  const logger = options.logger;
  const sessionManager = new ClaudeCodeSessionManager({ logger });
  let connected = false;
  let _currentConfig: ClaudeCodeConfig | undefined;
  let httpClient: AcpHttpClient | undefined;

  const createHttpClient = (config: ClaudeCodeConfig): AcpHttpClient => {
    const baseUrl = config.baseUrl ?? "https://api.anthropic.com/v1";
    return {
      post: async <T>(path: string, body: unknown): Promise<T> => {
        const response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey ?? "",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new ClaudeCodeError(
            `Claude Code API error: ${response.status} ${response.statusText}`,
            "API_ERROR",
            response.status,
          );
        }
        return response.json() as Promise<T>;
      },
      get: async <T>(path: string): Promise<T> => {
        const response = await fetch(`${baseUrl}${path}`, {
          method: "GET",
          headers: {
            "x-api-key": config.apiKey ?? "",
            "anthropic-version": "2023-06-01",
          },
        });
        if (!response.ok) {
          throw new ClaudeCodeError(
            `Claude Code API error: ${response.status} ${response.statusText}`,
            "API_ERROR",
            response.status,
          );
        }
        return response.json() as Promise<T>;
      },
    };
  };

  return {
    providerId: CLAUDE_CODE_PROVIDER_ID,
    capabilities: CLAUDE_CODE_DEFAULT_CAPABILITIES,
    sessionManager,

    async connect(config: ClaudeCodeConfig): Promise<void> {
      if (!config.apiKey) {
        throw new ClaudeCodeError("Claude Code API key is required", "MISSING_API_KEY");
      }

      _currentConfig = config;
      httpClient = createHttpClient(config);
      logger?.debug(`Connecting to Claude Code via ACP: ${config.baseUrl ?? "default"}`);
      connected = true;
      logger?.info(`Claude Code ACP connected successfully`);
    },

    async disconnect(): Promise<void> {
      connected = false;
      _currentConfig = undefined;
      httpClient = undefined;

      for (const sessionId of sessionManager["sessions"].keys()) {
        sessionManager.closeSession(sessionId);
      }
      logger?.info(`Claude Code ACP disconnected`);
    },

    isConnected(): boolean {
      return connected;
    },

    createAcpSession(workspaceId?: string): ClaudeCodeSession {
      return sessionManager.createSession(workspaceId, httpClient);
    },

    async sendAcpMessage(sessionId: string, content: string): Promise<ClaudeCodeMessage> {
      if (!connected || !httpClient) {
        throw new ClaudeCodeError("Claude Code ACP not connected", "NOT_CONNECTED");
      }

      const record = sessionManager.getSessionRecord(sessionId);
      if (!record) {
        throw new ClaudeCodeError(`Session not found: ${sessionId}`, "SESSION_NOT_FOUND");
      }

      const userMessage: ClaudeCodeMessage = {
        role: "user",
        content,
        timestamp: new Date(),
      };
      sessionManager.updateSession(sessionId, userMessage);

      try {
        const response = await httpClient.post<{
          id: string;
          type: string;
          role: string;
          content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown>; id?: string }>;
        }>("/messages", {
          model: _currentConfig?.model ?? "claude-opus-4-5",
          max_tokens: 8192,
          messages: [
            ...record.conversationHistory.map((m) => ({
              role: m.role,
              content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
            })),
            { role: "user", content },
          ],
          tools: CLAUDE_CODE_TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.inputSchema,
          })),
        });

        const assistantMessage: ClaudeCodeMessage = {
          role: "assistant",
          content: response.content?.map((block) => {
            if (block.type === "text") {
              return { type: "text" as const, text: block.text ?? "" };
            }
            if (block.type === "tool_use") {
              return { type: "tool_use" as const, id: block.id ?? "", name: block.name ?? "", input: block.input ?? {} };
            }
            return { type: "text" as const, text: JSON.stringify(block) };
          }) ?? [],
          timestamp: new Date(),
        };
        sessionManager.updateSession(sessionId, assistantMessage);
        logger?.debug(`Claude Code ACP message sent, response received`);

        return assistantMessage;
      } catch (error) {
        logger?.error(`Claude Code ACP message failed: ${error}`);
        const errorMessage: ClaudeCodeMessage = {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date(),
        };
        sessionManager.updateSession(sessionId, errorMessage);
        return errorMessage;
      }
    },

    async sendAcpToolResult(
      sessionId: string,
      toolUseId: string,
      result: string,
      isError?: boolean,
    ): Promise<void> {
      if (!connected) {
        throw new ClaudeCodeError("Claude Code ACP not connected", "NOT_CONNECTED");
      }
      logger?.debug(`Claude Code ACP tool result for ${toolUseId}`);
    },
  };
}

export function mapZCodeToolToClaudeCode(toolName: string, toolInput: Record<string, unknown>): { name: string; input: Record<string, unknown> } {
  const toolMapping: Record<string, string> = {
    read_file: "Read",
    write_file: "Write",
    edit_file: "Edit",
    bash: "Bash",
    glob: "Glob",
    grep: "Grep",
    web_search: "WebSearch",
    web_fetch: "WebFetch",
    mcp_tool_call: "MCPTool",
  };
  return { name: toolMapping[toolName] ?? toolName, input: toolInput };
}

export function mapClaudeCodeResultToZCode(result: ClaudeCodeToolResult): { output: string; isError?: boolean } {
  return { output: result.content, isError: result.isError };
}

export function normalizeClaudeCodeMessage(message: ClaudeCodeMessage): ClaudeCodeContentBlock[] {
  if (typeof message.content === "string") return [{ type: "text", text: message.content }];
  return message.content;
}

export { CLAUDE_CODE_TOOLS };
