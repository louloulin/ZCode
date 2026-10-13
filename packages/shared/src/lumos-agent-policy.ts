import { z } from "zod";
import type { CommandAgentSource } from "./command-types.js";
import type { LumosProvider } from "./lumos-task-types-core.js";

export const LUMOS_AGENT_PROVIDER = "glm" satisfies LumosProvider;
export const LUMOS_AGENT_PROVIDER_LABEL = "Lumos Agent";
export const LUMOS_COMMAND_AGENT_SOURCE = "lumosAgent" satisfies CommandAgentSource;

/**
 * 解析持久化/relay 数据时的 provider 归一 schema：
 * 已移除的第三方 provider 历史值仅作为归一化输入保留，统一收敛为 glm；
 * 其它非法值保持拒绝，与收窄前的校验边界一致。
 */
export const legacyLumosProviderSchema = z
  .enum(["claude", "opencode", "gemini", "codex", "glm"])
  .transform((): typeof LUMOS_AGENT_PROVIDER => LUMOS_AGENT_PROVIDER);

export const LUMOS_ENABLED_AGENT_PROVIDERS = [
  LUMOS_AGENT_PROVIDER,
] as const satisfies readonly LumosProvider[];

export const LUMOS_COMMAND_AGENT_SOURCES = [
  LUMOS_COMMAND_AGENT_SOURCE,
] as const satisfies readonly CommandAgentSource[];

export function normalizeAgentProviderToLumosAgent(
  _provider?: LumosProvider | null,
): LumosProvider {
  return LUMOS_AGENT_PROVIDER;
}

export function normalizeAgentProvidersToLumosAgent(
  _providers?: ReadonlyArray<LumosProvider> | null,
): LumosProvider[] {
  return [...LUMOS_ENABLED_AGENT_PROVIDERS];
}

export function normalizeCommandAgentSourceToLumosAgent(
  _agentSource?: CommandAgentSource | null,
): CommandAgentSource {
  return LUMOS_COMMAND_AGENT_SOURCE;
}

export function isLumosAgentProvider(
  provider: LumosProvider | null | undefined,
): provider is typeof LUMOS_AGENT_PROVIDER {
  return provider === LUMOS_AGENT_PROVIDER;
}
