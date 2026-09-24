# ZCode AI Agent 集成方案

> 文档版本: v2.1 (2026-09-25)
> 目标: 将 ZCode 基于现有协议接入 Codex、Pi、Claude Code，打造最佳 AI Agent Desktop 体验
> 重要更新: Pi Agent 和 Claude Code 已切换为 ACP (Agent Communication Protocol) 方式接入，不再使用 MCP

## 概述

ZCode 正在演进为一款 AI Agent Desktop 产品，支持多种顶级 AI 编码助手。本文档描述如何将 OpenAI Codex、Pi Agent (智谱AI) 和 Claude Code 无缝集成到 ZCode 中。

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                    ZCode Desktop                     │
├─────────────────────────────────────────────────────┤
│  Agent Provider Registry                           │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │  Pi Agent   │ │Claude Code   │ │OpenAI Codex │ │
│  │  Adapter    │ │  Adapter     │ │  Adapter    │ │
│  │   (ACP)     │ │   (ACP)      │ │   (MCP)     │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬─────┘ │
│         │                │                │        │
│  ┌──────┴────────────────┴────────────────┴─────┐  │
│  │         HTTP Client (ACP/ZCode Protocol)      │  │
│  └──────────────────────────────────────────────┘  │
│         │                │                │        │
│  ┌──────┴───────┐ ┌──────┴───────┐ ┌──────┴─────┐ │
│  │  Pi Agent   │ │ Claude Code  │ │ OpenAI      │ │
│  │  API        │ │ API         │ │ Responses   │ │
│  │ (pi.ai)     │ │ (Anthropic) │ │ API         │ │
│  └──────────────┘ └──────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

## 架构说明

### 通信协议选择

根据需求分析，Claude Code 和 Pi Agent **不使用 MCP 接入**，而是采用 **ACP (Agent Communication Protocol)** 方式接入：

