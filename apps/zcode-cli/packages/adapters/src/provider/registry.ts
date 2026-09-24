/**
 * Unified Agent Provider Registry
 *
 * Provides a unified interface for managing multiple AI agent provider adapters.
 * Supports Pi Agent, Claude Code, OpenAI Codex, and MiniMax.
 *
 * Note: Pi Agent, Claude Code, and MiniMax use ACP (Agent Communication Protocol)
 * while OpenAI Codex uses MCP (Model Context Protocol).
 */

import type { Logger } from "@zcode/contracts";
import {
  createPiAgentAdapter,
  type PiAgentAdapter,
  type PiAgentConfig,
  type PiAgentAcpServerConfig,
  type PiAgentProviderCapabilities,
  type PiAgentSession,
  type PiAgentMessage,
} from "./pi-agent.js";
import {
  createClaudeCodeAdapter,
  type ClaudeCodeAdapter,
  type ClaudeCodeConfig,
  type ClaudeCodeAcpServerConfig,
  type ClaudeCodeProviderCapabilities,
  type ClaudeCodeSession,
  type ClaudeCodeMessage,
} from "./claude-code.js";
import {
  createOpenAICodexAdapter,
  type OpenAICodexAdapter,
  type OpenAICodexConfig,
  type OpenAICodexMcpServerConfig,
  type OpenAICodexProviderCapabilities,
  type OpenAICodexSession,
} from "./openai-codex.js";
import {
  createMiniMaxAdapter,
  type MiniMaxAdapter,
  type MiniMaxConfig,
  type MiniMaxAcpServerConfig,
  type MiniMaxProviderCapabilities,
  type MiniMaxSession,
  type MiniMaxMessage,
} from "./minimax.js";

/** Supported AI Agent provider types */
export type AgentProviderType = "pi-agent" | "claude-code" | "openai-codex" | "minimax";

/** Unified adapter interface across all providers */
export type AgentProviderAdapter = PiAgentAdapter | ClaudeCodeAdapter | OpenAICodexAdapter | MiniMaxAdapter;

/** Provider capabilities union */
export type AgentProviderCapabilities =
  | PiAgentProviderCapabilities
  | ClaudeCodeProviderCapabilities
  | OpenAICodexProviderCapabilities
  | MiniMaxProviderCapabilities;

/** Unified config for any agent provider */
export type AgentProviderConfig = PiAgentConfig | ClaudeCodeConfig | OpenAICodexConfig | MiniMaxConfig;

/** Session interface (provider-agnostic) */
export interface AgentSession {
  readonly providerId: string;
  readonly sessionId: string;
  readonly createdAt: Date;
  readonly workspaceRef?: string;
}

/** Event emitted by the registry */
export type AgentRegistryEvent =
  | { type: "provider_connected"; providerId: string }
  | { type: "provider_disconnected"; providerId: string }
  | { type: "provider_error"; providerId: string; error: Error }
  | { type: "session_created"; providerId: string; session: AgentSession }
  | { type: "session_closed"; providerId: string; sessionId: string }
  | { type: "acp_session_message"; providerId: string; sessionId: string; message: unknown }
  | { type: "acp_session_tool_call"; providerId: string; sessionId: string; toolCall: unknown };

/** Options for creating the registry */
export interface CreateAgentProviderRegistryOptions {
  readonly logger?: Logger;
  readonly autoConnect?: boolean;
  readonly defaultProvider?: AgentProviderType;
}

/**
 * Unified registry for all AI agent providers
 */
export class AgentProviderRegistry {
  private readonly adapters = new Map<AgentProviderType, AgentProviderAdapter>();
  private readonly eventListeners = new Set<(event: AgentRegistryEvent) => void>();
  private readonly logger?: Logger;
  private readonly autoConnect: boolean;
  private readonly defaultProvider?: AgentProviderType;

