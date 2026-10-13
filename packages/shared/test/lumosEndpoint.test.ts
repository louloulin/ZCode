import { describe, expect, it } from "vitest";
import {
  DEFAULT_BIGMODEL_API_ORIGIN,
  DEFAULT_WEB_REMOTE_CONTROL_RELAY_WS_URL,
  DEFAULT_ZAI_BUSINESS_BASE_URL,
  DEFAULT_ZAI_OAUTH_CLIENT_ID,
  DEFAULT_ZAI_OAUTH_ORIGIN,
  DEFAULT_LUMOS_ENDPOINT_ORIGIN,
  TEST_BIGMODEL_API_ORIGIN,
  TEST_ZAI_BUSINESS_BASE_URL,
  TEST_ZAI_OAUTH_CLIENT_ID,
  TEST_ZAI_OAUTH_ORIGIN,
  TEST_LUMOS_ENDPOINT_ORIGIN,
  buildBigModelCodingPlanPersonalManageUrl,
  buildBigModelCodingPlanTeamManageUrl,
  buildBigModelApiUrl,
  buildRuntimeLumosApiUrl,
  buildRuntimeZaiBusinessUrl,
  buildRuntimeZaiOAuthUrl,
  buildRuntimeLumosEndpointUrls,
  buildLumosEndpointUrls,
  normalizeLumosEndpointOrigin,
  resolveBigModelApiOrigin,
  resolveRuntimeProductEndpointConfig,
  resolveWebRemoteControlRelayWsUrl,
  resolveZaiBusinessBaseUrl,
  resolveZaiOAuthClientId,
  resolveZaiOAuthOrigin,
  resolveLumosEndpointOrigin,
} from "../src/lumosEndpoint.js";
import { appSettingsPatchSchema, appSettingsSchema } from "../src/validationAppSettings.js";

