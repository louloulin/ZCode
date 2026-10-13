import { join } from "node:path";

import { DEV_HELPER_APP_NAME, HELPER_APP_NAME } from "@lumos/lumos-cua/broker/helperConstants";
import {
  isCuaLocalDevelopmentRuntime,
  resolveCuaHelperInstallRoot,
  resolveHelperAppName,
  standaloneHelperCandidatePaths,
} from "@lumos/lumos-cua/broker/server";

export function resolveStandaloneStatusLaunchCandidates(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const candidates = [...standaloneHelperCandidatePaths(env)];
  if (isCuaLocalDevelopmentRuntime(env)) {
    const installRoot = resolveCuaHelperInstallRoot(env);
    if (installRoot) {
      const fallbackName =
        resolveHelperAppName(env) === DEV_HELPER_APP_NAME ? HELPER_APP_NAME : DEV_HELPER_APP_NAME;
      candidates.push(join(installRoot, fallbackName));
    }
  }
  return candidates;
}
