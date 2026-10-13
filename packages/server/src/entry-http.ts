import { createLocalServices, createTopicResourcePeers, getAppConfigDir } from "@lumos/services/node";
import {
  materializeBundledLumosBuiltinProviderConfig,
  readBundledLumosBuiltinProviderConfig,
} from "./bundledLumosBuiltinProviderConfig.js";
import { createHttpServer } from "./http.js";

async function main(): Promise<void> {
  const lumosBuiltinProviderConfigFilePath = await materializeBundledLumosBuiltinProviderConfig({
    environmentConfigRoot: getAppConfigDir(),
    content: readBundledLumosBuiltinProviderConfig(),
  });
  const port = Number(process.env["PORT"]) || 3030;
  const host = process.env["LUMOS_SERVER_HOST"]?.trim() || process.env["HOST"]?.trim() || undefined;
  const staticRoot = process.env["LUMOS_WEB_STATIC_ROOT"]?.trim() || undefined;
  const authToken = process.env["LUMOS_SERVER_AUTH_TOKEN"]?.trim() || undefined;
  const topicResourcePeers = createTopicResourcePeers();
  const services = createLocalServices({
    topicResourceRelayChannel: (request) => topicResourcePeers.getChannel(request),
    lumosBuiltinProviderConfigFilePath,
    providerProvisioningTargetEnabled: Boolean(authToken),
  });

  createHttpServer(services, port, {
    topicResourcePeers,
    ...(host ? { host } : {}),
    ...(staticRoot ? { staticRoot, spaFallback: true } : {}),
    ...(authToken ? { authToken, authRequired: true } : {}),
  });
}

void main().catch((error: unknown) => {
  console.error("[lumos-server:http] startup failed", error);
  process.exitCode = 1;
});
