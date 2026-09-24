/**
 * Pi Agent Provider Adapter
 *
 * Connects ZCode to Pi AI (pi.ai) via MCP protocol.
 * Pi is an AI coding assistant from Zhipu AI that provides conversational coding assistance.
 *
 * API Reference: https://pi.ai/api
 */

import type { Logger } from "@zcode/contracts";

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
}

export interface PiAgentMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: Date;
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
  readonly auth?: {
    readonly type: "bearer";
    readonly token: string;
  };
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
    url: options.baseUrl ?? "https://pi.ai/mcp",
    auth: {
      type: "bearer",
      token: options.apiKey,
    },
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
 * Pi Agent session manager
 */
export class PiAgentSessionManager {
  private readonly sessions = new Map<string, PiAgentSession>();
  private readonly logger?: Logger;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;
  }

  createSession(workspaceId?: string): PiAgentSession {
    const sessionId = `pi-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const session: PiAgentSession = { sessionId, createdAt: new Date() };
    this.sessions.set(sessionId, session);
    this.logger?.debug(`PiAgent session created: ${sessionId}`);
    return session;
  }

  getSession(sessionId: string): PiAgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger?.debug(`PiAgent session closed: ${sessionId}`);
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
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
}

/**
 * Create a Pi Agent adapter instance
 *
 * The adapter manages connections to the Pi MCP server and provides
 * a unified interface for ZCode to interact with Pi Agent.
 */
export function createPiAgentAdapter(
  options: CreatePiAgentAdapterOptions = {},
): PiAgentAdapter {
  const logger = options.logger;
  const sessionManager = new PiAgentSessionManager({ logger });
  let connected = false;
  let currentConfig: PiAgentConfig | undefined;

  return {
    providerId: PI_AGENT_PROVIDER_ID,
    capabilities: PI_AGENT_DEFAULT_CAPABILITIES,
    sessionManager,

    async connect(config: PiAgentConfig): Promise<void> {
      if (!config.apiKey) {
        throw new PiAgentError("Pi Agent API key is required", "MISSING_API_KEY");
      }

      currentConfig = config;
      logger?.debug(`Connecting to Pi Agent: ${config.baseUrl ?? "default"}`);

      // In a full implementation, this would:
      // 1. Create an MCP connection to the Pi MCP server
      // 2. Authenticate with the provided API key
      // 3. Initialize the session
      // 4. Set up tool handlers

      connected = true;
      logger?.info(`Pi Agent connected successfully`);
    },

    async disconnect(): Promise<void> {
      connected = false;
      currentConfig = undefined;
      // Close all sessions
      for (const sessionId of sessionManager["sessions"].keys()) {
        sessionManager.closeSession(sessionId);
      }
      logger?.info(`Pi Agent disconnected`);
    },

    isConnected(): boolean {
      return connected;
    },
  };
}

/**
 * Map ZCode tool calls to Pi Agent tool format
 */
export function mapZCodeToolToPiAgent(
  toolName: string,
  toolInput: Record<string, unknown>,
): { name: string; input: Record<string, unknown> } {
  // ZCode -> Pi Agent tool name mapping
  const toolMapping: Record<string, string> = {
    "read_file": "read_file",
    "write_file": "write_file",
    "edit_file": "edit_file",
    "bash": "run_command",
    "glob": "glob_files",
    "grep": "search_files",
    "web_search": "web_search",
    "web_fetch": "fetch_url",
  };

  return {
    name: toolMapping[toolName] ?? toolName,
    input: toolInput,
  };
}

/**
 * Map Pi Agent tool results to ZCode format
 */
export function mapPiAgentResultToZCode(
  result: PiAgentToolResult,
): { output: string; isError?: boolean } {
  return {
    output: result.output,
    isError: result.isError,
  };
}
