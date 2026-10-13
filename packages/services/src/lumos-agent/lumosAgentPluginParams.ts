import type {
  ModelSelection,
  LumosAgentMcpServer,
  LumosAutomationScheduleRule,
  LumosMcpListMode,
} from "@lumos/shared";
import type { McpAppsAppToolCallResult, McpAppsAppToolDescriptor } from "@lumos/shared/mcp-apps";

export interface LumosAgentWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  /** 远程 workspace 的运行时会话身份；只用于隔离/路由，不能替代 workspacePath。 */
  remoteSessionId?: string;
}

export interface LumosAgentPluginViewParams extends LumosAgentWorkspaceTarget {
  configScope?: "user" | "workspace";
}

export interface LumosAgentListMcpServerStatusesParams extends LumosAgentWorkspaceTarget {
  mcpServers?: LumosAgentMcpServer[];
  mode?: LumosMcpListMode;
}

export interface LumosAgentAddPluginMarketplaceParams extends LumosAgentWorkspaceTarget {
  dryRun?: boolean;
  operationId?: string;
  source: string;
}

export interface LumosAgentRemovePluginMarketplaceParams extends LumosAgentWorkspaceTarget {
  marketplace: string;
}

export interface LumosAgentUpdatePluginMarketplaceParams extends LumosAgentWorkspaceTarget {
  marketplace?: string;
  operationId?: string;
}

export interface LumosAgentInstallPluginParams extends LumosAgentWorkspaceTarget {
  dryRun?: boolean;
  marketplace: string;
  operationId?: string;
  pluginName: string;
  scope?: "user" | "workspace";
}

export interface LumosAgentCancelPluginOperationParams {
  operationId: string;
}

export interface LumosAgentUninstallPluginParams extends LumosAgentWorkspaceTarget {
  marketplace?: string;
  pluginId?: string;
  pluginName?: string;
  removeCache?: boolean;
}

export interface LumosAgentUpdatePluginParams extends LumosAgentWorkspaceTarget {
  pluginId?: string;
  marketplace?: string;
}

export interface LumosAgentRestoreBuiltinPluginParams extends LumosAgentWorkspaceTarget {
  pluginId: string;
}

export interface LumosAgentConfigurePluginParams extends LumosAgentWorkspaceTarget {
  clearOptionKeys?: string[];
  dryRun?: boolean;
  options: Record<string, unknown>;
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface LumosAgentResetPluginConfigParams extends LumosAgentWorkspaceTarget {
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface LumosAgentValidatePluginParams extends LumosAgentWorkspaceTarget {
  marketplace?: string;
  pluginName?: string;
  source?: string;
}

export interface LumosAgentDescribePluginParams extends LumosAgentWorkspaceTarget {
  marketplace: string;
  pluginName: string;
}

export interface LumosAgentSetPluginEnabledParams extends LumosAgentWorkspaceTarget {
  enabled: boolean;
  operationId?: string;
  pluginId: string;
  scope?: "user" | "workspace";
}

// Plugin 对话引用 catalog：
// 带 sessionId → session-owned 冻结 catalog（必须路由到持有该 session 的 workspace client）；
// 不带 → workspace 当前 catalog（新建草稿 Picker）。
export interface LumosAgentPluginReferenceCatalogParams extends LumosAgentWorkspaceTarget {
  sessionId?: string;
}

// Composer Skill catalog：与 Plugin 引用相同，以 sessionId 区分 workspace 当前目录和
// resident Session runtime 快照；不参与 Settings 管理目录。
export interface LumosAgentSkillReferenceCatalogParams extends LumosAgentWorkspaceTarget {
  sessionId?: string;
}

/** 插件 UI：UI 发起的 `ui://` 资源读取。 */
export interface LumosAgentReadMcpResourceParams extends LumosAgentWorkspaceTarget {
  instance: import("@lumos/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  uri: string;
}

/** 插件 UI 页面发起的 `resources/read`；参数与 readMcpResource 同形，结果受 8 MiB 与 mimeType 白名单约束。 */
export type LumosAgentReadMcpResourceForUiParams = LumosAgentReadMcpResourceParams;

/** 插件 UI：UI 回调本插件工具；不进审批流，归属由 agent 侧 catalog fail closed。 */
export interface LumosAgentCallMcpToolForUiParams extends LumosAgentWorkspaceTarget {
  instance: import("@lumos/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  toolName: string;
  arguments?: Record<string, unknown>;
  /** 宿主生成的调用 id，配合 cancelMcpToolCallForUi。 */
  callId: string;
}
/** 插件 UI 页面发起的 resources/list、resources/templates/list、subscribe、unsubscribe。 */
export interface LumosAgentListMcpResourcesForUiParams extends LumosAgentWorkspaceTarget {
  instance: import("@lumos/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  cursor?: string;
}
/** App-Provided Tools：实例身份 = 会话 + 沙箱作用域 + 代际。 */
export interface LumosAgentAppToolInstanceForUiParams extends LumosAgentWorkspaceTarget {
  instance: import("@lumos/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  scopeId: string;
  generation: number;
}
export interface LumosAgentRegisterAppToolsForUiParams extends LumosAgentAppToolInstanceForUiParams {
  tools: McpAppsAppToolDescriptor[];
}
export interface LumosAgentAppToolCallForUiParams extends LumosAgentAppToolInstanceForUiParams {
  callId: string;
}
export interface LumosAgentResolveAppToolCallForUiParams extends LumosAgentAppToolCallForUiParams {
  result?: McpAppsAppToolCallResult;
  error?: { message: string };
}
export interface LumosAgentMcpResourceSubscriptionForUiParams extends LumosAgentWorkspaceTarget {
  instance: import("@lumos/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  scopeId: string;
  generation: number;
  uri: string;
}
export interface LumosAgentCancelMcpToolCallForUiParams extends LumosAgentWorkspaceTarget {
  instance: import("@lumos/shared/mcp-apps").McpAppInstance;
  sessionId: string;
  pluginId: string;
  serverName: string;
  callId: string;
}
export interface LumosAgentResolveSuggestedPluginReferenceParams extends LumosAgentWorkspaceTarget {
  stableId: string;
  operationId: string;
  clientMode: "desktop-continuous" | "web-remote-replayable";
  deliveryKind: "desktop-continuous" | "web-remote-replayable";
}

// ---- 定时任务(automation)管理参数 ----

export interface LumosAgentCreateAutomationParams extends LumosAgentWorkspaceTarget {
  title: string;
  cronExpr: string;
  relativeDelayMinutes?: number;
  prompt: string;
  modelSelection?: ModelSelection;
  mode?: string;
  recurring?: boolean;
  maxRuns?: number;
  endAt?: number;
  scheduleRule?: LumosAutomationScheduleRule;
}

export interface LumosAgentUpdateAutomationParams extends LumosAgentWorkspaceTarget {
  automationId: string;
  title?: string;
  cronExpr?: string;
  prompt?: string;
  modelSelection?: ModelSelection | null;
  mode?: string | null;
  recurring?: boolean;
  maxRuns?: number | null;
  endAt?: number | null;
  scheduleRule?: LumosAutomationScheduleRule | null;
  scheduleEditedByUser?: boolean;
}

export interface LumosAgentAutomationIdParams extends LumosAgentWorkspaceTarget {
  automationId: string;
}

export interface LumosAgentSetAutomationEnabledParams extends LumosAgentWorkspaceTarget {
  automationId: string;
  enabled: boolean;
}

export interface LumosAgentDeleteAutomationRunParams extends LumosAgentWorkspaceTarget {
  runId: string;
}
