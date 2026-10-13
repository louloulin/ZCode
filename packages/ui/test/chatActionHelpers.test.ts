import { describe, expect, it } from "vitest";
import type { LumosConfigOption } from "@lumos/shared";
import { readCurrentLumosMode } from "../src/hooks/chatActionHelpers.js";

function createModeOption(currentValue: string | boolean): LumosConfigOption {
  return {
    id: "mode",
    name: "Mode",
    category: "mode",
    type: "select",
    currentValue,
  };
}

describe("chatActionHelpers", () => {
  it("reads yolo from Lumos Agent mode config options", () => {
    expect(readCurrentLumosMode([createModeOption("yolo")])).toBe("yolo");
  });

  it("reads edit from Lumos Agent mode config options", () => {
    expect(readCurrentLumosMode([createModeOption("edit")])).toBe("edit");
  });

  it("keeps provider-native Lumos Agent modes", () => {
    expect(readCurrentLumosMode([createModeOption("bypassPermissions")])).toBe("bypassPermissions");
  });

  it("does not normalize retired provider-native agent mode ids", () => {
    const readMode = readCurrentLumosMode as (
      options: readonly LumosConfigOption[],
      provider?: string,
    ) => unknown;
    expect(readCurrentLumosMode([createModeOption("agent")])).toBeUndefined();
    expect(readMode([createModeOption("agent-full-access")], "gemini")).toBeUndefined();
  });

  it("ignores invalid mode values", () => {
    expect(readCurrentLumosMode([createModeOption("unknown")])).toBeUndefined();
    expect(readCurrentLumosMode([createModeOption(true)])).toBeUndefined();
  });
});
