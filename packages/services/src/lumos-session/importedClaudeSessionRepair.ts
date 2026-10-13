import type { LumosSessionStateSnapshot } from "@lumos/shared";
import { createServiceLogger } from "#src/logger/serviceLogger.js";
import { repairImportedClaudeSessionSnapshot } from "#src/session/claude-native/importedClaudeHistoryRepair.js";
import type { ILumosAgentService } from "#src/lumos-agent/lumosAgent.js";
import type {
  LumosSessionReadParams,
  LumosSessionResumeParams,
} from "#src/lumos-session/lumosSession.js";

const logger = createServiceLogger("lumos-session-service");

export async function repairEmptyImportedClaudeSessionSnapshot(params: {
  agentService: ILumosAgentService;
  snapshot: LumosSessionStateSnapshot;
  target: LumosSessionResumeParams | LumosSessionReadParams;
}): Promise<LumosSessionStateSnapshot> {
  const repaired = await repairImportedClaudeSessionSnapshot({
    snapshot: params.snapshot,
    target: {
      workspacePath: params.target.workspacePath,
      workspaceIdentity: params.target.workspaceIdentity,
      taskId: params.target.sessionId,
      ...("mcpServers" in params.target && params.target.mcpServers
        ? { mcpServers: params.target.mcpServers }
        : {}),
    },
    createSession: (input) => params.agentService.createSession(input),
    onRepair: (history) => {
      logger.warn(
        undefined,
        `[lumos-session-service] Claude 导入 session 历史异常，按 ${history.source} 回填 taskId=${params.target.sessionId}`,
      );
    },
  });
  return repaired ?? params.snapshot;
}
