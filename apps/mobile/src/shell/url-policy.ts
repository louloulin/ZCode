/**
 * Remote-control URL policy — shared by Android and iOS.
 *
 * Ported 1:1 from packages/android/app/src/main/java/com/example/lumos_mobile/remote/RemoteControlUrlPolicy.kt
 * so the two platforms cannot drift. Behaviour that must stay identical:
 *
 *   - production builds may ONLY open https://<prodHost><remotePathPrefix>...
 *   - debug builds additionally allow localhost / LAN / *.local for on-device
 *     debugging of a local Vite dev server
 *   - everything else returns null, so the shell never degrades into a
 *     general-purpose browser
 */

declare const __LUMOS_DEBUG__: boolean;
declare const __LUMOS_DEFAULT_REMOTE_URL__: string;

const REMOTE_SCHEME = "lumos";
const REMOTE_HOST = "remote";

const PROD_SCHEME = "https";
const PROD_HOST = "lumosai.cc";
const REMOTE_PATH_PREFIX = "/remote";

export interface UrlPolicyOptions {
  /** Defaults to the build-time constant (https://lumosai.cc/remote). */
  defaultRemoteUrl?: string;
  /** Defaults to the build-time flag; production builds keep this false. */
  debug?: boolean;
}

function prodHost(): string {
  // Derived from the default remote URL so a self-hosted build only has to
  // change one constant.
  try {
    return new URL(declaredDefaultRemoteUrl()).host.toLowerCase();
  } catch {
    return PROD_HOST;
  }
}

function declaredDefaultRemoteUrl(): string {
  return typeof __LUMOS_DEFAULT_REMOTE_URL__ === "string"
    ? __LUMOS_DEFAULT_REMOTE_URL__
    : "https://lumosai.cc/remote";
}

function isDebugBuild(options?: UrlPolicyOptions): boolean {
  if (options?.debug !== undefined) {
    return options.debug;
  }
  return typeof __LUMOS_DEBUG__ === "boolean" ? __LUMOS_DEBUG__ : false;
}

/**
 * Turn an arbitrary launch payload (deep link, QR scan, pasted text) into the
 * URL the shell is allowed to load, or null when it must be refused.
 *
 * `lumos://remote?...` carries only query/fragment; the origin always comes
 * from the configured default remote URL.
 */
export function resolveRemoteUrl(
  raw: string | null | undefined,
  options?: UrlPolicyOptions,
): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return null;
  }

  let uri: URL;
  try {
    uri = new URL(trimmed);
  } catch {
    return null;
  }

  const defaultUrl = options?.defaultRemoteUrl ?? declaredDefaultRemoteUrl();

  if (uri.protocol === `${REMOTE_SCHEME}:` && uri.host === REMOTE_HOST) {
    try {
      const base = new URL(defaultUrl);
      if (uri.search) {
        base.search = uri.search;
      }
      if (uri.hash) {
        base.hash = uri.hash;
      }
      return base.toString();
    } catch {
      return null;
    }
  }

  return checkAllowed(uri, options) ? uri.toString() : null;
}

export function isAllowedRemoteUrl(
  raw: string | null | undefined,
  options?: UrlPolicyOptions,
): boolean {
  try {
    return checkAllowed(new URL((raw ?? "").trim()), options);
  } catch {
    return false;
  }
}

function checkAllowed(uri: URL, options?: UrlPolicyOptions): boolean {
  const scheme = uri.protocol.replace(/:$/, "").toLowerCase();
  const host = uri.hostname.toLowerCase();
  const path = uri.pathname;

  if (scheme === PROD_SCHEME && host === prodHost() && path.startsWith(REMOTE_PATH_PREFIX)) {
    return true;
  }

  if (!isDebugBuild(options)) {
    return false;
  }

  // DEBUG only: 开发机真机调试时二维码会指向局域网 Vite 地址。
  // 生产包仍只允许正式域，避免远控壳变成任意浏览器。
  if (!path.startsWith(REMOTE_PATH_PREFIX)) {
    return false;
  }
  if (host === prodHost()) {
    return scheme === "https";
  }
  return (scheme === "http" || scheme === "https") && isDebugHost(host);
}

function isDebugHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1" || host === "10.0.2.2") {
    return true;
  }
  if (host.endsWith(".local")) {
    return true;
  }
  if (host.startsWith("192.168.") || host.startsWith("10.")) {
    return true;
  }
  return /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

/** Exposed for the shell's "we refused this link" messaging. */
export function defaultRemoteUrl(options?: UrlPolicyOptions): string {
  return options?.defaultRemoteUrl ?? declaredDefaultRemoteUrl();
}
