import { describe, expect, it } from "vitest";
import { TEST_LUMOS_ENDPOINT_ORIGIN } from "@lumos/shared";
import { LUMOS_CLIENT_SCENES_URL } from "../src/providers/api/apiEndpoints.js";
import { createNodeApiClient } from "../src/providers/api/nodeApiClient.js";

describe("Lumos API endpoints", () => {
  it("通过统一 ApiClient 注册并请求 client scenes", async () => {
    const requests: Array<{ headers: Headers; method: string; url: string }> = [];
    const client = createNodeApiClient({
      fetchImpl: async (input, init) => {
        requests.push({
          headers: new Headers(init?.headers),
          method: init?.method ?? "GET",
          url: String(input),
        });
        return new Response('{"code":0,"msg":"","data":[]}', { status: 200 });
      },
      resolveLumosEndpointOrigin: () => TEST_LUMOS_ENDPOINT_ORIGIN,
    });

    await client.request(LUMOS_CLIENT_SCENES_URL, { method: "GET" });

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: "GET",
      url: `${TEST_LUMOS_ENDPOINT_ORIGIN}/api/v1/client/scenes`,
    });
    expect(requests[0]?.headers.get("X-Lumos-App-Version")).toBeTruthy();
    expect(requests[0]?.headers.get("X-Platform")).toBe(`${process.platform}-${process.arch}`);
    expect(requests[0]?.headers.get("x-request-id")).toBeTruthy();
  });
});
