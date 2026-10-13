import { buildRuntimeLumosApiUrl, resolveZaiBusinessBaseUrl } from "@lumos/shared";

export const LUMOS_CLIENT_SCENES_URL = buildRuntimeLumosApiUrl(
  process.env,
  "/api/v1/client/scenes",
);

export const ZAI_API_HOST = resolveZaiBusinessBaseUrl(process.env);
