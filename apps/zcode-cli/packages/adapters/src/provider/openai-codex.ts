/**
 * OpenAI Codex Provider Adapter
 *
 * Connects ZCode to OpenAI Codex (OpenAI's coding model via Responses API).
 * Codex provides powerful code generation and editing capabilities.
 *
 * API Reference: https://platform.openai.com/docs/guides/code-execution
 */

import type { Logger } from "@zcode/contracts";

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
  readonly auth?: {
    readonly type: "bearer";
    readonly token: string;
  };
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
    auth: {
      type: "bearer",
      token: options.apiKey,
    },
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
 * OpenAI Codex session manager
 */
export class OpenAICodexSessionManager {
  private readonly sessions = new Map<string, OpenAICodexSession>();
  private readonly logger?: Logger;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;
  }

  createSession(workspaceId?: string): OpenAICodexSession {
    const sessionId = `ccx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const session: OpenAICodexSession = {
      sessionId,
      createdAt: new Date(),
      conversationHistory: [],
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
}

/**
 * Create an OpenAI Codex adapter instance
 *
 * The adapter manages connections to OpenAI Codex via the Responses API
 * and provides a unified interface for ZCode to interact with Codex.
 */
export function createOpenAICodexAdapter(
  options: CreateOpenAICodexAdapterOptions = {},
): OpenAICodexAdapter {
  const logger = options.logger;
  const sessionManager = new OpenAICodexSessionManager({ logger });
  let connected = false;
  let currentConfig: OpenAICodexConfig | undefined;

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

      currentConfig = config;
      logger?.debug(`Connecting to OpenAI Codex: ${config.baseUrl ?? "default"}`);

      // In a full implementation, this would:
      // 1. Set up the Responses API client with code execution support
      // 2. Authenticate with the provided API key
      // 3. Initialize a session
      // 4. Configure tool handlers for Codex's built-in tools

      connected = true;
      logger?.info(`OpenAI Codex connected successfully`);
    },

    async disconnect(): Promise<void> {
      connected = false;
      currentConfig = undefined;
      // Close all sessions
      for (const sessionId of sessionManager["sessions"].keys()) {
        sessionManager.closeSession(sessionId);
      }
      logger?.info(`OpenAI Codex disconnected`);
    },

    isConnected(): boolean {
      return connected;
    },
  };
}

/**
 * Map ZCode tool calls to OpenAI Codex tool format (Responses API)
 */
export function mapZCodeToolToOpenAICodex(
  toolName: string,
  toolInput: Record<string, unknown>,
): { name: string; input: Record<string, unknown> } {
  // OpenAI Codex uses computer-use style tools
  const toolMapping: Record<string, string> = {
    "read_file": "read",
    "write_file": "write",
    "edit_file": "str_replace_editor",
    "bash": "bash",
    "glob": "glob",
    "grep": "grep",
    "web_search": "browser_search",
    "web_fetch": "browser_fetch",
    "mcp_tool_call": "mcp",
  };

  return {
    name: toolMapping[toolName] ?? toolName,
    input: toolInput,
  };
}

/**
 * Map OpenAI Codex tool results to ZCode format
 */
export function mapOpenAICodexResultToZCode(
  result: OpenAICodexToolResult,
): { output: string; isError?: boolean } {
  return {
    output: result.output,
    isError: result.isError,
  };
}

/**
 * Build OpenAI Responses API request body
 */
export function buildCodexResponsesRequest(options: {
  model: string;
  input: string;
  tools?: readonly { name: string; input: Record<string, unknown> }[];
  reasoning?: { effort: "low" | "medium" | "high" };
  maxTokens?: number;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: options.model,
    input: options.input,
  };

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools.map((t) => ({
      type: "function",
      name: t.name,
      parameters: t.input,
    }));
  }

  if (options.reasoning) {
    body.reasoning = options.reasoning;
  }

  if (options.maxTokens) {
    body.max_output_tokens = options.maxTokens;
  }

  return body;
}
