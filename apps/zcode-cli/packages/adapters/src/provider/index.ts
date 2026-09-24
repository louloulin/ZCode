/**
 * Provider adapters - AI Agent integrations for ZCode
 *
 * This module exports adapters for connecting ZCode to various AI coding agents:
 * - Pi Agent (pi.ai): Zhipu AI's coding assistant (ACP-based)
 * - Claude Code (claude.ai/code): Anthropic's coding CLI (ACP-based)
 * - OpenAI Codex: OpenAI's code-specialized models (MCP-based)
 * - MiniMax: MiniMax AI's coding assistant (ACP-based)
 *
 * Note: Pi Agent, Claude Code, and MiniMax use ACP (Agent Communication Protocol) via HTTP,
 * while OpenAI Codex uses MCP for tool integration.
 */

// MiniMax adapter (ACP-based)
export {
  createMiniMaxAdapter,
  createMiniMaxAcpServerConfig,
  mapZCodeToolToMiniMax,
  mapMiniMaxResultToZCode,
  MINIMAX_PROVIDER_ID,
  MINIMAX_DEFAULT_CAPABILITIES,
  MINIMAX_TOOLS,
  type MiniMaxConfig,
  type MiniMaxSession,
  type MiniMaxMessage,
  type MiniMaxToolCall,
  type MiniMaxToolResult,
  type MiniMaxAcpServerConfig,
  type MiniMaxProviderCapabilities,
  type CreateMiniMaxAdapterOptions,
  type MiniMaxAdapter,
  type MiniMaxError,
  type MiniMaxWorkspaceRef,
  type MiniMaxToolDescriptor,
} from "./minimax.js";

// Pi Agent adapter (ACP-based)
export {
  createPiAgentAdapter,
  createPiAgentAcpServerConfig,
  mapZCodeToolToPiAgent,
  mapPiAgentResultToZCode,
  PI_AGENT_PROVIDER_ID,
  PI_AGENT_DEFAULT_CAPABILITIES,
  PI_AGENT_TOOLS,
  type PiAgentConfig,
  type PiAgentSession,
  type PiAgentMessage,
  type PiAgentToolCall,
  type PiAgentToolResult,
  type PiAgentAcpServerConfig,
  type PiAgentProviderCapabilities,
  type CreatePiAgentAdapterOptions,
  type PiAgentAdapter,
  type PiAgentError,
  type PiAgentWorkspaceRef,
  type PiAgentToolDescriptor,
} from "./pi-agent.js";

// Claude Code adapter (ACP-based)
export {
  createClaudeCodeAdapter,
  createClaudeCodeAcpServerConfig,
  mapZCodeToolToClaudeCode,
  mapClaudeCodeResultToZCode,
  normalizeClaudeCodeMessage,
  CLAUDE_CODE_PROVIDER_ID,
  CLAUDE_CODE_DEFAULT_CAPABILITIES,
  CLAUDE_CODE_TOOLS,
  type ClaudeCodeConfig,
  type ClaudeCodeSession,
  type ClaudeCodeMessage,
  type ClaudeCodeToolCall,
  type ClaudeCodeToolResult,
  type ClaudeCodeAcpServerConfig,
  type ClaudeCodeProviderCapabilities,
  type CreateClaudeCodeAdapterOptions,
  type ClaudeCodeAdapter,
  type ClaudeCodeError,
  type ClaudeCodeContentBlock,
  type ClaudeCodeWorkspaceRef,
  type ClaudeCodeToolDescriptor,
} from "./claude-code.js";

// OpenAI Codex adapter (MCP-based)
export {
  createOpenAICodexAdapter,
  createOpenAICodexMcpServerConfig,
  mapZCodeToolToOpenAICodex,
  mapOpenAICodexResultToZCode,
  buildCodexResponsesRequest,
  OPENAI_CODEX_PROVIDER_ID,
  OPENAI_CODEX_DEFAULT_CAPABILITIES,
  type OpenAICodexConfig,
  type OpenAICodexSession,
  type OpenAICodexMessage,
  type OpenAICodexToolCall,
  type OpenAICodexToolResult,
  type OpenAICodexMcpServerConfig,
  type OpenAICodexProviderCapabilities,
  type CreateOpenAICodexAdapterOptions,
  type OpenAICodexAdapter,
  type OpenAICodexError,
} from "./openai-codex.js";

// Unified provider registry
export {
  type AgentProviderType,
  type AgentProviderAdapter,
  type AgentProviderCapabilities,
  type AgentProviderConfig,
  type AgentSession,
  type AgentRegistryEvent,
  type CreateAgentProviderRegistryOptions,
  AgentProviderRegistry,
  createAgentProviderRegistry,
  BUILTIN_PROVIDER_METADATA,
  resolveProviderFromModel,
  createAgentProvider,
} from "./registry.js";
