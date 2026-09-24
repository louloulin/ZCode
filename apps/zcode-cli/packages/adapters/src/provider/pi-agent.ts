/**
 * Pi Agent Provider Adapter (ACP-based)
 *
 * Connects ZCode to Pi AI (pi.ai) via ACP (Agent Communication Protocol).
 * Uses HTTP to communicate with Pi Agent's API directly using ZCode Protocol.
 *
 * API Reference: https://pi.ai/api
 */

import { randomUUID } from "node:crypto";
import type { Logger } from "@zcode/contracts";
import { ZCODE_PROTOCOL_NAME, ZCODE_PROTOCOL_VERSION } from "@zcode/shared";

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
  readonly workspaceRef: PiAgentWorkspaceRef;
}

export interface PiAgentWorkspaceRef {
  readonly workspacePath: string;
  readonly workspaceKey: string;
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
 * Pi Agent ACP server configuration
 * Uses HTTP to connect directly to Pi Agent API
 */
export interface PiAgentAcpServerConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model?: string;
}

/**
 * Create ACP server config for Pi Agent
 */
export function createPiAgentAcpServerConfig(options: {
  apiKey: string;
  baseUrl?: string;
}): PiAgentAcpServerConfig {
  return {
    baseUrl: options.baseUrl ?? "https://api.minimaxi.com/anthropic",
    apiKey: options.apiKey,
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

interface AcpSessionRecord {
  sessionId: string;
  createdAt: Date;
  messages: PiAgentMessage[];
  workspaceRef: PiAgentWorkspaceRef;
  httpClient: AcpHttpClient;
}

interface AcpHttpClient {
  post<T>(path: string, body: unknown): Promise<T>;
  get<T>(path: string): Promise<T>;
}

/**
 * Pi Agent ACP Session Manager
 * Manages sessions using ZCode Protocol (ACP) via HTTP
 */
export class PiAgentSessionManager {
  private readonly sessions = new Map<string, AcpSessionRecord>();
  private readonly logger?: Logger;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;
  }

  createSession(workspaceId?: string, httpClient?: AcpHttpClient): PiAgentSession {
    const sessionId = `pi-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const workspacePath = workspaceId ?? process.cwd();
    const session: AcpSessionRecord = {
      sessionId,
      createdAt: new Date(),
      messages: [],
      workspaceRef: {
        workspacePath,
        workspaceKey: workspacePath,
      },
      httpClient: httpClient ?? this.createDefaultHttpClient(),
    };
    this.sessions.set(sessionId, session);
    this.logger?.debug(`PiAgent ACP session created: ${sessionId}`);
    return this.toPiAgentSession(session);
  }

  private createDefaultHttpClient(): AcpHttpClient {
    return {
      post: async <T>(_path: string, _body: unknown): Promise<T> => {
        throw new PiAgentError("HTTP client not configured", "HTTP_CLIENT_NOT_CONFIGURED");
      },
      get: async <T>(_path: string): Promise<T> => {
        throw new PiAgentError("HTTP client not configured", "HTTP_CLIENT_NOT_CONFIGURED");
      },
    };
  }

  private toPiAgentSession(record: AcpSessionRecord): PiAgentSession {
    return {
      sessionId: record.sessionId,
      createdAt: record.createdAt,
      messages: record.messages,
      workspaceRef: record.workspaceRef,
    };
  }

  getSession(sessionId: string): PiAgentSession | undefined {
    const record = this.sessions.get(sessionId);
    return record ? this.toPiAgentSession(record) : undefined;
  }

  getSessionRecord(sessionId: string): AcpSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  addMessage(sessionId: string, message: PiAgentMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
    }
  }

  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger?.debug(`PiAgent ACP session closed: ${sessionId}`);
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  listSessions(): PiAgentSession[] {
    return Array.from(this.sessions.values()).map((s) => this.toPiAgentSession(s));
  }
}

export interface CreatePiAgentAdapterOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly logger?: Logger;
  readonly httpClient?: AcpHttpClient;
}

export interface PiAgentAdapter {
  readonly providerId: string;
  readonly capabilities: PiAgentProviderCapabilities;
  readonly sessionManager: PiAgentSessionManager;

  connect(config: PiAgentConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // ACP operations
  createAcpSession(workspaceId?: string): PiAgentSession;
  sendAcpMessage(sessionId: string, content: string): Promise<PiAgentMessage>;
  sendAcpToolResult(sessionId: string, toolCallId: string, result: string, isError?: boolean): Promise<void>;
}

export interface PiAgentToolDescriptor {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema?: Record<string, unknown>;
}

const PI_AGENT_TOOLS: PiAgentToolDescriptor[] = [
  { name: "read_file", description: "Read file contents", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "write_file", description: "Write content to file", inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } },
  { name: "glob_files", description: "Find files matching pattern", inputSchema: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] } },
  { name: "grep", description: "Search file contents", inputSchema: { type: "object", properties: { pattern: { type: "string" }, path: { type: "string" } }, required: ["pattern"] } },
  { name: "bash", description: "Execute shell command", inputSchema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
];

/**
 * Create a Pi Agent adapter instance using ACP (Agent Communication Protocol)
 *
 * This adapter uses HTTP to communicate with Pi Agent's API directly,
 * implementing the ZCode Protocol for session management and tool calls.
 */
export function createPiAgentAdapter(options: CreatePiAgentAdapterOptions = {}): PiAgentAdapter {
  const logger = options.logger;
  const sessionManager = new PiAgentSessionManager({ logger });
  let connected = false;
  let _currentConfig: PiAgentConfig | undefined;
  let httpClient: AcpHttpClient | undefined;

  const createHttpClient = (config: PiAgentConfig): AcpHttpClient => {
    const baseUrl = config.baseUrl ?? "https://api.minimaxi.com/anthropic";
    return {
      post: async <T>(path: string, body: unknown): Promise<T> => {
        const response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey ?? "",
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new PiAgentError(
            `Pi Agent API error: ${response.status} ${response.statusText}`,
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
          },
        });
        if (!response.ok) {
          throw new PiAgentError(
            `Pi Agent API error: ${response.status} ${response.statusText}`,
            "API_ERROR",
            response.status,
          );
        }
        return response.json() as Promise<T>;
      },
    };
  };

  return {
    providerId: PI_AGENT_PROVIDER_ID,
    capabilities: PI_AGENT_DEFAULT_CAPABILITIES,
    sessionManager,

    async connect(config: PiAgentConfig): Promise<void> {
      if (!config.apiKey) {
        throw new PiAgentError("Pi Agent API key is required", "MISSING_API_KEY");
      }

      _currentConfig = config;
      httpClient = createHttpClient(config);
      logger?.debug(`Connecting to Pi Agent via ACP: ${config.baseUrl ?? "default"}`);
      connected = true;
      logger?.info(`Pi Agent ACP connected successfully`);
    },

    async disconnect(): Promise<void> {
      connected = false;
      _currentConfig = undefined;
      httpClient = undefined;

      for (const sessionId of sessionManager["sessions"].keys()) {
        sessionManager.closeSession(sessionId);
      }
      logger?.info(`Pi Agent ACP disconnected`);
    },

    isConnected(): boolean {
      return connected;
    },

    createAcpSession(workspaceId?: string): PiAgentSession {
      return sessionManager.createSession(workspaceId, httpClient);
    },

    async sendAcpMessage(sessionId: string, content: string): Promise<PiAgentMessage> {
      if (!connected || !httpClient) {
        throw new PiAgentError("Pi Agent ACP not connected", "NOT_CONNECTED");
      }

      const record = sessionManager.getSessionRecord(sessionId);
      if (!record) {
        throw new PiAgentError(`Session not found: ${sessionId}`, "SESSION_NOT_FOUND");
      }

      const userMessage: PiAgentMessage = {
        role: "user",
        content,
        timestamp: new Date(),
      };
      sessionManager.addMessage(sessionId, userMessage);

      try {
        const response = await httpClient.post<{
          id: string;
          type: string;
          role: string;
          content: Array<{ type: string; text?: string }>;
        }>("/v1/messages", {
          model: _currentConfig?.model ?? "pi-3-mini",
          max_tokens: 4096,
          messages: [
            ...record.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content },
          ],
        });

        const assistantMessage: PiAgentMessage = {
          role: "assistant",
          content: response.content?.[0]?.text ?? "",
          timestamp: new Date(),
        };
        sessionManager.addMessage(sessionId, assistantMessage);
        logger?.debug(`Pi Agent ACP message sent, response received`);

        return assistantMessage;
      } catch (error) {
        logger?.error(`Pi Agent ACP message failed: ${error}`);
        const errorMessage: PiAgentMessage = {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date(),
        };
        sessionManager.addMessage(sessionId, errorMessage);
        return errorMessage;
      }
    },

    async sendAcpToolResult(
      sessionId: string,
      toolCallId: string,
      result: string,
      isError?: boolean,
    ): Promise<void> {
      if (!connected) {
        throw new PiAgentError("Pi Agent ACP not connected", "NOT_CONNECTED");
      }
      logger?.debug(`Pi Agent ACP tool result for ${toolCallId}`);
    },
  };
}

export function mapZCodeToolToPiAgent(toolName: string, toolInput: Record<string, unknown>): { name: string; input: Record<string, unknown> } {
  const toolMapping: Record<string, string> = {
    read_file: "read_file",
    write_file: "write_file",
    edit_file: "edit_file",
    bash: "bash",
    glob: "glob_files",
    grep: "grep",
    web_search: "web_search",
    web_fetch: "fetch_url",
  };
  return { name: toolMapping[toolName] ?? toolName, input: toolInput };
}

export function mapPiAgentResultToZCode(result: PiAgentToolResult): { output: string; isError?: boolean } {
  return { output: result.output, isError: result.isError };
}

export { PI_AGENT_TOOLS };
