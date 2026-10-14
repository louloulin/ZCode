/**
 * Lumos mobile shell — the single hand-written native-facing layer shared by the
 * Android and iOS builds.
 *
 * Responsibilities (identical to the existing Kotlin shell, but written once):
 *   1. accept a launch payload from a deep link / QR scan / paste
 *   2. validate it through the shared URL policy
 *   3. hand over to the EXISTING /remote web client (no UI is reimplemented here)
 *   4. remember recent links and keep the screen awake while attached
 */
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";

import {
  clearRecentLinks,
  describeForDisplay,
  readRecentLinks,
  recordRecentLink,
  type RecentLink,
} from "./recent-links.js";
import { defaultRemoteUrl, resolveRemoteUrl } from "./url-policy.js";

declare const __LUMOS_DEBUG__: boolean;

const DEBUG = typeof __LUMOS_DEBUG__ === "boolean" ? __LUMOS_DEBUG__ : false;

let wakeLock: WakeLockSentinel | null = null;

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`[lumos-shell] missing element #${id}`);
  }
  return found as T;
}

function setStatus(message: string, kind: "info" | "error" = "info"): void {
  const status = el<HTMLParagraphElement>("status");
  status.textContent = message;
  status.dataset["kind"] = kind;
}

/**
 * Validate and hand off to the existing web client.
 * Returns false when the link is refused by the policy.
 */
export async function openRemote(raw: string | null | undefined): Promise<boolean> {
  const url = resolveRemoteUrl(raw);
  if (!url) {
    setStatus(
      DEBUG
        ? "链接被拒绝：只允许正式域 /remote，或（调试包）本机与局域网 /remote"
        : `链接被拒绝：只允许 ${defaultRemoteUrl()} 开头的远控链接`,
      "error",
    );
    return false;
  }
  setStatus("正在连接…");
  await recordRecentLink(url);
  await requestWakeLock();
  // The remote-control page is the product UI; the shell never reimplements it.
  window.location.replace(url);
  return true;
}

async function requestWakeLock(): Promise<void> {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch {
    // Wake lock is best-effort: iOS/Android may refuse it in the background.
  }
}

/** Re-acquire the wake lock when the app returns to the foreground. */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wakeLock === null) {
    void requestWakeLock();
  }
});

async function scan(): Promise<void> {
  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== "granted" && camera !== "limited") {
      setStatus("需要相机权限才能扫码", "error");
      return;
    }
    const result = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
    const raw = result.barcodes?.[0]?.rawValue ?? "";
    if (!raw) {
      setStatus("未识别到二维码");
      return;
    }
    // Scanned content still goes through the policy, exactly like the Kotlin shell.
    await openRemote(raw);
  } catch (error) {
    setStatus(`扫码失败：${(error as Error).message}`, "error");
  }
}

function renderRecent(links: RecentLink[]): void {
  const list = el<HTMLUListElement>("recent");
  list.replaceChildren();
  if (links.length === 0) {
    const item = document.createElement("li");
    item.className = "muted";
    item.textContent = "暂无最近连接";
    list.append(item);
    return;
  }
  for (const link of links) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = describeForDisplay(link);
    button.title = link.host;
    button.addEventListener("click", () => void openRemote(link.url));
    item.append(button);
    list.append(item);
  }
}

async function refreshRecent(): Promise<void> {
  renderRecent(await readRecentLinks());
}

async function handleLaunchPayload(raw: string | null | undefined): Promise<boolean> {
  if (!raw) {
    return false;
  }
  return openRemote(raw);
}

async function boot(): Promise<void> {
  el<HTMLButtonElement>("scan").addEventListener("click", () => void scan());
  el<HTMLButtonElement>("open-default").addEventListener("click", () => {
    void openRemote(el<HTMLInputElement>("paste").value || defaultRemoteUrl());
  });
  el<HTMLButtonElement>("clear").addEventListener("click", async () => {
    await clearRecentLinks();
    await refreshRecent();
    setStatus("已清空最近连接");
  });

  // Deep links while the app is already running (lumos://remote?..., https://…/remote?...).
  await App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
    void openRemote(event.url);
  });

  // Cold start: Capacitor exposes the URL that launched the app, if any.
  const launch = await App.getLaunchUrl();
  if (await handleLaunchPayload(launch?.url ?? null)) {
    return;
  }

  await refreshRecent();
  setStatus(
    DEBUG
      ? "调试包：允许正式域、本机与局域网 /remote 链接"
      : `生产包：仅允许 ${defaultRemoteUrl()}`,
  );
}

void boot();