- **Pi Agent (ACP)**: 通过 HTTP 直接调用 Pi Agent API (https://api.z.ai/api/anthropic)
- **Claude Code (ACP)**: 通过 HTTP 直接调用 Claude Code API (https://api.anthropic.com/v1)
- **OpenAI Codex (MCP)**: 通过 MCP 连接 OpenAI Responses API

ACP (ZCode Protocol) 是 ZCode 的标准通信协议，提供：
- 会话管理 (session/create, session/send)
- 工具调用 (tool/updated)
- 事件流 (session.events)
- 权限管理 (permission/request)

## 已实现的改造

### 1. Provider 配置模板 (config/provider/zcode-builtin.json)

✅ **Pi Agent Provider** (templateId: `pi-agent`)
- API 类型: Anthropic Messages
- Base URL: `https://api.minimaxi.com/anthropic` (使用 MiniMax API)
- 支持模型: `pi-3-mini-highspeed`, `pi-3-mini`, `pi-3-highspeed`, `pi-3`
- 图标: zai (与智谱 AI 相同)

✅ **Claude Code Provider** (templateId: `claude-code`)
- API 类型: Anthropic Messages
- Base URL: `https://api.minimaxi.com/anthropic` (使用 MiniMax API)
- 支持模型: `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5`, `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`
- 图标: anthropic

✅ **OpenAI Codex Provider** (templateId: `openai-codex`)
- API 类型: OpenAI Responses
- Base URL: `https://api.openai.com/v1`
- 支持模型: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-4`, `o3`, `o3-mini`, `o4-mini`, `o1`, `o1-mini`, `o1-pro`, `gpt-5.3-codex`, `gpt-5.3-codex-spark`
- 图标: openai

### 2. Model Rules 配置

✅ 已添加 100 条 modelRules (原 84 条，新增 16 条):
- Pi 模型规则 (4 条): pi-3-mini-highspeed, pi-3-mini, pi-3-highspeed, pi-3
- Claude Code 模型规则 (3 条): claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5
- OpenAI Codex 模型规则 (9 条): gpt-4o, gpt-4-turbo, gpt-4, o3, o3-mini, o4-mini, o1, o1-mini, o1-pro

✅ 已添加 79 条 modelApiRules (原 72 条，新增 7 条):
- Pi Anthropic Messages API 规则 (1 条)
- Claude Code Anthropic Messages API 规则 (3 条)
- OpenAI Codex Responses API 规则 (3 条)

✅ 已添加 270 条 templateModelRules (原 244 条，新增 26 条):
- pi-agent: 4 条
- claude-code: 10 条
- openai-codex: 12 条

### 3. Adapter 实现 (ACP-based for Pi & Claude Code)

✅ **Pi Agent Adapter (ACP)** (`apps/zcode-cli/packages/adapters/src/provider/pi-agent.ts`)
- `createPiAgentAdapter()`: 创建 Pi Agent ACP 适配器
- `createPiAgentAcpServerConfig()`: 创建 ACP 服务器配置
- `PiAgentSessionManager`: ACP 会话管理
- HTTP 客户端直接调用 Pi Agent API
- 工具映射: ZCode → Pi Agent

✅ **Claude Code Adapter (ACP)** (`apps/zcode-cli/packages/adapters/src/provider/claude-code.ts`)
- `createClaudeCodeAdapter()`: 创建 Claude Code ACP 适配器
- `createClaudeCodeAcpServerConfig()`: 创建 ACP 服务器配置
- `ClaudeCodeSessionManager`: ACP 会话管理
- HTTP 客户端直接调用 Anthropic Messages API

✅ **OpenAI Codex Adapter (MCP)** (`apps/zcode-cli/packages/adapters/src/provider/openai-codex.ts`)
- `createOpenAICodexAdapter()`: 创建 OpenAI Codex 适配器
- `createOpenAICodexMcpServerConfig()`: 创建 Responses API 配置
- `OpenAICodexSessionManager`: 会话管理
- `buildCodexResponsesRequest()`: 构建 Codex 请求

✅ **统一 Provider Registry** (`apps/zcode-cli/packages/adapters/src/provider/registry.ts`)
- `AgentProviderRegistry`: 统一管理所有 Provider
- `createAgentProviderRegistry()`: 工厂函数
- `resolveProviderFromModel()`: 根据模型 ID 解析 Provider 类型
- `BUILTIN_PROVIDER_METADATA`: Provider 元数据

## 实施计划

### Phase 1: 配置与基础架构 ✅ 已完成
- [x] Provider 模板配置
- [x] Model Rules 配置
- [x] Adapter 基础框架
- [x] Provider Registry

### Phase 2: ACP 集成 (Pi & Claude Code) ✅ 已完成
- [x] 实现 Pi Agent ACP HTTP 客户端连接
- [x] 实现 Claude Code ACP HTTP 客户端连接
- [x] 工具调用协议适配 (Anthropic Messages API 格式)
- [x] 认证流程集成 (API Key 认证)

### Phase 3: MCP 集成 (OpenAI Codex) ✅ 已完成
- [x] 实现 OpenAI Codex MCP 客户端连接
- [x] 实现 OpenAI Codex App Server JSON-RPC 客户端
- [x] 会话管理与状态持久化
- [x] 工具调用与文件操作集成

### Phase 4: UI/UX 集成
- [ ] Provider 选择器 UI
- [ ] 会话管理面板
- [ ] 工具调用可视化

## 关键技术细节

### Provider 类型映射

| ZCode Provider | 通信协议 | 底层 API | 认证方式 |
|---------------|---------|---------|---------|
| pi-agent | ACP (HTTP) | Anthropic Messages (Zhipu) | API Key |
| claude-code | ACP (HTTP) | Anthropic Messages | API Key |
| openai-codex | MCP (HTTP) | OpenAI Responses | API Key |

### 工具映射 (ACP-based)

#### Pi Agent
| ZCode 工具 | Pi Agent API 工具 |
|-----------|------------------|
| read_file | read_file |
| write_file | write_file |
| bash | bash |

#### Claude Code
| ZCode 工具 | Claude Code 工具 |
|-----------|----------------|
| read_file | Read |
| write_file | Write |
| bash | Bash |
| web_search | WebSearch |

#### OpenAI Codex
| ZCode 工具 | Codex 工具 |
|-----------|-----------|
| read_file | read |
| write_file | write |
| bash | bash |
| web_search | browser_search |

## 验收标准

1. ✅ Provider 模板可被 ZCode 识别并显示
2. ✅ Model Rules 正确应用模型配置
3. ✅ Adapter 可以连接到对应的 API
4. ✅ ACP 连接可以正常工作 (Pi & Claude Code)
5. ✅ MCP 连接可以正常工作 (OpenAI Codex)
6. ✅ 工具调用可以正常工作
7. ✅ Provider 图标已添加 (packages/ui/src/assets/provider-icons/logo-pi.svg)
8. ✅ i18n 字符串已添加 (zh-CN.ts, en-US.ts)
9. ✅ Pi Agent 和 Claude Code 使用 ACP 而非 MCP 接入

## 关键文件索引

| 文件 | 作用 |
|------|------|
| `config/provider/zcode-builtin.json` | Provider 和 Model 配置 (rev: 33) |
| `apps/zcode-cli/packages/adapters/src/provider/pi-agent.ts` | Pi Agent 适配器 |
| `apps/zcode-cli/packages/adapters/src/provider/claude-code.ts` | Claude Code 适配器 |
| `apps/zcode-cli/packages/adapters/src/provider/openai-codex.ts` | OpenAI Codex 适配器 |
| `apps/zcode-cli/packages/adapters/src/provider/registry.ts` | 统一 Provider Registry |
| `apps/zcode-cli/packages/adapters/src/provider/index.ts` | Adapter 导出索引 |
| `packages/provider/src/config/schema.ts` | Provider 配置 Schema |
| `packages/provider/src/config/rule-data-schema.ts` | Rule 数据 Schema |
| `packages/ui/src/assets/provider-icons/logo-pi.svg` | Pi Agent 图标 |
| `packages/ui/src/i18n/locales/zh-CN.ts` | 中文 i18n 翻译 |
| `packages/ui/src/i18n/locales/en-US.ts` | 英文 i18n 翻译 |
