import { describe, expect, it } from "vitest";
import {
  shouldHideLumosSessionForkAction,
  supportsLumosSessionFork,
} from "../src/lib/lumosProviders.js";

describe("supportsLumosSessionFork", () => {
  it("所有 provider 都开放 session fork 入口", () => {
    expect(supportsLumosSessionFork("glm")).toBe(true);
    expect(supportsLumosSessionFork("claude")).toBe(true);
    expect(supportsLumosSessionFork("codex")).toBe(true);
    expect(supportsLumosSessionFork("gemini")).toBe(true);
    expect(supportsLumosSessionFork("opencode")).toBe(true);
  });
});

describe("shouldHideLumosSessionForkAction", () => {
  it("所有 provider 都不再隐藏 fork UI 入口", () => {
    expect(shouldHideLumosSessionForkAction("glm")).toBe(false);
    expect(shouldHideLumosSessionForkAction("claude")).toBe(false);
    expect(shouldHideLumosSessionForkAction("codex")).toBe(false);
    expect(shouldHideLumosSessionForkAction("gemini")).toBe(false);
    expect(shouldHideLumosSessionForkAction("opencode")).toBe(false);
  });
});