  constructor(options: CreateAgentProviderRegistryOptions = {}) {
    this.logger = options.logger;
    this.autoConnect = options.autoConnect ?? false;
    this.defaultProvider = options.defaultProvider;
  }

  /**
   * Get an adapter by provider type
   */
  getAdapter(type: AgentProviderType): AgentProviderAdapter | undefined {
    return this.adapters.get(type);
  }

  /**
   * Get all registered provider types
   */
  getRegisteredProviders(): AgentProviderType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): AgentProviderType | undefined {
    return this.defaultProvider;
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(type: AgentProviderType): void {
    if (!this.adapters.has(type)) {
      throw new Error(`Provider ${type} is not registered`);
    }
    // SAFETY: We need to bypass the private modifier to set defaultProvider.
    // This is safe because we're only setting, not exposing, the internal field.
    (this as unknown as { defaultProvider: AgentProviderType }).defaultProvider = type;
    this.logger?.debug(`Default provider set to: ${type}`);
  }

  /**
   * Register a provider adapter
   */
  register(type: AgentProviderType, adapter?: AgentProviderAdapter): AgentProviderAdapter {
    if (adapter) {
      this.adapters.set(type, adapter);
      this.logger?.debug(`Provider adapter registered: ${type}`);
      return adapter;
    }

    // Auto-create adapter based on type
    switch (type) {
      case "pi-agent":
        return this.registerPiAgent();
      case "claude-code":
        return this.registerClaudeCode();
      case "openai-codex":
        return this.registerOpenAICodex();
      case "minimax":
        return this.registerMiniMax();
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Register Pi Agent provider
   */
  private registerPiAgent(): PiAgentAdapter {
    const adapter = createPiAgentAdapter({ logger: this.logger });
    this.adapters.set("pi-agent", adapter);
    this.logger?.info(`Pi Agent provider registered`);
    return adapter;
  }

  /**
   * Register Claude Code provider
   */
  private registerClaudeCode(): ClaudeCodeAdapter {
    const adapter = createClaudeCodeAdapter({ logger: this.logger });
    this.adapters.set("claude-code", adapter);
    this.logger?.info(`Claude Code provider registered`);
    return adapter;
  }

  /**
   * Register OpenAI Codex provider
   */
  private registerOpenAICodex(): OpenAICodexAdapter {
    const adapter = createOpenAICodexAdapter({ logger: this.logger });
    this.adapters.set("openai-codex", adapter);
    this.logger?.info(`OpenAI Codex provider registered`);
    return adapter;
  }

  /**
   * Register MiniMax provider
   */
  private registerMiniMax(): MiniMaxAdapter {
    const adapter = createMiniMaxAdapter({ logger: this.logger });
    this.adapters.set("minimax", adapter);
    this.logger?.info(`MiniMax provider registered`);
    return adapter;
  }

  /**
   * Connect a provider with configuration
   */
  async connect(type: AgentProviderType, config: AgentProviderConfig): Promise<void> {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Provider ${type} is not registered. Call register() first.`);
    }

    try {
      await adapter.connect(config as Parameters<typeof adapter.connect>[0]);
      this.emit({ type: "provider_connected", providerId: type });
      this.logger?.info(`Provider ${type} connected successfully`);
    } catch (error) {
      this.emit({
        type: "provider_error",
        providerId: type,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Disconnect a provider
   */
  async disconnect(type: AgentProviderType): Promise<void> {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      this.logger?.warn(`Provider ${type} is not registered`);
      return;
    }

    await adapter.disconnect();
    this.emit({ type: "provider_disconnected", providerId: type });
    this.logger?.info(`Provider ${type} disconnected`);
  }

  /**
   * Check if a provider is connected
   */
  isConnected(type: AgentProviderType): boolean {
    const adapter = this.adapters.get(type);
    return adapter?.isConnected() ?? false;
  }

  /**
   * Get capabilities of a provider
   */
  getCapabilities(type: AgentProviderType): AgentProviderCapabilities | undefined {
    const adapter = this.adapters.get(type);
    return adapter?.capabilities;
  }

  /**
   * Get all connected providers
   */
  getConnectedProviders(): AgentProviderType[] {
    return this.getRegisteredProviders().filter((type) => this.isConnected(type));
  }

  /**
   * Connect all registered providers
   */
  async connectAll(configs: Partial<Record<AgentProviderType, AgentProviderConfig>>): Promise<void> {
    const connectPromises: Promise<void>[] = [];
    for (const [type, adapter] of this.adapters.entries()) {
      const config = configs[type];
      if (config) {
        connectPromises.push(
          adapter.connect(config as Parameters<typeof adapter.connect>[0]).then(() => {
            this.emit({ type: "provider_connected", providerId: type });
          }),
        );
      }
    }
    await Promise.allSettled(connectPromises);
  }

  /**
   * Disconnect all providers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.adapters.keys()).map((type) =>
      this.disconnect(type),
    );
    await Promise.allSettled(disconnectPromises);
  }

  /**
   * Create a new ACP session for Pi Agent, Claude Code, or MiniMax
   */
  createAcpSession(type: "pi-agent" | "claude-code" | "minimax", workspaceId?: string): AgentSession {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Provider ${type} is not registered`);
    }

    let session: PiAgentSession | ClaudeCodeSession | MiniMaxSession;

    switch (type) {
      case "pi-agent":
        session = (adapter as PiAgentAdapter).createAcpSession(workspaceId);
        break;
      case "claude-code":
        session = (adapter as ClaudeCodeAdapter).createAcpSession(workspaceId);
        break;
      case "minimax":
        session = (adapter as MiniMaxAdapter).createAcpSession(workspaceId);
        break;
      default:
        throw new Error(`Provider ${type} does not support ACP`);
    }

    const agentSession: AgentSession = {
      providerId: type,
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      workspaceRef: "workspaceRef" in session ? session.workspaceRef : undefined,
    };

    this.emit({ type: "session_created", providerId: type, session: agentSession });
    return agentSession;
  }

  /**
   * Create a new session for OpenAI Codex (MCP-based)
   */
  createMcpSession(type: "openai-codex", workspaceId?: string): AgentSession {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Provider ${type} is not registered`);
    }

    const session = (adapter as OpenAICodexAdapter).sessionManager.createSession(workspaceId);

    const agentSession: AgentSession = {
      providerId: type,
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      workspaceRef: "workspaceRef" in session ? session.workspaceRef : undefined,
    };

    this.emit({ type: "session_created", providerId: type, session: agentSession });
    return agentSession;
  }

  /**
   * Create a new session for any provider (auto-detect ACP vs MCP)
   */
  createSession(type: AgentProviderType, workspaceId?: string): AgentSession {
    if (type === "openai-codex") {
      return this.createMcpSession(type, workspaceId);
    }
    if (type === "minimax" || type === "pi-agent" || type === "claude-code") {
      return this.createAcpSession(type, workspaceId);
    }
    throw new Error(`Unknown provider type: ${type}`);
  }

  /**
   * Send an ACP message to Pi Agent, Claude Code, or MiniMax
   */
  async sendAcpMessage(
    type: "pi-agent" | "claude-code" | "minimax",
    sessionId: string,
    content: string,
  ): Promise<PiAgentMessage | ClaudeCodeMessage | MiniMaxMessage> {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Provider ${type} is not registered`);
    }

    switch (type) {
      case "pi-agent":
        return (adapter as PiAgentAdapter).sendAcpMessage(sessionId, content);
      case "claude-code":
        return (adapter as ClaudeCodeAdapter).sendAcpMessage(sessionId, content);
      case "minimax":
        return (adapter as MiniMaxAdapter).sendAcpMessage(sessionId, content);
      default:
        throw new Error(`Provider ${type} does not support ACP`);
    }
  }

  /**
   * Connect an MCP server for OpenAI Codex
   */
  async connectMcpServer(
    type: "openai-codex",
    serverName: string,
    config: OpenAICodexMcpServerConfig,
  ): Promise<void> {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Provider ${type} is not registered`);
    }

    await (adapter as OpenAICodexAdapter).connectMcpServer(serverName, config);
    this.emit({ type: "acp_session_message", providerId: type, sessionId: serverName, message: { connected: true } });
  }

  /**
   * Disconnect an MCP server for OpenAI Codex
   */
  async disconnectMcpServer(type: "openai-codex", serverName: string): Promise<void> {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Provider ${type} is not registered`);
    }

    await (adapter as OpenAICodexAdapter).disconnectMcpServer(serverName);
    this.emit({ type: "acp_session_message", providerId: type, sessionId: serverName, message: { disconnected: true } });
  }

  /**
   * Add an event listener
   */
  addEventListener(listener: (event: AgentRegistryEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emit(event: AgentRegistryEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger?.error(`Event listener error: ${error}`);
      }
    }
  }

  /**
   * Dispose the registry
   */
  async dispose(): Promise<void> {
    await this.disconnectAll();
    this.adapters.clear();
    this.eventListeners.clear();
    this.logger?.debug("Agent provider registry disposed");
  }
}

