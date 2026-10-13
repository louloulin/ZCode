import { z } from "zod";

/**
 * Lumos agent 提供方的单一真源。
 *
 * 类型 LumosProvider、运行时 schema lumosProviderSchema 都从这里派生,
 * 避免各处内联 z.enum([...]) 副本随新增/删除 provider 漂移。
 * 本模块只依赖 zod(叶子),可被 validation / lumos-protocol 等无环引用。
 */
export const LUMOS_PROVIDERS = ["glm"] as const;

export const lumosProviderSchema = z.enum(LUMOS_PROVIDERS);

export type LumosProvider = (typeof LUMOS_PROVIDERS)[number];
