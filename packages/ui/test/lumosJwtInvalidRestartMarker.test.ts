import { describe, expect, it } from "vitest";
import {
  consumeLumosJwtInvalidRestartMarker,
  markLumosJwtInvalidRestart,
} from "../src/root/lumosJwtInvalidRestartMarker.js";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("lumos JWT invalid restart marker", () => {
  it("is consumed exactly once after relaunch", () => {
    const storage = createStorage();
    markLumosJwtInvalidRestart(storage);

    expect(consumeLumosJwtInvalidRestartMarker(storage)).toBe(true);
    expect(consumeLumosJwtInvalidRestartMarker(storage)).toBe(false);
  });
});
