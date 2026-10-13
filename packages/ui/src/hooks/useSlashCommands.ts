/**
 * Lumos Agent Slash Commands 便捷 hook
 *
 * 返回当前 workspace 下 Agent 广播的可用 slash commands 列表。
 */
import { useLumosSessionStore, selectWorkspaceLumosState } from "../store/lumosSessionStore.js";

export function useSlashCommands(workspacePath: string, workspaceIdentity?: string) {
  return useLumosSessionStore(
    (state) => selectWorkspaceLumosState(state, workspacePath, workspaceIdentity).slashCommands,
  );
}
