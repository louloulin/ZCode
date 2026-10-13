import {
  LUMOS_AGENT_PROVIDER,
  LUMOS_AGENT_PROVIDER_LABEL,
  type LumosProvider,
} from "@lumos/shared";

export const LUMOS_AGENT_PROVIDERS: LumosProvider[] = [LUMOS_AGENT_PROVIDER];

export const LUMOS_AGENT_PROVIDER_LABELS: Record<LumosProvider, string> = {
  glm: LUMOS_AGENT_PROVIDER_LABEL,
};

export function supportsLumosSessionFork(provider: LumosProvider): boolean {
  void provider;
  // 功能开关：fork 入口恢复对所有 Lumos provider 开放；实际可操作性仍由 task 状态、
  // assistant 目标和运行中保护 guard 控制，避免把 active/failed 分支暴露为可 fork。
  return true;
}

export function shouldHideLumosSessionForkAction(provider: LumosProvider): boolean {
  return !supportsLumosSessionFork(provider);
}
