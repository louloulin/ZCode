export const LUMOS_BUILTIN_PROVIDER_CONFIG_FILE_ENV = "LUMOS_BUILTIN_PROVIDER_CONFIG_FILE";
export const LUMOS_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE_ENV =
  "LUMOS_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE";
export const LUMOS_PERSONAL_PROVIDER_CONFIG_FILE_ENV = "LUMOS_PERSONAL_PROVIDER_CONFIG_FILE";
export const PERSONAL_PROVIDER_CONFIG_FILE_NAME = "provider_config.json";

export interface NodeProviderRuntimePaths {
  readonly lumosBuiltinFilePath: string;
  readonly personalFilePath: string;
}

export function createNodeProviderRuntimePathEnv(
  paths: NodeProviderRuntimePaths,
): Record<string, string> {
  return {
    [LUMOS_BUILTIN_PROVIDER_CONFIG_FILE_ENV]: paths.lumosBuiltinFilePath,
    [LUMOS_PERSONAL_PROVIDER_CONFIG_FILE_ENV]: paths.personalFilePath,
  };
}

export function resolveNodeProviderRuntimePaths(
  env: Readonly<Record<string, string | undefined>>,
): NodeProviderRuntimePaths | null {
  const lumosBuiltinFilePath = env[LUMOS_BUILTIN_PROVIDER_CONFIG_FILE_ENV]?.trim();
  const personalFilePath = env[LUMOS_PERSONAL_PROVIDER_CONFIG_FILE_ENV]?.trim();
  if (!lumosBuiltinFilePath && !personalFilePath) return null;
  if (!lumosBuiltinFilePath || !personalFilePath) {
    throw new Error("Lumos Built-in 与 Personal Provider Config 路径必须同时提供");
  }
  return Object.freeze({ lumosBuiltinFilePath, personalFilePath });
}
