import { DEFAULT_LUMOS_ENDPOINT_ORIGIN } from "./lumosEndpoint.js";

export const LUMOS_SOURCE_HEADERS = {
  "User-Agent": "Lumos/unknown",
  "HTTP-Referer": DEFAULT_LUMOS_ENDPOINT_ORIGIN,
  "X-Title": "Z Code@electron",
} as const;

export interface BuildLumosSourceHeadersFromContextOptions {
  appVersion?: string;
  arch?: string;
  clientLanguage?: string;
  clientTimezone?: string;
  deviceMid?: string;
  endpointOrigin?: string;
  osVersion?: string;
  platform?: string;
  releaseChannel?: string;
  sourceTitle?: string;
}

export function normalizeLumosSourceHeaderValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^[\x20-\x7e]+$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function buildLumosSourceHeadersFromContext(
  options: BuildLumosSourceHeadersFromContextOptions = {},
): Record<string, string> {
  const appVersion = normalizeLumosSourceHeaderValue(options.appVersion);
  const arch = normalizeLumosSourceHeaderValue(options.arch);
  const clientLanguage = normalizeLumosSourceHeaderValue(options.clientLanguage) ?? "unknown";
  const clientTimezone = normalizeLumosSourceHeaderValue(options.clientTimezone) ?? "unknown";
  const deviceMid = normalizeLumosSourceHeaderValue(options.deviceMid);
  const endpointOrigin =
    normalizeLumosSourceHeaderValue(options.endpointOrigin) ?? DEFAULT_LUMOS_ENDPOINT_ORIGIN;
  const osVersion = normalizeLumosSourceHeaderValue(options.osVersion);
  const platform = normalizeLumosSourceHeaderValue(options.platform);
  const releaseChannel = normalizeLumosSourceHeaderValue(options.releaseChannel);
  const sourceTitle = normalizeLumosSourceHeaderValue(options.sourceTitle) ?? "electron";

  return {
    ...LUMOS_SOURCE_HEADERS,
    "HTTP-Referer": endpointOrigin,
    "User-Agent": `Lumos/${appVersion ?? "unknown"}`,
    ...(appVersion ? { "X-Lumos-App-Version": appVersion } : {}),
    "X-Title": `Z Code@${sourceTitle}`,
    ...(platform && arch ? { "X-Platform": `${platform}-${arch}` } : {}),
    ...(releaseChannel ? { "X-Release-Channel": releaseChannel } : {}),
    "X-Client-Language": clientLanguage,
    "X-Client-Timezone": clientTimezone,
    ...(platform ? { "X-Os-Category": normalizeOsCategory(platform) } : {}),
    ...(osVersion ? { "X-Os-Version": osVersion } : {}),
    ...(deviceMid ? { "X-Device-Mid": deviceMid } : {}),
  };
}

function normalizeOsCategory(platform: string): string {
  switch (platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    default:
      return "linux";
  }
}
