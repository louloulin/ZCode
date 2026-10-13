import { describe, expect, it } from "vitest";
import {
  convertToLumosAgentMcpServer,
  isLumosCuaMcpCommand,
  isLumosCuaMcpPackageArg,
} from "../src/mcp.js";

describe("lumos-cua MCP matcher (single source of truth for services + CLI bootstrap)", () => {
  it("matches the lumos-cua command by leaf name", () => {
    expect(isLumosCuaMcpCommand("lumos-cua")).toBe(true);
    expect(isLumosCuaMcpCommand("/opt/homebrew/bin/lumos-cua")).toBe(true);
    expect(isLumosCuaMcpCommand("uvx")).toBe(false);
    expect(isLumosCuaMcpCommand("lumos-cua-server")).toBe(false);
  });

  it("matches uvx/pip package spec forms", () => {
    for (const arg of ["lumos-cua", "lumos-cua[macos]", "lumos-cua@v0.1.3", "lumos-cua[macos]@v0.1.3"]) {
      expect(isLumosCuaMcpPackageArg(arg)).toBe(true);
    }
  });

  it("matches git and local-path forms (the drift that broke desktop/services parity)", () => {
    expect(isLumosCuaMcpPackageArg("lumos-cua.git")).toBe(true);
    expect(isLumosCuaMcpPackageArg("git+https://github.com/x/lumos-cua.git@v0.1.3")).toBe(true);
    expect(isLumosCuaMcpPackageArg("/Users/me/src/lumos-cua")).toBe(true);
    expect(isLumosCuaMcpPackageArg("C:\\src\\lumos-cua")).toBe(true);
  });

  it("does not match unrelated args", () => {
    for (const arg of ["--from", "run", "lumos-cua-server", "not-lumos-cua", "server.js"]) {
      expect(isLumosCuaMcpPackageArg(arg)).toBe(false);
    }
  });

  it("recognizes a package spec placed in COMMAND position (command/arg matchers stay consistent)", () => {
    // 之前 command matcher 只认精确叶子 lumos-cua，会漏判把包规格直接当 command 的配置 → 漏注入 broker。
    for (const command of ["lumos-cua@1.2.3", "lumos-cua[macos]", "lumos-cua.git", "/opt/tools/lumos-cua@1.2.3"]) {
      expect(isLumosCuaMcpCommand(command), command).toBe(true);
    }
  });

  it("recognizes pip == pins and the lumos_cua underscore distribution name (PyPI treats _ == -)", () => {
    for (const arg of ["lumos-cua==1.2.3", "lumos_cua", "lumos_cua==1.2.3", "lumos_cua@v0.1.3"]) {
      expect(isLumosCuaMcpPackageArg(arg), arg).toBe(true);
    }
    expect(isLumosCuaMcpCommand("lumos_cua")).toBe(true);
  });

  it("does not false-positive on sibling packages like lumos-cua-proxy", () => {
    for (const value of ["lumos-cua-proxy", "lumos-cua-proxy@1.0.0", "lumos-cua-helper"]) {
      expect(isLumosCuaMcpCommand(value), value).toBe(false);
      expect(isLumosCuaMcpPackageArg(value), value).toBe(false);
    }
  });

  it("recognizes `python -m lumos_cua.server` submodule form (M1 fail-open fix)", () => {
    // `python -m lumos_cua.server` → arg 是 `lumos_cua.server`；旧 matcher 漏判 → 不注入 broker → fail-open。
    for (const arg of ["lumos_cua.server", "lumos-cua.server", "lumos_cua.main", "lumos-cua.__main__"]) {
      expect(isLumosCuaMcpPackageArg(arg), arg).toBe(true);
    }
  });

  it("recognizes local paths with a trailing separator (M1 fail-open fix)", () => {
    // `.../lumos-cua/` 直接取叶子会得到空串 → 漏判 → fail-open。
    expect(isLumosCuaMcpPackageArg("/Users/me/src/lumos-cua/")).toBe(true);
    expect(isLumosCuaMcpPackageArg("C:\\src\\lumos-cua\\")).toBe(true);
    expect(isLumosCuaMcpCommand("/opt/homebrew/bin/lumos-cua/")).toBe(true);
    // 但带尾斜杠的 sibling 仍不误判。
    expect(isLumosCuaMcpPackageArg("/Users/me/src/lumos-cua-proxy/")).toBe(false);
  });
});