describe("lumosEndpoint", () => {
  it("defaults to the scoped origin in every env without env base url", () => {
    expect(resolveLumosEndpointOrigin({ env: "test" })).toBe(TEST_LUMOS_ENDPOINT_ORIGIN);
    expect(resolveLumosEndpointOrigin({ env: "production" })).toBe(DEFAULT_LUMOS_ENDPOINT_ORIGIN);
  });

  it("uses LUMOS_BASE_URL style env base as the default endpoint", () => {
    expect(
      resolveLumosEndpointOrigin({
        env: "test",
        envBaseOrigin: "https://lumos.z.ai/api/v1",
      }),
    ).toBe(TEST_LUMOS_ENDPOINT_ORIGIN);
    expect(
      resolveLumosEndpointOrigin({
        env: "production",
        envBaseOrigin: "https://lumos.z.ai/api/v1",
      }),
    ).toBe(DEFAULT_LUMOS_ENDPOINT_ORIGIN);
  });

  it("keeps the non-production settings override above env base url", () => {
    expect(
      resolveLumosEndpointOrigin({
        env: "test",
        envBaseOrigin: "https://lumos.z.ai",
        overrideOrigin: "http://localhost:3030/api/v1",
      }),
    ).toBe("http://localhost:3030");
  });

  it("uses a non-production override after normalizing to origin", () => {
    expect(
      resolveLumosEndpointOrigin({
        env: "test",
        overrideOrigin: "https://lumos.z.ai/api/v1/ignored?x=1",
      }),
    ).toBe(TEST_LUMOS_ENDPOINT_ORIGIN);
  });

  it("ignores overrides in production", () => {
    expect(
      resolveLumosEndpointOrigin({
        env: "production",
        envBaseOrigin: "https://lumos.z.ai",
        overrideOrigin: "https://lumos.z.ai",
      }),
    ).toBe(DEFAULT_LUMOS_ENDPOINT_ORIGIN);
  });

  it("derives http and websocket urls from the same origin", () => {
    expect(buildLumosEndpointUrls("http://localhost:3030")).toEqual({
      origin: "http://localhost:3030",
      apiBaseUrl: "http://localhost:3030/api/v1",
      remoteUrl: "http://localhost:3030/remote/v3",
      webRemoteCallbackUrl: "http://localhost:3030/web-remote/callback",
      webShareCallbackUrl: "http://localhost:3030/cn/share/callback",
      relayWsUrl: "ws://localhost:3030/ws",
      lumosPlanOpenAiBaseUrl: "http://localhost:3030/api/v1/lumos-plan",
      lumosPlanAnthropicBaseUrl: "http://localhost:3030/api/v1/lumos-plan/anthropic",
      lumosPlanBillingCurrentUrl: "http://localhost:3030/api/v1/lumos-plan/billing/current",
      lumosPlanBillingBalanceUrl: "http://localhost:3030/api/v1/lumos-plan/billing/balance",
    });
  });

  it("uses remote v3 for app versions below 3.4.0", () => {
    expect(buildLumosEndpointUrls("https://lumos.z.ai", { appVersion: "3.3.9" }).remoteUrl).toBe(
      "https://lumos.z.ai/remote/v3",
    );
  });

  it("uses remote v4 for app versions at or above 3.4.0", () => {
    expect(buildLumosEndpointUrls("https://lumos.z.ai", { appVersion: "3.4.0" }).remoteUrl).toBe(
      "https://lumos.z.ai/remote/v4",
    );
    expect(buildLumosEndpointUrls("https://lumos.z.ai", { appVersion: "3.4.1" }).remoteUrl).toBe(
      "https://lumos.z.ai/remote/v4",
    );
    expect(
      buildLumosEndpointUrls("https://lumos.z.ai", { appVersion: "3.5.0-beta.1" }).remoteUrl,
    ).toBe("https://lumos.z.ai/remote/v4");
  });

  it("keeps prerelease and invalid app versions on remote v3", () => {
    expect(
      buildLumosEndpointUrls("https://lumos.z.ai", { appVersion: "3.4.0-beta.1" }).remoteUrl,
    ).toBe("https://lumos.z.ai/remote/v3");
    expect(buildLumosEndpointUrls("https://lumos.z.ai", { appVersion: "dev" }).remoteUrl).toBe(
      "https://lumos.z.ai/remote/v3",
    );
    expect(buildLumosEndpointUrls("https://lumos.z.ai", { appVersion: "03.4.0" }).remoteUrl).toBe(
      "https://lumos.z.ai/remote/v3",
    );
    expect(
      buildLumosEndpointUrls("https://lumos.z.ai", { appVersion: "3.4.1-alpha..1" }).remoteUrl,
    ).toBe("https://lumos.z.ai/remote/v3");
    expect(buildLumosEndpointUrls("https://lumos.z.ai", { appVersion: "3.4.1-01" }).remoteUrl).toBe(
      "https://lumos.z.ai/remote/v3",
    );
  });

  it("derives runtime lumos-plan urls from LUMOS_ENV", () => {
    expect(buildRuntimeLumosEndpointUrls({ LUMOS_ENV: "test" }).lumosPlanOpenAiBaseUrl).toBe(
      "https://lumos.z.ai/api/v1/lumos-plan",
    );
    expect(buildRuntimeLumosEndpointUrls({ LUMOS_ENV: "production" }).lumosPlanOpenAiBaseUrl).toBe(
      "https://lumos.z.ai/api/v1/lumos-plan",
    );
    expect(buildRuntimeLumosEndpointUrls({}).lumosPlanOpenAiBaseUrl).toBe(
      "https://lumos.z.ai/api/v1/lumos-plan",
    );
    expect(
      buildRuntimeLumosEndpointUrls({
        LUMOS_ENV: "test",
        LUMOS_BASE_URL: "https://lumos.z.ai/ignored/path",
      }).lumosPlanAnthropicBaseUrl,
    ).toBe("https://lumos.z.ai/api/v1/lumos-plan/anthropic");
  });

  it("uses the test relay only for the standard test endpoint", () => {
    expect(
      resolveWebRemoteControlRelayWsUrl({
        endpointOrigin: TEST_LUMOS_ENDPOINT_ORIGIN,
      }),
    ).toBe("wss://lumos.z.ai/ws");
    expect(
      resolveWebRemoteControlRelayWsUrl({
        endpointOrigin: DEFAULT_LUMOS_ENDPOINT_ORIGIN,
      }),
    ).toBe(DEFAULT_WEB_REMOTE_CONTROL_RELAY_WS_URL);
    expect(
      resolveWebRemoteControlRelayWsUrl({
        endpointOrigin: "http://localhost:3030",
      }),
    ).toBe(DEFAULT_WEB_REMOTE_CONTROL_RELAY_WS_URL);
  });

  it("allows an explicit web remote control relay url override", () => {
    expect(
      resolveWebRemoteControlRelayWsUrl({
        endpointOrigin: TEST_LUMOS_ENDPOINT_ORIGIN,
        overrideUrl: " ws://localhost:8787/ws ",
      }),
    ).toBe("ws://localhost:8787/ws");
  });

  it("derives BigModel API origin from LUMOS_ENV", () => {
    expect(resolveBigModelApiOrigin({ LUMOS_ENV: "production" })).toBe("https://bigmodel.cn");
    expect(resolveBigModelApiOrigin({ LUMOS_ENV: "test" })).toBe("https://bigmodel.cn");
    expect(buildBigModelApiUrl({ LUMOS_ENV: "test" }, "/api/biz/subscription/list")).toBe(
      "https://bigmodel.cn/api/biz/subscription/list",
    );
  });

  it("derives BigModel Coding Plan manage urls from LUMOS_ENV", () => {
    expect(buildBigModelCodingPlanPersonalManageUrl({ LUMOS_ENV: "test" })).toBe(
      "https://bigmodel.cn/coding-plan/personal/overview",
    );
    expect(buildBigModelCodingPlanPersonalManageUrl({ LUMOS_ENV: "production" })).toBe(
      "https://bigmodel.cn/coding-plan/personal/overview",
    );
    expect(buildBigModelCodingPlanTeamManageUrl({ LUMOS_ENV: "test" })).toBe(
      "https://bigmodel.cn/coding-plan/team/plans",
    );
    expect(buildBigModelCodingPlanTeamManageUrl({ LUMOS_ENV: "production" })).toBe(
      "https://bigmodel.cn/coding-plan/team/plans",
    );
  });

  it("resolves all product endpoints for the test product environment", () => {
    expect(resolveRuntimeProductEndpointConfig({ LUMOS_ENV: "test" })).toMatchObject({
      lumosEnv: "test",
      lumosEndpointOrigin: TEST_LUMOS_ENDPOINT_ORIGIN,
      zaiOAuthOrigin: TEST_ZAI_OAUTH_ORIGIN,
      zaiBusinessBaseUrl: TEST_ZAI_BUSINESS_BASE_URL,
      zaiOAuthClientId: TEST_ZAI_OAUTH_CLIENT_ID,
      bigModelApiOrigin: TEST_BIGMODEL_API_ORIGIN,
    });
  });

  it("resolves all product endpoints for the production product environment", () => {
    expect(resolveRuntimeProductEndpointConfig({ LUMOS_ENV: "production" })).toMatchObject({
      lumosEnv: "production",
      lumosEndpointOrigin: DEFAULT_LUMOS_ENDPOINT_ORIGIN,
      zaiOAuthOrigin: DEFAULT_ZAI_OAUTH_ORIGIN,
      zaiBusinessBaseUrl: DEFAULT_ZAI_BUSINESS_BASE_URL,
      zaiOAuthClientId: DEFAULT_ZAI_OAUTH_CLIENT_ID,
      bigModelApiOrigin: DEFAULT_BIGMODEL_API_ORIGIN,
    });
  });

  it("builds product endpoint URLs from the selected environment", () => {
    expect(buildRuntimeLumosApiUrl({ LUMOS_ENV: "test" }, "/api/v1/oauth/token")).toBe(
      "https://lumos.z.ai/api/v1/oauth/token",
    );
    expect(buildRuntimeZaiOAuthUrl({ LUMOS_ENV: "test" }, "/api/oauth/authorize")).toBe(
      "https://chat.z.ai/api/oauth/authorize",
    );
    expect(buildRuntimeZaiBusinessUrl({ LUMOS_ENV: "test" }, "/api/auth/z/login")).toBe(
      "https://api.z.ai/api/auth/z/login",
    );
    expect(buildBigModelApiUrl({ LUMOS_ENV: "test" }, "/login")).toBe(
      "https://bigmodel.cn/login",
    );
  });

  it("keeps environment-scoped endpoint overrides centralized", () => {
    const env = {
      LUMOS_ENV: "test",
      LUMOS_TEST_BASE_URL: "https://test-lumos.example.com/path",
      ZAI_TEST_OAUTH_ORIGIN: "https://test-oauth.example.com/oauth",
      ZAI_TEST_BUSINESS_BASE_URL: "https://test-business.example.com/api",
      ZAI_TEST_OAUTH_CLIENT_ID: "client_test_override",
      BIGMODEL_TEST_API_BASE_URL: "https://test-bigmodel.example.com/base",
    };

    expect(resolveRuntimeProductEndpointConfig(env)).toMatchObject({
      lumosEndpointOrigin: "https://test-lumos.example.com",
      zaiOAuthOrigin: "https://test-oauth.example.com",
      zaiBusinessBaseUrl: "https://test-business.example.com",
      zaiOAuthClientId: "client_test_override",
      bigModelApiOrigin: "https://test-bigmodel.example.com",
    });
  });

  it("keeps unscoped endpoint overrides above scoped endpoint overrides", () => {
    const env = {
      LUMOS_ENV: "test",
      ZAI_OAUTH_ORIGIN: "https://oauth-global.example.com",
      ZAI_TEST_OAUTH_ORIGIN: "https://oauth-test.example.com",
      ZAI_BUSINESS_BASE_URL: "https://business-global.example.com",
      ZAI_TEST_BUSINESS_BASE_URL: "https://business-test.example.com",
      ZAI_OAUTH_CLIENT_ID: "client_global",
      ZAI_TEST_OAUTH_CLIENT_ID: "client_test",
      BIGMODEL_API_BASE_URL: "https://bigmodel-global.example.com",
      BIGMODEL_TEST_API_BASE_URL: "https://bigmodel-test.example.com",
    };

    expect(resolveZaiOAuthOrigin(env)).toBe("https://oauth-global.example.com");
    expect(resolveZaiBusinessBaseUrl(env)).toBe("https://business-global.example.com");
    expect(resolveZaiOAuthClientId(env)).toBe("client_global");
    expect(resolveBigModelApiOrigin(env)).toBe("https://bigmodel-global.example.com");
  });

  it("ignores blank runtime endpoint overrides", () => {
    const env = {
      LUMOS_ENV: "test",
      LUMOS_BASE_URL: " ",
      LUMOS_TEST_BASE_URL: "\t",
      ZAI_OAUTH_ORIGIN: "",
      ZAI_TEST_OAUTH_ORIGIN: " ",
      ZAI_BUSINESS_BASE_URL: " ",
      ZAI_TEST_BUSINESS_BASE_URL: "",
      ZAI_OAUTH_CLIENT_ID: "",
      ZAI_TEST_OAUTH_CLIENT_ID: " ",
      BIGMODEL_API_BASE_URL: " ",
      BIGMODEL_TEST_API_BASE_URL: "",
    };

    expect(resolveRuntimeProductEndpointConfig(env)).toMatchObject({
      lumosEndpointOrigin: TEST_LUMOS_ENDPOINT_ORIGIN,
      zaiOAuthOrigin: TEST_ZAI_OAUTH_ORIGIN,
      zaiBusinessBaseUrl: TEST_ZAI_BUSINESS_BASE_URL,
      zaiOAuthClientId: TEST_ZAI_OAUTH_CLIENT_ID,
      bigModelApiOrigin: TEST_BIGMODEL_API_ORIGIN,
    });
  });

  it("rejects non-http endpoint origins", () => {
    expect(() => normalizeLumosEndpointOrigin("file:///tmp/lumos")).toThrow(/http or https/);
  });

  it("persists optional endpoint override in app settings", () => {
    expect(
      appSettingsSchema.parse({ lumosEndpointOrigin: "https://lumos.z.ai/path" })
        .lumosEndpointOrigin,
    ).toBe(TEST_LUMOS_ENDPOINT_ORIGIN);
    expect(
      appSettingsPatchSchema.parse({ lumosEndpointOrigin: "http://localhost:3030/foo" })
        .lumosEndpointOrigin,
    ).toBe("http://localhost:3030");
  });
});
