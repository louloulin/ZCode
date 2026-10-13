import type { WorkspacePurpose, LumosTaskMeta } from "@lumos/shared";

export type LumosTaskListKind = "pinned" | "archived" | "timeline" | "active";
export type LumosTaskListSortBy = "created" | "updated";

export interface LumosTaskListWorkspaceScope {
  workspacePath: string;
  workspaceIdentity?: string;
  workspacePurpose?: WorkspacePurpose;
}

export interface LumosTaskListQuery {
  kind: LumosTaskListKind;
  workspaceScopes: LumosTaskListWorkspaceScope[];
  sortBy: LumosTaskListSortBy;
  search?: string;
  limit?: number;
}

export type LumosTaskListItem = LumosTaskMeta & {
  searchSnippet?: string;
  searchSnippets?: string[];
};

export interface LumosTaskListResult {
  items: LumosTaskListItem[];
  total: number;
  hasMore: boolean;
}

export type LumosTaskGroupColor =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple";

export interface LumosTaskGroup {
  id: string;
  title: string;
  color: LumosTaskGroupColor;
  createdAt: number;
  updatedAt: number;
}

export interface LumosGroupedTaskRef {
  workspacePath: string;
  workspaceIdentity?: string;
  taskId: string;
}

export type LumosGroupedTaskViewTopLevelNodeRef =
  | { type: "group"; groupId: string }
  | { type: "task"; task: LumosGroupedTaskRef };

export type LumosGroupedTaskViewNode =
  | {
      type: "group";
      group: LumosTaskGroup;
      tasks: LumosTaskListItem[];
      sortOrder?: number;
    }
  | {
      type: "task";
      task: LumosTaskListItem;
      sortOrder?: number;
    };

export interface LumosGroupedTaskView {
  nodes: LumosGroupedTaskViewNode[];
}

export interface LumosGroupedTaskViewQuery {
  workspaceScopes: LumosTaskListWorkspaceScope[];
  includeAllWorkspaces?: boolean;
}

// ── grouped 原始结构（不 join tasks 表）──
// grouped 视图的任务数据源迁到 sessions-index 后，服务端只提供分组结构
// （task_groups / task_group_members / task_group_view_node_orders），
// 由客户端与 sessions-index 会话做 join。

/** 组成员引用（不含任务 meta；task 内容由 sessions-index 提供）。 */
export interface LumosGroupedTaskViewStructureMember {
  groupId: string;
  /** 服务端口径 workspaceKey（resolveWorkspaceKey：identity ?? path），join 匹配键。 */
  workspaceKey: string;
  workspacePath: string;
  workspaceIdentity?: string;
  taskId: string;
  /** null = 尚未落 sort_order（新加入组）；客户端按 addedAt 降序补内存序。 */
  sortOrder: number | null;
  addedAt: number;
}

/** 顶层节点排序（task_group_view_node_orders，node_key 已解析为结构化引用）。 */
export type LumosGroupedTaskViewStructureTopOrder =
  | { type: "group"; groupId: string; sortOrder: number }
  | { type: "task"; workspaceKey: string; taskId: string; sortOrder: number };

export interface LumosGroupedTaskViewStructure {
  /** 已按 workspaceScopes 可见性过滤的 group（bootstrap workspace group 只在其 workspace 可见）。 */
  groups: LumosTaskGroup[];
  /** 全量组成员（含不可见 group 的成员——顶层排除规则需要全量判断）。 */
  members: LumosGroupedTaskViewStructureMember[];
  topLevelOrders: LumosGroupedTaskViewStructureTopOrder[];
}

export interface LumosGroupedTaskViewOrderInput {
  workspaceScopes: LumosTaskListWorkspaceScope[];
  topLevelNodes: LumosGroupedTaskViewTopLevelNodeRef[];
  groups: Array<{
    groupId: string;
    taskRefs: LumosGroupedTaskRef[];
  }>;
}

export interface LumosWorkspaceEventSubscriptionParams {
  workspacePath: string;
  workspaceIdentity?: string;
}
