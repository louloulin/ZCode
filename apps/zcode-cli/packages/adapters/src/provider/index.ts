/**
 * Provider adapters - AI Agent integrations for ZCode
 *
 * This module exports adapters for connecting ZCode to various AI coding agents:
 * - Pi Agent (pi.ai): Zhipu AI's coding assistant
 * - Claude Code (claude.ai/code): Anthropic's coding CLI
 * - OpenAI Codex: OpenAI's code-specialized models
 */

// Pi Agent adapter
export {
  createPiAgentAdapter,
  createPiAgentMcpServerConfig,
  mapZCodeToolToPiAgent,
  mapPiAgentResultToZCode,
  PI_AGENT_PROVIDER_ID,
  PI_AGENT_DEFAULT_CAPABILITIES,
  type PiAgentConfig,
  type PiAgentSession,
  type PiAgentMessage,
  type PiAgentToolCall,
  type PiAgentToolResult,
  type PiAgentMcpServerConfig,
  type PiAgentProviderCapabilities,
  type CreatePiAgentAdapterOptions,
  type PiAgentAdapter,
  type PiAgentError,
} from "./pi-agent.js";

// Claude Code adapter
export {
  createClaudeCodeAdapter,
  createClaudeCodeMcpServerConfig,
  mapZCodeToolToClaudeCode,
  mapClaudeCodeResultToZCode,
  normalizeClaudeCodeMessage,
  CLAUDE_CODE_PROVIDER_ID,
  CLAUDE_CODE_DEFAULT_CAPABILITIES,
  type ClaudeCodeConfig,
  type ClaudeCodeSession,
  type ClaudeCodeMessage,
  type ClaudeCodeToolCall,
  type ClaudeCodeToolResult,
  type ClaudeCodeMcpServerConfig,
  type ClaudeCodeProviderCapabilities,
  type CreateClaudeCodeAdapterOptions,
  type ClaudeCodeAdapter,
  type ClaudeCodeError,
  type ClaudeCodeContentBlock,
} from "./claude-code.js";

// OpenAI Codex adapter
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
  type AgentProvider,
  type AgentProviderConfig,
  type AgentSession,
  createAgentProviderRegistry,
} from "./registry.js";
