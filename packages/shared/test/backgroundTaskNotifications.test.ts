import { describe, expect, it } from "vitest";
import {
  parseLumosBackgroundTaskNotificationText,
  lumosBackgroundTaskNotificationToolUpdateStatus,
} from "../src/background-task-notifications.js";

describe("background task notifications", () => {
  it("preserves stopped task-notification status and normalizes killed to stopped", () => {
    expect(lumosBackgroundTaskNotificationToolUpdateStatus("stopped")).toBe("stopped");
    expect(lumosBackgroundTaskNotificationToolUpdateStatus("killed")).toBe("stopped");
  });

  it("normalizes terminal task-notification status", () => {
    expect(lumosBackgroundTaskNotificationToolUpdateStatus("completed")).toBe("completed");
    expect(lumosBackgroundTaskNotificationToolUpdateStatus("failed")).toBe("failed");
    expect(lumosBackgroundTaskNotificationToolUpdateStatus("lost")).toBe("failed");
    expect(lumosBackgroundTaskNotificationToolUpdateStatus("unexpected")).toBe("completed");
    expect(lumosBackgroundTaskNotificationToolUpdateStatus(undefined)).toBe("completed");
  });

  it("parses failed notification error and decodes XML entities exactly once", () => {
    const providerMessage = "429 & retry; literal &amp; marker";
    const summary = `Agent general-purpose task "Review" failed. ${providerMessage}`;
    const parsed = parseLumosBackgroundTaskNotificationText(
      [
        "<task-notification>",
        "<task-id>agent_429</task-id>",
        "<tool-use-id>toolu_429</tool-use-id>",
        "<status>failed</status>",
        "<summary>Agent general-purpose task &quot;Review&quot; failed. 429 &amp; retry; literal &amp;amp; marker</summary>",
        "<error>429 &amp; retry; literal &amp;amp; marker</error>",
        "</task-notification>",
      ].join("\n"),
    );

    expect(parsed).toMatchObject({
      toolUseId: "toolu_429",
      notification: {
        taskId: "agent_429",
        status: "failed",
        summary,
        error: providerMessage,
      },
    });
    expect(parsed?.notification.error).toBe(providerMessage);
  });
});
