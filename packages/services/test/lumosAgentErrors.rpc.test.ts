import { ChannelClient, ChannelServer, createQueuePair, ProxyChannel } from "@lumos/rpc";
import { describe, expect, it } from "vitest";
import { ILumosAgentService } from "#src/lumos-agent/lumosAgent.js";
import {
  LUMOS_AGENT_MCP_STATUS_MODE_UNSUPPORTED_ERROR_CODE,
  LumosAgentMcpStatusModeUnsupportedError,
} from "#src/lumos-agent/lumosAgentErrors.js";

describe("Lumos Agent RPC errors", () => {
  it("preserves the MCP status-only unsupported code across ChannelClient RPC", async () => {
    const [serverProtocol, clientProtocol] = createQueuePair();
    const server = new ChannelServer(serverProtocol, "test");
    const client = new ChannelClient(clientProtocol);
    server.registerChannel(
      ILumosAgentService.channelName,
      ProxyChannel.fromService({
        async listMcpServerStatuses() {
          throw new LumosAgentMcpStatusModeUnsupportedError();
        },
      }),
    );
    const service = ProxyChannel.toService<ILumosAgentService>(
      client.getChannel(ILumosAgentService.channelName),
    );

    try {
      await expect(
        service.listMcpServerStatuses({
          mcpServers: [],
          mode: "status",
          workspacePath: "/tmp/workspace",
        }),
      ).rejects.toMatchObject({
        code: LUMOS_AGENT_MCP_STATUS_MODE_UNSUPPORTED_ERROR_CODE,
        name: "LumosAgentMcpStatusModeUnsupportedError",
      });
    } finally {
      client.dispose();
      server.dispose();
    }
  });
});
