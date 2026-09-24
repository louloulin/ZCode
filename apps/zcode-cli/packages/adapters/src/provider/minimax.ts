/**
 * MiniMax Provider Adapter (ACP-based)
 *
 * Connects ZCode to MiniMax AI via ACP (Agent Communication Protocol).
 * Uses HTTP to communicate with MiniMax API directly.
 *
 * API Reference: https://api.minimaxi.com/anthropic
 */

import type { Logger } from "@zcode/contracts";

export const MINIMAX_PROVIDER_ID = "minimax";

export interface MiniMaxConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly workspaceId?: string;
}

export interface MiniMaxSession {
  readonly sessionId: string;
  readonly createdAt: Date;
  readonly messages: MiniMaxMessage[];
  readonly workspaceRef: MiniMaxWorkspaceRef;
}

export interface MiniMaxWorkspaceRef {
  readonly workspacePath: string;
  readonly workspaceKey: string;
}

export interface MiniMaxMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: Date;
}

export interface MiniMaxToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

export interface MiniMaxToolResult {
  readonly callId: string;
  readonly output: string;
  readonly isError?: boolean;
}

/**
 * MiniMax ACP server configuration
 */
export interface MiniMaxAcpServerConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model?: string;
}

/**
 * Create ACP server config for MiniMax
 */
export function createMiniMaxAcpServerConfig(options: {
  apiKey: string;
  baseUrl?: string;
}): MiniMaxAcpServerConfig {
  return {
    baseUrl: options.baseUrl ?? "https://api.minimaxi.com/anthropic",
    apiKey: options.apiKey,
  };
}

/**
 * MiniMax provider capabilities
 */
export interface MiniMaxProviderCapabilities {
  readonly supportsToolCall: boolean;
  readonly supportsMultiModal: boolean;
  readonly supportsCodeExecution: boolean;
  readonly supportsFileOperations: boolean;
  readonly supportsWebSearch: boolean;
  readonly maxContextLength: number;
  readonly supportedModels: readonly string[];
  readonly supportedApiType: "anthropic-messages";
}

export const MINIMAX_DEFAULT_CAPABILITIES: MiniMaxProviderCapabilities = {
  supportsToolCall: true,
  supportsMultiModal: true,
  supportsCodeExecution: true,
  supportsFileOperations: true,
  supportsWebSearch: false,
  maxContextLength: 200_000,
  supportedModels: [
    "MiniMax-M3",
    "MiniMax-M2.7",
    "MiniMax-M2.7-highspeed",
    "MiniMax-M2.5",
    "MiniMax-M2.5-highspeed",
    "MiniMax-M2.1",
    "MiniMax-M2.1-highspeed",
    "MiniMax-M2",
  ],
  supportedApiType: "anthropic-messages",
};

export class MiniMaxError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "MiniMaxError";
  }
}

interface AcpSessionRecord {
  sessionId: string;
  createdAt: Date;
  messages: MiniMaxMessage[];
  workspaceRef: MiniMaxWorkspaceRef;
  httpClient: AcpHttpClient;
}

interface AcpHttpClient {
  post<T>(path: string, body: unknown): Promise<T>;
  get<T>(path: string): Promise<T>;
}

/**
 * MiniMax ACP Session Manager
 */
