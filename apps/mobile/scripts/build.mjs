#!/usr/bin/env node
/**
 * Bundle the shared shell into www/shell.js.
 *
 * The shell is the ONLY hand-written native-facing code; it is shared verbatim
 * by the Android and iOS apps (Capacitor injects the platform plugins), so both
 * platforms stay on one codebase.
 */
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const here = import.meta.dirname;
const outdir = resolve(here, "..", "www");

await mkdir(outdir, { recursive: true });

await build({
  entryPoints: [resolve(here, "..", "src", "shell", "shell.ts")],
  outfile: resolve(outdir, "shell.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: false,
  legalComments: "none",
  // Build-time flag standing in for the Kotlin shell's BuildConfig.DEBUG.
  // Production builds must NOT allow localhost/LAN remote URLs.
  define: {
    __LUMOS_DEBUG__: JSON.stringify(process.env.LUMOS_MOBILE_DEBUG === "1"),
    __LUMOS_DEFAULT_REMOTE_URL__: JSON.stringify(
      process.env.LUMOS_MOBILE_DEFAULT_REMOTE_URL ?? "https://lumosai.cc/remote",
    ),
  },
});

console.log(`[lumos-mobile] bundled shell -> ${resolve(outdir, "shell.js")}`);
