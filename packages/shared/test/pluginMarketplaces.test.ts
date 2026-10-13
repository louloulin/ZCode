import { describe, expect, it } from "vitest";
import { DEFAULT_PLUGIN_MARKETPLACES, isPublicStoreMarketplaceId } from "../src/index.js";

describe("DEFAULT_PLUGIN_MARKETPLACES", () => {
  it("includes the official CDN marketplace and the Claude official marketplace", () => {
    expect(DEFAULT_PLUGIN_MARKETPLACES).toEqual([
      expect.objectContaining({
        id: "lumos-plugins-official",
        name: "lumos-plugins-official",
        pluginCount: 0,
        source: "https://cdn-lumos.z.ai/lumos/official-plugin/marketplace.json",
      }),
      expect.objectContaining({
        id: "claude-plugins-official",
        name: "claude-plugins-official",
        pluginCount: 0,
        source: "anthropics/claude-plugins-official",
      }),
    ]);
  });

  it("classifies only the Lumos-operated channels as public store marketplaces", () => {
    expect(isPublicStoreMarketplaceId("lumos-plugins-official")).toBe(true);
    expect(isPublicStoreMarketplaceId("lumos-plugins")).toBe(false);
    // Claude 官方市场受信但不属于「公开」分段（归个人），见 CONTEXT.md 术语表。
    expect(isPublicStoreMarketplaceId("claude-plugins-official")).toBe(false);
    expect(isPublicStoreMarketplaceId("inline")).toBe(false);
  });
});
