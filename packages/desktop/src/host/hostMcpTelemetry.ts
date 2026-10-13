import type { IDisposable } from "@lumos/rpc";
import type { ILumosAgentService } from "@lumos/services";
import type { ProcessResourceRuntimeSurface } from "@lumos/shared";
import { HostResponseTypes } from "@lumos/shared";

interface RegisterHostMcpTelemetryOptions {
  agentService: Pick<ILumosAgentService, "onDynamicMcpTelemetry">;
  postMessage(message: unknown): void;
  runtimeSurface: ProcessResourceRuntimeSurface;
}

export function registerHostMcpTelemetry(options: RegisterHostMcpTelemetryOptions): IDisposable {
  return options.agentService.onDynamicMcpTelemetry()((event) => {
    try {
      options.postMessage({
        type: HostResponseTypes.McpTelemetry,
        runtimeSurface: options.runtimeSurface,
        event,
      });
    } catch {
      // main 已退出或 IPC 不可用时只丢当前遥测，不影响 MCP 生命周期。
    }
  });
}
