import {
  lumosProtocolMethods,
  lumosPluginsReferenceCatalogResultSchema,
  type LumosPluginsReferenceCatalogParams,
} from "@lumos/shared";
import type { LumosProtocolClient } from "#src/lumos-agent/lumosProtocolClient.js";

/** 旧协议严格校验响应；新展示字段走独立入口，只有 -32601 能证明旧 Agent 不支持。 */
export async function requestPluginReferenceCatalog(
  client: Pick<LumosProtocolClient, "request">,
  params: LumosPluginsReferenceCatalogParams,
) {
  try {
    return await client.request(
      lumosProtocolMethods.pluginsReferenceCatalogWithCategory,
      params,
      lumosPluginsReferenceCatalogResultSchema,
    );
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === -32601))
      throw error;
    return client.request(
      lumosProtocolMethods.pluginsReferenceCatalog,
      params,
      lumosPluginsReferenceCatalogResultSchema,
    );
  }
}
