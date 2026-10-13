import { ServiceChannels } from "@lumos/shared";
import type {
  TraceId,
  LumosAgentMcpServer,
  LumosDeliveryKind,
  LumosMessageWithParts,
  ModelSelection,
  LumosPermissionRequestParams,
  LumosProviderRuntimeHeadersRequestParams,
  LumosUserInputRequestParams,
  LumosUserInputResponse,
  LumosSessionInfo,
  LumosSessionImportHistory,
  LumosSessionEvent,
  LumosSessionMode,
  LumosSessionPersistence,
  LumosSessionStateSnapshot,
  LumosStateUpdatedNotification,
  LumosWorkspacePresentation,
} from "@lumos/shared";
import { createServiceDescriptor } from "#src/descriptors.js";
import type { ProviderRuntimeHeadersUiResponse } from "#src/lumos-agent/lumosAgent.js";

export interface LumosSessionWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  remoteSessionId?: string;
}

export type LumosSessionReadWorkspacePresentationParams = LumosSessionWorkspaceTarget;

export interface LumosTaskTarget extends LumosSessionWorkspaceTarget {
  sessionId: string;
}

export interface LumosSessionCreateParams extends LumosSessionWorkspaceTarget {
  /** 仅导入事务使用的预分配 ID；普通新会话继续由 Agent 分配。 */
  sessionId?: string;
  sessionTraceId?: TraceId;
  parentSessionId?: string;
  mode?: LumosSessionMode;
  model?: ModelSelection;
  persistence?: LumosSessionPersistence;
  thoughtLevel?: string;
  mcpServers?: LumosAgentMcpServer[];
  importedHistory?: LumosSessionImportHistory;
}

export interface LumosSessionResumeParams extends LumosTaskTarget {
  model?: ModelSelection;
  thoughtLevel?: string;
  mcpServers?: LumosAgentMcpServer[];
  /**
   * 默认广播 resume 得到的历史快照，并让 shadow 订阅请求初始 snapshot。
   * 续聊发送前的 runtime 预恢复会关闭它，避免旧终态快照覆盖本地已开始的新输入运行态。
   */
  broadcastSnapshot?: boolean;
}

export interface LumosSessionListParams extends LumosSessionWorkspaceTarget {
  includeArchived?: boolean;
  limit?: number;
}

export interface LumosSessionReadParams extends LumosTaskTarget {
  deliveryKind?: LumosDeliveryKind;
  messageLimit?: number;
  afterSeq?: number;
}

export interface LumosSessionMessagesParams extends LumosTaskTarget {
  afterMessageId?: string;
  limit?: number;
}

export interface LumosSessionEventsParams extends LumosTaskTarget {
  afterSeq?: number;
  limit?: number;
}

export interface LumosSessionSetModelParams extends LumosTaskTarget {
  model: ModelSelection;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface LumosSessionSetThoughtLevelParams extends LumosTaskTarget {
  thoughtLevel?: string;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface LumosSessionSetModeParams extends LumosTaskTarget {
  mode: LumosSessionMode;
  expectedRevision?: number;
}

export interface LumosSessionRespondProviderRuntimeHeadersParams extends LumosTaskTarget {
  requestId: string;
  response: ProviderRuntimeHeadersUiResponse;
}

export interface LumosSessionSubscribeParams extends LumosTaskTarget {
  deliveryKind: LumosDeliveryKind;
  afterSeq?: number;
  includeSnapshot?: boolean;
  eventCoalescing?: {
    mode: "background-summary";
    intervalMs?: number;
  };
}

export type LumosSessionServiceEvent =
  | { type: "session.event"; event: LumosSessionEvent }
  | { type: "state.updated"; notification: LumosStateUpdatedNotification }
  | { type: "permission.request"; request: LumosPermissionRequestParams }
  | { type: "userInput.request"; request: LumosUserInputRequestParams }
  | {
      type: "userInput.response";
      requestId: string;
      response: LumosUserInputResponse;
    }
  | { type: "providerRuntimeHeaders.request"; request: LumosProviderRuntimeHeadersRequestParams }
  | { type: "snapshot"; snapshot: LumosSessionStateSnapshot };

export interface LumosSessionInitializeResult {
  available: boolean;
  workspaceKey: string;
  protocolName?: string;
  protocolVersion?: number;
  transportKind?: "stdio" | "websocket";
  reason?: string;
  reasonCode?: "provider_not_ready";
}

export interface LumosSessionWorkspaceRuntimeIdentity {
  generation: number;
  identity: string;
  processId?: number;
  workspaceKey: string;
}

export interface ILumosSessionService {
  initializeWorkspace(params: LumosSessionWorkspaceTarget): Promise<LumosSessionInitializeResult>;
  getWorkspaceRuntimeIdentity(
    params: LumosSessionWorkspaceTarget,
  ): Promise<LumosSessionWorkspaceRuntimeIdentity>;
  readWorkspacePresentation(
    params: LumosSessionReadWorkspacePresentationParams,
  ): Promise<LumosWorkspacePresentation>;
  createSession(params: LumosSessionCreateParams): Promise<LumosSessionStateSnapshot>;
  resumeSession(params: LumosSessionResumeParams): Promise<LumosSessionStateSnapshot>;
  listSessions(params: LumosSessionListParams): Promise<LumosSessionInfo[]>;
  readSession(params: LumosSessionReadParams): Promise<LumosSessionStateSnapshot>;
  readSessionMessages(params: LumosSessionMessagesParams): Promise<LumosMessageWithParts[]>;
  readSessionEvents(params: LumosSessionEventsParams): Promise<LumosSessionEvent[]>;
  promoteDeferredDraftSession(params: LumosTaskTarget): Promise<void>;
  closeSession(params: LumosTaskTarget): Promise<void>;
  closeDeferredDraftSession(params: LumosTaskTarget): Promise<boolean>;
  setModel(params: LumosSessionSetModelParams): Promise<LumosSessionStateSnapshot>;
  setThoughtLevel(params: LumosSessionSetThoughtLevelParams): Promise<LumosSessionStateSnapshot>;
  setMode(params: LumosSessionSetModeParams): Promise<LumosSessionStateSnapshot>;
  respondProviderRuntimeHeaders(
    params: LumosSessionRespondProviderRuntimeHeadersParams,
  ): Promise<void>;
  // M5 删波次 2：onDynamicSessionEvent（旧 session/subscribe 词表的 renderer 订阅面）
  // 已删除——v4 UI 走 agentService 的 conversation/sessions-index 帧通道，
  // 该方法在 renderer 侧已无任何调用者（grep packages/ui packages/desktop 为零）。
}

export const ILumosSessionService = createServiceDescriptor<ILumosSessionService>(
  ServiceChannels.LumosSession,
);
