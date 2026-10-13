import { describe, expect, it } from "vitest";
import {
  LUMOS_TOOL_ENV_PASSTHROUGH_ENV_KEY,
  LUMOS_REMOTE_HTTP_PROXY_ENV_KEY,
  LUMOS_REMOTE_NO_PROXY_ENV_KEY,
  LUMOS_REMOTE_RUNTIME_NETWORK_AUTHORITY_ENV_KEY,
  buildLumosToolEnvPassthroughEnv,
  getCapturedLumosCuaBrokerCredentials,
  isCuaDevModeRequested,
  isLumosCuaInternalFeatureEnabled,
  readLumosAgentTelemetryEnv,
  readLumosToolEnvPassthroughEnv,
  resetCapturedLumosCuaBrokerCredentialsForTest,
  sanitizeLumosRuntimeEnv,
  getCapturedLumosAgentTelemetryEnv,
  resetCapturedLumosAgentTelemetryEnvForTest,
} from "../src/runtimeEnv.js";

describe("runtimeEnv", () => {
  it("enables internal CUA by default while honoring explicit false values", () => {
    expect(isLumosCuaInternalFeatureEnabled({})).toBe(true);
    expect(isLumosCuaInternalFeatureEnabled({ LUMOS_CUA_PRODUCT_HELPER: "0" })).toBe(false);
    expect(isLumosCuaInternalFeatureEnabled({ LUMOS_CUA_PRODUCT_HELPER: "false" })).toBe(false);
    expect(isLumosCuaInternalFeatureEnabled({ LUMOS_CUA_PRODUCT_HELPER: "1" })).toBe(true);
    expect(isLumosCuaInternalFeatureEnabled({ LUMOS_CUA_PRODUCT_HELPER: " TRUE " })).toBe(true);
    expect(isLumosCuaInternalFeatureEnabled({ LUMOS_CUA_PRODUCT_HELPER: "on" })).toBe(true);
  });

  it("LUMOS_CUA_DEV_MODE is the one-knob dev bundle and implies the internal feature flag", () => {
    // isCuaDevModeRequested: only explicit truthy values (case-insensitive, trimmed).
    expect(isCuaDevModeRequested({})).toBe(false);
    expect(isCuaDevModeRequested({ LUMOS_CUA_DEV_MODE: "0" })).toBe(false);
    expect(isCuaDevModeRequested({ LUMOS_CUA_DEV_MODE: "false" })).toBe(false);
    expect(isCuaDevModeRequested({ LUMOS_CUA_DEV_MODE: "1" })).toBe(true);
    expect(isCuaDevModeRequested({ LUMOS_CUA_DEV_MODE: " ON " })).toBe(true);
    expect(isCuaDevModeRequested({ LUMOS_CUA_DEV_MODE: "true" })).toBe(true);

    // DEV_MODE implies the internal feature flag without needing LUMOS_CUA_PRODUCT_HELPER,
    // collapsing the historical multi-var dev incantation to one knob.
    expect(isLumosCuaInternalFeatureEnabled({ LUMOS_CUA_DEV_MODE: "1" })).toBe(true);
    expect(isLumosCuaInternalFeatureEnabled({ LUMOS_CUA_PRODUCT_HELPER: "1" })).toBe(true);
    expect(isLumosCuaInternalFeatureEnabled({})).toBe(true);
  });

  it("sanitizes runtime env while sealing user network env for tools", () => {
    const sourceEnv = {
      HTTP_PROXY: "http://proxy.example:8080",
      NODE_ENV: "development",
      NODE_EXTRA_CA_CERTS: "/tmp/root-ca.pem",
      PATH: "/usr/bin:/bin",
      npm_config_proxy: "http://npm-proxy.example:8080",
    };

    const sanitized = sanitizeLumosRuntimeEnv(sourceEnv);
    const passthroughEnv = buildLumosToolEnvPassthroughEnv(sourceEnv);
    const captured = readLumosToolEnvPassthroughEnv(passthroughEnv);

    expect(sanitized).toEqual({ PATH: "/usr/bin:/bin" });
    expect(passthroughEnv[LUMOS_TOOL_ENV_PASSTHROUGH_ENV_KEY]).toBeDefined();
    expect(captured).toEqual({
      HTTP_PROXY: "http://proxy.example:8080",
      NODE_EXTRA_CA_CERTS: "/tmp/root-ca.pem",
      npm_config_proxy: "http://npm-proxy.example:8080",
    });
  });

  it("ignores invalid passthrough JSON and non-network keys", () => {
    const captured = readLumosToolEnvPassthroughEnv({
      [LUMOS_TOOL_ENV_PASSTHROUGH_ENV_KEY]: JSON.stringify({
        HTTP_PROXY: "http://proxy.example:8080",
        NODE_ENV: "production",
        PATH: "/tmp/bin",
      }),
    });

    expect(captured).toEqual({
      HTTP_PROXY: "http://proxy.example:8080",
    });
    expect(
      readLumosToolEnvPassthroughEnv({
        [LUMOS_TOOL_ENV_PASSTHROUGH_ENV_KEY]: "not-json",
      }),
    ).toEqual({});
  });

  it("strips the CUA broker socket/authority/refresh marker from child env and tool passthrough", () => {
    // Confused-deputy 防护：broker bearer 凭据只该定向注入目标 lumos-cua server，绝不能随全局 env
    // 泄漏给其它 MCP / Bash / tool 子进程，也不能经 tool-env-passthrough 恢复。
    const sourceEnv = {
      PATH: "/usr/bin:/bin",
      LUMOS_CUA_PERMISSION_BROKER_SOCKET: "/tmp/lumos-cua-me/broker-abc.sock",
      LUMOS_CUA_PERMISSION_BROKER_REFRESH_MARKER:
        "/tmp/lumos-cua-me/broker-abc.sock.permission-refresh.json",
    };
    const sanitized = sanitizeLumosRuntimeEnv(sourceEnv);
    expect(sanitized).toEqual({ PATH: "/usr/bin:/bin" });

    const captured = readLumosToolEnvPassthroughEnv(buildLumosToolEnvPassthroughEnv(sourceEnv));
    expect(captured).not.toHaveProperty("LUMOS_CUA_PERMISSION_BROKER_SOCKET");
    expect(captured).not.toHaveProperty("LUMOS_CUA_PERMISSION_BROKER_SOCKET");
    expect(captured).not.toHaveProperty("LUMOS_CUA_PERMISSION_BROKER_REFRESH_MARKER");
  });

  it("strips desktop-to-remote network handoff values after stdio bootstrap", () => {
    const sourceEnv = {
      PATH: "/usr/bin:/bin",
      [LUMOS_REMOTE_RUNTIME_NETWORK_AUTHORITY_ENV_KEY]: "1",
      [LUMOS_REMOTE_HTTP_PROXY_ENV_KEY]: "http://172.21.240.1:7890",
      [LUMOS_REMOTE_NO_PROXY_ENV_KEY]: "localhost,127.0.0.1",
    };

    expect(sanitizeLumosRuntimeEnv(sourceEnv)).toEqual({ PATH: "/usr/bin:/bin" });
    expect(readLumosToolEnvPassthroughEnv(buildLumosToolEnvPassthroughEnv(sourceEnv))).toEqual({});
  });

  it("captures broker credentials as one atomic pair and clears stale state on partial rotation", () => {
    resetCapturedLumosCuaBrokerCredentialsForTest();
    try {
      sanitizeLumosRuntimeEnv({
        LUMOS_CUA_PERMISSION_BROKER_SOCKET: "/tmp/broker-a.sock",
        LUMOS_CUA_PLUGIN_AUTHORITY: "authority-a",
      });
      expect(getCapturedLumosCuaBrokerCredentials()).toEqual({
        socket: "/tmp/broker-a.sock",
        pluginAuthority: "authority-a",
      });

      sanitizeLumosRuntimeEnv({
        LUMOS_CUA_PERMISSION_BROKER_SOCKET: "/tmp/broker-b.sock",
      });
      expect(getCapturedLumosCuaBrokerCredentials()).toEqual({
        socket: undefined,
        pluginAuthority: undefined,
      });

      sanitizeLumosRuntimeEnv({
        LUMOS_CUA_PERMISSION_BROKER_SOCKET: "/tmp/broker-b.sock",
        LUMOS_CUA_PLUGIN_AUTHORITY: "authority-b",
      });
      expect(getCapturedLumosCuaBrokerCredentials()).toEqual({
        socket: "/tmp/broker-b.sock",
        pluginAuthority: "authority-b",
      });
    } finally {
      resetCapturedLumosCuaBrokerCredentialsForTest();
    }
  });

  it("captures Agent OTLP config privately and never passes auth or identity through to tools", () => {
    resetCapturedLumosAgentTelemetryEnvForTest();
    const sourceEnv = {
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://arms.example.com/v1/traces",
      OTEL_EXPORTER_OTLP_TRACES_HEADERS: "Authorization=secret",
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://arms.example.com/v1/metrics",
      OTEL_EXPORTER_OTLP_METRICS_HEADERS: "Authorization=metric-secret",
      PATH: "/usr/bin:/bin",
      LUMOS_TELEMETRY_USER_SUBJECT_ID: "opaque-user",
    };
    expect(sanitizeLumosRuntimeEnv(sourceEnv)).toEqual({ PATH: "/usr/bin:/bin" });
    expect(getCapturedLumosAgentTelemetryEnv()).toMatchObject({
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://arms.example.com/v1/traces",
      OTEL_EXPORTER_OTLP_TRACES_HEADERS: "Authorization=secret",
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://arms.example.com/v1/metrics",
      OTEL_EXPORTER_OTLP_METRICS_HEADERS: "Authorization=metric-secret",
      LUMOS_TELEMETRY_USER_SUBJECT_ID: "opaque-user",
    });
    const toolEnv = readLumosToolEnvPassthroughEnv(buildLumosToolEnvPassthroughEnv(sourceEnv));
    expect(toolEnv).not.toHaveProperty("OTEL_EXPORTER_OTLP_TRACES_HEADERS");
    expect(toolEnv).not.toHaveProperty("OTEL_EXPORTER_OTLP_METRICS_HEADERS");
    expect(toolEnv).not.toHaveProperty("LUMOS_TELEMETRY_USER_SUBJECT_ID");
  });

  it("extracts only the allowlisted Agent telemetry env", () => {
    expect(
      readLumosAgentTelemetryEnv({
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: " https://arms.example.com/v1/traces ",
        OTEL_UNKNOWN_SECRET: "must-not-pass",
        PATH: "/bin",
        LUMOS_MODEL_TELEMETRY_ENABLED: "1",
        LUMOS_TELEMETRY_RUNTIME_DISTRIBUTION: " packaged ",
      }),
    ).toEqual({
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://arms.example.com/v1/traces",
      LUMOS_MODEL_TELEMETRY_ENABLED: "1",
      LUMOS_TELEMETRY_RUNTIME_DISTRIBUTION: "packaged",
    });
  });
});