export class MiniMaxSessionManager {
  private readonly sessions = new Map<string, AcpSessionRecord>();
  private readonly logger?: Logger;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;
  }

  createSession(workspaceId?: string, httpClient?: AcpHttpClient): MiniMaxSession {
    const sessionId = `minimax-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
    this.logger?.debug(`MiniMax ACP session created: ${sessionId}`);
    return this.toMiniMaxSession(session);
  }

  private createDefaultHttpClient(): AcpHttpClient {
    return {
      post: async <T>(_path: string, _body: unknown): Promise<T> => {
        throw new MiniMaxError("HTTP client not configured", "HTTP_CLIENT_NOT_CONFIGURED");
      },
      get: async <T>(_path: string): Promise<T> => {
        throw new MiniMaxError("HTTP client not configured", "HTTP_CLIENT_NOT_CONFIGURED");
      },
    };
  }

  private toMiniMaxSession(record: AcpSessionRecord): MiniMaxSession {
    return {
      sessionId: record.sessionId,
      createdAt: record.createdAt,
      messages: record.messages,
      workspaceRef: record.workspaceRef,
    };
  }

  getSession(sessionId: string): MiniMaxSession | undefined {
    const record = this.sessions.get(sessionId);
    return record ? this.toMiniMaxSession(record) : undefined;
  }

  getSessionRecord(sessionId: string): AcpSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  addMessage(sessionId: string, message: MiniMaxMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
    }
  }

  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger?.debug(`MiniMax ACP session closed: ${sessionId}`);
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  listSessions(): MiniMaxSession[] {
    return Array.from(this.sessions.values()).map((s) => this.toMiniMaxSession(s));
  }
}

export interface CreateMiniMaxAdapterOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly logger?: Logger;
  readonly httpClient?: AcpHttpClient;
}

export interface MiniMaxAdapter {
  readonly providerId: string;
  readonly capabilities: MiniMaxProviderCapabilities;
  readonly sessionManager: MiniMaxSessionManager;

  connect(config: MiniMaxConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // ACP operations
  createAcpSession(workspaceId?: string): MiniMaxSession;
  sendAcpMessage(sessionId: string, content: string): Promise<MiniMaxMessage>;
  sendAcpToolResult(sessionId: string, toolCallId: string, result: string, isError?: boolean): Promise<void>;
}

export interface MiniMaxToolDescriptor {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema?: Record<string, unknown>;
}

const MINIMAX_TOOLS: MiniMaxToolDescriptor[] = [
  { name: "read_file", description: "Read file contents", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "write_file", description: "Write content to file", inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } },
  { name: "glob_files", description: "Find files matching pattern", inputSchema: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] } },
  { name: "grep", description: "Search file contents", inputSchema: { type: "object", properties: { pattern: { type: "string" }, path: { type: "string" } }, required: ["pattern"] } },
  { name: "bash", description: "Execute shell command", inputSchema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
];

/**
 * Create a MiniMax adapter instance using ACP (Agent Communication Protocol)
 */
export function createMiniMaxAdapter(options: CreateMiniMaxAdapterOptions = {}): MiniMaxAdapter {
  const logger = options.logger;
  const sessionManager = new MiniMaxSessionManager({ logger });
  let connected = false;
  let _currentConfig: MiniMaxConfig | undefined;
  let httpClient: AcpHttpClient | undefined;

  const createHttpClient = (config: MiniMaxConfig): AcpHttpClient => {
    const baseUrl = config.baseUrl ?? "https://api.minimaxi.com/anthropic";
    return {
      post: async <T>(path: string, body: unknown): Promise<T> => {
        const response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.apiKey ?? ""}`,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new MiniMaxError(
            `MiniMax API error: ${response.status} ${response.statusText}`,
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
            "Authorization": `Bearer ${config.apiKey ?? ""}`,
            "anthropic-version": "2023-06-01",
          },
        });
        if (!response.ok) {
          throw new MiniMaxError(
            `MiniMax API error: ${response.status} ${response.statusText}`,
            "API_ERROR",
            response.status,
          );
        }
        return response.json() as Promise<T>;
      },
    };
  };

  return {
    providerId: MINIMAX_PROVIDER_ID,
    capabilities: MINIMAX_DEFAULT_CAPABILITIES,
    sessionManager,

    async connect(config: MiniMaxConfig): Promise<void> {
      if (!config.apiKey) {
        throw new MiniMaxError("MiniMax API key is required", "MISSING_API_KEY");
      }

      _currentConfig = config;
      httpClient = createHttpClient(config);
      logger?.debug(`Connecting to MiniMax via ACP: ${config.baseUrl ?? "default"}`);
      connected = true;
      logger?.info(`MiniMax ACP connected successfully`);
    },

    async disconnect(): Promise<void> {
      connected = false;
      _currentConfig = undefined;
      httpClient = undefined;

      for (const sessionId of sessionManager["sessions"].keys()) {
        sessionManager.closeSession(sessionId);
      }
      logger?.info(`MiniMax ACP disconnected`);
    },

    isConnected(): boolean {
      return connected;
    },

    createAcpSession(workspaceId?: string): MiniMaxSession {
      return sessionManager.createSession(workspaceId, httpClient);
    },

    async sendAcpMessage(sessionId: string, content: string): Promise<MiniMaxMessage> {
      if (!connected || !httpClient) {
        throw new MiniMaxError("MiniMax ACP not connected", "NOT_CONNECTED");
      }

      const record = sessionManager.getSessionRecord(sessionId);
      if (!record) {
        throw new MiniMaxError(`Session not found: ${sessionId}`, "SESSION_NOT_FOUND");
      }

      const userMessage: MiniMaxMessage = {
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
        }>("/messages", {
          model: _currentConfig?.model ?? "MiniMax-M2.7",
          max_tokens: 4096,
          messages: [
            ...record.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content },
          ],
        });

        const assistantMessage: MiniMaxMessage = {
          role: "assistant",
          content: response.content?.[0]?.text ?? "",
          timestamp: new Date(),
        };
        sessionManager.addMessage(sessionId, assistantMessage);
        logger?.debug(`MiniMax ACP message sent, response received`);

        return assistantMessage;
      } catch (error) {
        logger?.error(`MiniMax ACP message failed: ${error}`);
        const errorMessage: MiniMaxMessage = {
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
        throw new MiniMaxError("MiniMax ACP not connected", "NOT_CONNECTED");
      }
      logger?.debug(`MiniMax ACP tool result for ${toolCallId}`);
    },
  };
}

export function mapZCodeToolToMiniMax(toolName: string, toolInput: Record<string, unknown>): { name: string; input: Record<string, unknown> } {
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

export function mapMiniMaxResultToZCode(result: MiniMaxToolResult): { output: string; isError?: boolean } {
  return { output: result.output, isError: result.isError };
}

export { MINIMAX_TOOLS };
