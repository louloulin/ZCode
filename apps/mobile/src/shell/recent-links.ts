/**
 * Recent remote-control links — shared by Android and iOS.
 *
 * Mirrors packages/android/.../RemoteControlRecentLinksStore.kt:
 *   - at most 5 entries, newest first
 *   - deduplicated by URL
 *   - the full URL (which carries the pairing token) is stored in app-private
 *     storage only — never rendered in full in the UI
 */
import { Preferences } from "@capacitor/preferences";

const KEY = "lumos_remote_control_recent_links_v1";
const MAX_LINKS = 5;

export interface RecentLink {
  url: string;
  host: string;
  /** Human label, e.g. the `deviceName` query parameter when present. */
  label: string;
  /** Epoch millis. */
  lastOpenedAt: number;
}

interface StoredLink {
  url: string;
  host: string;
  label: string;
  lastOpenedAt: number;
}

export async function readRecentLinks(): Promise<RecentLink[]> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Single pass: keeps the narrowing and the projection together.
    return parsed
      .flatMap((entry): RecentLink[] => {
        const candidate = entry as Partial<StoredLink>;
        if (typeof candidate?.url !== "string" || typeof candidate?.host !== "string") {
          return [];
        }
        return [
          {
            url: candidate.url,
            host: candidate.host,
            label: typeof candidate.label === "string" ? candidate.label : "",
            lastOpenedAt: typeof candidate.lastOpenedAt === "number" ? candidate.lastOpenedAt : 0,
          },
        ];
      })
      .slice(0, MAX_LINKS);
  } catch {
    return [];
  }
}

export async function recordRecentLink(url: string): Promise<RecentLink[]> {
  const entry = describeLink(url);
  if (!entry) {
    return readRecentLinks();
  }
  const existing = await readRecentLinks();
  const next = [entry, ...existing.filter((link) => link.url !== entry.url)].slice(0, MAX_LINKS);
  await Preferences.set({ key: KEY, value: JSON.stringify(next) });
  return next;
}

export async function clearRecentLinks(): Promise<void> {
  await Preferences.remove({ key: KEY });
}

function describeLink(url: string): RecentLink | null {
  try {
    const parsed = new URL(url);
    const deviceName = parsed.searchParams.get("deviceName")?.trim();
    return {
      url,
      host: parsed.host,
      label: deviceName && deviceName.length > 0 ? deviceName : parsed.host,
      lastOpenedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/** UI-safe rendering: host + label only, never the token-bearing URL. */
export function describeForDisplay(link: RecentLink): string {
  return link.label || link.host;
}
