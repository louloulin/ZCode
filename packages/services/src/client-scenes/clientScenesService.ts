import type { ApiClient } from "@lumos/shared";
import { readApiJson } from "../providers/api/apiJson.js";
import { LUMOS_CLIENT_SCENES_URL } from "../providers/api/apiEndpoints.js";
import type { ClientScenesResponse, IClientScenesService } from "./clientScenes.js";

export function createClientScenesService(dependencies: {
  apiClient: ApiClient;
}): IClientScenesService {
  return {
    list: () =>
      readApiJson<ClientScenesResponse>(dependencies.apiClient, LUMOS_CLIENT_SCENES_URL, {
        method: "GET",
      }),
  };
}
