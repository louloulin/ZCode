import type { LumosSessionStateSnapshot } from "@lumos/shared";
import type {
  LumosSessionWorkspaceTarget,
  LumosTaskTarget,
} from "#src/lumos-session/lumosSession.js";

function getWorkspaceKey(target: LumosSessionWorkspaceTarget): string {
  return target.workspaceIdentity?.trim() || target.workspacePath;
}

function getSessionScopedKey(target: LumosTaskTarget): string {
  return `${getWorkspaceKey(target)}\0${target.sessionId}`;
}

export function createLumosDeferredDraftRegistry() {
  const sessionKeys = new Set<string>();

  return {
    remember(params: LumosSessionWorkspaceTarget, snapshot: LumosSessionStateSnapshot): void {
      sessionKeys.add(
        getSessionScopedKey({
          workspacePath: snapshot.session.workspace.workspacePath,
          workspaceIdentity:
            snapshot.session.workspace.workspaceIdentity ?? params.workspaceIdentity,
          sessionId: snapshot.session.sessionId,
        }),
      );
    },

    has(target: LumosTaskTarget): boolean {
      return sessionKeys.has(getSessionScopedKey(target));
    },

    forget(target: LumosTaskTarget): void {
      sessionKeys.delete(getSessionScopedKey(target));
    },
  };
}
