import { createLocalServices, type LumosAgentCommandResolver } from "@lumos/services/node";
import type { IChannel } from "@lumos/rpc";
import {
  parseServiceAuthorityMode,
  LUMOS_REMOTE_HTTP_PROXY_ENV_KEY,
  LUMOS_REMOTE_NO_PROXY_ENV_KEY,
  LUMOS_REMOTE_RUNTIME_NETWORK_AUTHORITY_ENV_KEY,
} from "@lumos/shared";

export interface CreateStdioServicesOptions {
  topicResourceRelayChannel?: () => IChannel;
  env?: Record<string, string | undefined>;
  lumosBuiltinProviderConfigFilePath: string;
  lumosAgentCommandResolver?: LumosAgentCommandResolver;
}

export interface RemoteAgentNetworkOptions {
  httpProxy?: string;
  noProxy?: string;
}

export function resolveRemoteAgentNetworkFromEnv(
  env: Record<string, string | undefined>,
): RemoteAgentNetworkOptions | undefined {
  if (env[LUMOS_REMOTE_RUNTIME_NETWORK_AUTHORITY_ENV_KEY]?.trim() !== "1") {
    return undefined;
  }
  return {
    httpProxy: env[LUMOS_REMOTE_HTTP_PROXY_ENV_KEY]?.trim() || undefined,
    noProxy: env[LUMOS_REMOTE_NO_PROXY_ENV_KEY]?.trim() || undefined,
  };
}

export function createStdioServices(options: CreateStdioServicesOptions) {
  const env = options.env ?? process.env;
  const authorityModeParseResult = parseServiceAuthorityMode(env);
  const remoteAgentNetwork = resolveRemoteAgentNetworkFromEnv(env);
  // 远程 Desktop 的呈现能力必须从 stdio 入口收到的 authority mode 进入 Services 推导链。
  // 测试注入 resolver 只用于在 spawn 前观察最终命令，不改变生产默认 resolver。
  const services = createLocalServices({
    lumosBuiltinProviderConfigFilePath: options.lumosBuiltinProviderConfigFilePath,
    topicResourceRelayChannel: options.topicResourceRelayChannel,
    serviceAuthorityMode: authorityModeParseResult.mode,
    lumosAgentCommandResolver: options.lumosAgentCommandResolver,
    remoteAgentNetwork,
  });

  return {
    authorityModeParseResult,
    services,
  };
}
