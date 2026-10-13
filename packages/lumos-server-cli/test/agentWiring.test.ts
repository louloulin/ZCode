import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createReleaseAgentWiring, resolveBundledAgentWiring } from "../src/runtime/agentWiring.js";

const temporaryDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "lumos-server-agent-wiring-"));
  temporaryDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(temporaryDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe("resolveBundledAgentWiring", () => {
  it("returns wiring for a bundled lumos.cjs next to the entry", async () => {
    const entryDir = await makeTempDir();
    const bundlePath = join(entryDir, "lumos.cjs");
    await writeFile(bundlePath, "// bundle\n", "utf8");

    const wiring = await resolveBundledAgentWiring(entryDir, {});
    expect(wiring).not.toBeNull();
    expect(wiring?.LUMOS_AGENT_SERVER_COMMAND).toBe(process.execPath);
    expect(JSON.parse(wiring?.LUMOS_AGENT_SERVER_ARGS_JSON ?? "[]")).toEqual([
      bundlePath,
      "app-server",
      "--stdio",
    ]);
  });

  it("keeps an explicit LUMOS_AGENT_SERVER_COMMAND untouched", async () => {
    const entryDir = await makeTempDir();
    await writeFile(join(entryDir, "lumos.cjs"), "// bundle\n", "utf8");

    const wiring = await resolveBundledAgentWiring(entryDir, {
      LUMOS_AGENT_SERVER_COMMAND: "/custom/agent",
    });
    expect(wiring).toBeNull();
  });

  it("returns null when no bundled lumos.cjs exists (dev workspace)", async () => {
    const entryDir = await makeTempDir();
    expect(await resolveBundledAgentWiring(entryDir, {})).toBeNull();
  });

  it("recomputes automatic wiring from each candidate release runtime", () => {
    const oldRuntime = "/releases/old/runtime";
    const newRuntime = "/releases/new/runtime";

    expect(createReleaseAgentWiring(oldRuntime, join(oldRuntime, "node"), {})).toEqual({
      LUMOS_AGENT_SERVER_COMMAND: join(oldRuntime, "node"),
      LUMOS_AGENT_SERVER_ARGS_JSON: JSON.stringify([join(oldRuntime, "lumos.cjs"), "app-server", "--stdio"]),
    });
    expect(createReleaseAgentWiring(newRuntime, join(newRuntime, "node"), {})).toEqual({
      LUMOS_AGENT_SERVER_COMMAND: join(newRuntime, "node"),
      LUMOS_AGENT_SERVER_ARGS_JSON: JSON.stringify([join(newRuntime, "lumos.cjs"), "app-server", "--stdio"]),
    });
  });

  it("does not replace an explicit agent command while computing release wiring", () => {
    expect(createReleaseAgentWiring("/release/runtime", "/release/runtime/node", {
      LUMOS_AGENT_SERVER_COMMAND: "/custom/agent",
    })).toBeNull();
  });
});