/**
 * Create a new agent provider registry
 */
export function createAgentProviderRegistry(
  options?: CreateAgentProviderRegistryOptions,
): AgentProviderRegistry {
  return new AgentProviderRegistry(options);
}

/**
 * Built-in provider metadata
 */
export const BUILTIN_PROVIDER_METADATA: Record<
  AgentProviderType,
  {
    name: string;
    description: string;
    icon: string;
    website: string;
    protocol: "ACP" | "MCP";
  }
> = {
  "pi-agent": {
    name: "Pi Agent",
    description: "Zhipu AI's coding assistant via ACP (Agent Communication Protocol)",
    icon: "pi",
    website: "https://pi.ai",
    protocol: "ACP",
  },
  "claude-code": {
    name: "Claude Code",
    description: "Anthropic's official AI coding CLI via ACP",
    icon: "claude",
    website: "https://claude.ai/code",
    protocol: "ACP",
  },
  "openai-codex": {
    name: "OpenAI Codex",
    description: "OpenAI's code-specialized models via MCP (Model Context Protocol)",
    icon: "openai",
    website: "https://platform.openai.com/docs/guides/code-execution",
    protocol: "MCP",
  },
  "minimax": {
    name: "MiniMax",
    description: "MiniMax AI's coding assistant via ACP",
    icon: "minimax",
    website: "https://platform.minimaxi.com",
    protocol: "ACP",
  },
};

/**
 * Resolve provider type from model ID
 */
export function resolveProviderFromModel(modelId: string): AgentProviderType | undefined {
  const lower = modelId.toLowerCase();

  if (lower.startsWith("pi-")) {
    return "pi-agent";
  }
  if (lower.startsWith("claude-")) {
    return "claude-code";
  }
  if (
    lower.startsWith("gpt-4o") ||
    lower.startsWith("gpt-4") ||
    lower.startsWith("gpt-5") ||
    lower.startsWith("o1") ||
    lower.startsWith("o3") ||
    lower.startsWith("o4") ||
    lower.includes("codex")
  ) {
    return "openai-codex";
  }
  if (lower.startsWith("minimax-")) {
    return "minimax";
  }

  return undefined;
}

/**
 * Create a new provider instance (factory function)
 */
export function createAgentProvider(
  type: AgentProviderType,
  options?: { logger?: Logger },
): AgentProviderAdapter {
  switch (type) {
    case "pi-agent":
      return createPiAgentAdapter(options);
    case "claude-code":
      return createClaudeCodeAdapter(options);
    case "openai-codex":
      return createOpenAICodexAdapter(options);
    case "minimax":
      return createMiniMaxAdapter(options);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