describe("MCP config helpers", () => {
  it("passes legacy http_headers through to Lumos Agent MCP servers", () => {
    expect(
      convertToLumosAgentMcpServer("web-search-prime", {
        type: "http",
        url: "https://bigmodel.example.test/mcp",
        timeoutMs: 5000,
        http_headers: {
          Authorization: "Bearer token",
        },
      }),
    ).toEqual({
      name: "web-search-prime",
      type: "http",
      url: "https://bigmodel.example.test/mcp",
      headers: [{ name: "Authorization", value: "Bearer token" }],
      timeoutMs: 5000,
    });
  });

  it("preserves timeoutMs when converting stdio MCP servers for Lumos Agent", () => {
    expect(
      convertToLumosAgentMcpServer("context7", {
        type: "stdio",
        command: "npx",
        args: ["-y", "@upstash/context7-mcp"],
        timeoutMs: 3,
      }),
    ).toEqual({
      name: "context7",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
      env: [],
      timeoutMs: 3,
    });
  });

  it("preserves timeoutMs when converting sse MCP servers for Lumos Agent", () => {
    expect(
      convertToLumosAgentMcpServer("stream", {
        type: "sse",
        url: "https://bigmodel.example.test/sse",
        timeoutMs: 8000,
      }),
    ).toEqual({
      name: "stream",
      type: "sse",
      url: "https://bigmodel.example.test/sse",
      headers: [],
      timeoutMs: 8000,
    });
  });

  it("preserves HTTP OAuth client credentials when converting MCP servers for Lumos Agent", () => {
    expect(
      convertToLumosAgentMcpServer("protected", {
        type: "http",
        url: "https://mcp.example.test/mcp",
        oauth: {
          type: "client_credentials",
          clientId: "lumos-client",
          clientSecret: "secret",
          scope: "mcp:tools",
        },
      }),
    ).toMatchObject({
      name: "protected",
      type: "http",
      oauth: {
        type: "client_credentials",
        clientId: "lumos-client",
        clientSecret: "secret",
        scope: "mcp:tools",
      },
    });
  });

  it("preserves HTTP OAuth authorization code config when converting MCP servers for Lumos Agent", () => {
    expect(
      convertToLumosAgentMcpServer("figma", {
        type: "http",
        url: "https://mcp.figma.com/mcp",
        oauth: {
          type: "authorization_code",
          clientName: "Lumos",
          redirectPath: "/oauth/callback/mcp/figma",
          scope: "mcp:connect",
        },
      }),
    ).toMatchObject({
      name: "figma",
      type: "http",
      oauth: {
        type: "authorization_code",
        clientName: "Lumos",
        redirectPath: "/oauth/callback/mcp/figma",
        scope: "mcp:connect",
      },
    });
  });

  it("does not persist implicit OAuth defaults when converting bare HTTP MCP servers", () => {
    expect(
      convertToLumosAgentMcpServer("notion", {
        type: "http",
        url: "https://mcp.notion.com/mcp",
        timeoutMs: 30000,
      }),
    ).toEqual({
      name: "notion",
      type: "http",
      url: "https://mcp.notion.com/mcp",
      headers: [],
      timeoutMs: 30000,
    });
  });

  it("drops invalid timeoutMs when converting MCP servers for Lumos Agent", () => {
    expect(
      convertToLumosAgentMcpServer("zero", {
        type: "stdio",
        command: "npx",
        timeoutMs: 0,
      }),
    ).not.toHaveProperty("timeoutMs");

    expect(
      convertToLumosAgentMcpServer("fractional", {
        type: "http",
        url: "https://bigmodel.example.test/mcp",
        timeoutMs: 1.5,
      }),
    ).not.toHaveProperty("timeoutMs");
  });

  it("keeps headers ahead of legacy http_headers when both are present", () => {
    expect(
      convertToLumosAgentMcpServer("web-reader", {
        type: "sse",
        url: "https://bigmodel.example.test/sse",
        headers: {
          Authorization: "Bearer fresh",
        },
        http_headers: {
          Authorization: "Bearer stale",
        },
      }),
    ).toMatchObject({
      headers: [{ name: "Authorization", value: "Bearer fresh" }],
    });
  });
});
