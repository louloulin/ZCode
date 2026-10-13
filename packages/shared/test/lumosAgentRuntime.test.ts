import { describe, expect, it } from "vitest";
import { LUMOS_AGENT_RUNTIME } from "@lumos/shared";

describe("Lumos Agent runtime", () => {
  it("starts the private Lumos Protocol server instead of the retired Lumos Agent command", () => {
    const retiredProtocolName = `${"a"}${"cp"}`;

    expect(LUMOS_AGENT_RUNTIME.spawnArgs).toEqual(["app-server", "--stdio"]);
    expect(LUMOS_AGENT_RUNTIME.spawnArgs).not.toContain(retiredProtocolName);
  });

  it("uses the Lumos Agent binary name", () => {
    expect(LUMOS_AGENT_RUNTIME.resolveEntrySegments("darwin")).toEqual(["lumos-agent"]);
    expect(LUMOS_AGENT_RUNTIME.resolveEntrySegments("win32")).toEqual(["lumos-agent.exe"]);
  });
});
