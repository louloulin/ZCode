import {
  buildRuntimeLumosEndpointUrls,
  LUMOS_ENV,
  type RuntimeLumosEndpointEnv,
} from "@lumos/shared";

interface RendererImportMetaEnv {
  VITE_LUMOS_BASE_URL?: string;
  VITE_LUMOS_ENDPOINT_ORIGIN?: string;
}

function readRendererImportMetaEnv(): RendererImportMetaEnv {
  return ((import.meta as ImportMeta & { env?: RendererImportMetaEnv }).env ??
    {}) as RendererImportMetaEnv;
}

export function createRendererLumosEndpointEnv(
  env: RendererImportMetaEnv = readRendererImportMetaEnv(),
): RuntimeLumosEndpointEnv {
  return {
    LUMOS_ENV,
    // UI 侧的 lumos-plan 占位 provider 以前只看 LUMOS_ENV，
    // 没有消费 Vite 注入的 base url，导致自定义测试域名时 renderer 和 host/service 可能不一致。
    LUMOS_BASE_URL: env.VITE_LUMOS_BASE_URL,
    LUMOS_ENDPOINT_ORIGIN: env.VITE_LUMOS_ENDPOINT_ORIGIN,
  };
}

export const RENDERER_LUMOS_ENDPOINT_URLS = buildRuntimeLumosEndpointUrls(
  createRendererLumosEndpointEnv(),
);
