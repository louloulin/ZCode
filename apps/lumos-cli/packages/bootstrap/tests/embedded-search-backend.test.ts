import { describe, expect, it } from "vitest";
import { resolveDefaultEmbeddedSearchBackend } from "../src/app/embedded-search-backend.js";

describe("resolveDefaultEmbeddedSearchBackend", () => {
  it("uses bundled bfs, ugrep, and ripgrep paths by default", () => {
    expect(
      resolveDefaultEmbeddedSearchBackend({
        env: {
          LUMOS_BFS_BINARY: "/opt/lumos/tools/bfs/bfs",
          LUMOS_RG_BINARY: "/opt/lumos/tools/ripgrep/rg",
          LUMOS_UGREP_BINARY: "/opt/lumos/tools/ugrep/ugrep",
        },
      }),
    ).toEqual({
      kind: "native-binaries",
      findCommand: "/opt/lumos/tools/bfs/bfs",
      grepCommand: "/opt/lumos/tools/ugrep/ugrep",
      rgCommand: "/opt/lumos/tools/ripgrep/rg",
    });
  });

  it("falls back to bfs, ugrep, and rg command names when bundled paths are unavailable", () => {
    expect(resolveDefaultEmbeddedSearchBackend({ env: {} })).toEqual({
      kind: "native-binaries",
      findCommand: "bfs",
      grepCommand: "ugrep",
      rgCommand: "rg",
    });
  });

  it("preserves the explicit internal CLI compatibility override", () => {
    expect(
      resolveDefaultEmbeddedSearchBackend({
        env: { LUMOS_EMBEDDED_SEARCH_COMMAND: "/tmp/lumos-test" },
      }),
    ).toEqual({
      kind: "internal-cli",
      command: "/tmp/lumos-test",
      args: ["__internal-search"],
    });
  });
});
