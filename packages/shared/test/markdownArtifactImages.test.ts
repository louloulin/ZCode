import { describe, expect, it } from "vitest";

import {
  decodeMarkdownArtifactImageSource,
  extractMarkdownArtifactImageRefs,
  rewriteMarkdownArtifactImageSources,
} from "../src/markdown-artifact-images.js";

describe("Markdown artifact image references", () => {
  it("extracts only image destinations and deduplicates them", () => {
    expect(
      extractMarkdownArtifactImageRefs(
        [
          "![first](lumos-artifact://session/a)",
          "[download](lumos-artifact://session/not-an-image)",
          '![again](<lumos-artifact://session/a> "preview")',
          "![second](lumos-artifact://session/b 'title')",
        ].join("\n"),
      ),
    ).toEqual(["lumos-artifact://session/a", "lumos-artifact://session/b"]);
  });

  it("does not authorize image-looking text inside fenced code", () => {
    expect(
      extractMarkdownArtifactImageRefs(
        "```md\n![secret](lumos-artifact://session/secret)\n```\n![ok](lumos-artifact://session/ok)",
      ),
    ).toEqual(["lumos-artifact://session/ok"]);
  });

  it("rewrites artifact image destinations to a harden-safe relative source", () => {
    const rewritten = rewriteMarkdownArtifactImageSources(
      "before ![shot](lumos-artifact://session/shot-1) after",
    );
    expect(rewritten).not.toContain("lumos-artifact://");
    const source = rewritten.match(/!\[shot\]\(([^)]+)\)/u)?.[1];
    expect(source).toBeTruthy();
    expect(decodeMarkdownArtifactImageSource(source ?? "")).toBe("lumos-artifact://session/shot-1");
  });

  it("leaves normal images, links, and fenced examples unchanged", () => {
    const markdown = [
      "![web](https://example.com/image.png)",
      "[artifact](lumos-artifact://session/file)",
      "```md",
      "![example](lumos-artifact://session/example)",
      "```",
    ].join("\n");
    expect(rewriteMarkdownArtifactImageSources(markdown)).toBe(markdown);
  });
});
