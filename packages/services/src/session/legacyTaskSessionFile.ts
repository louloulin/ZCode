import type { LumosSessionFile, LumosTaskMeta } from "@lumos/shared";
import { lumosSessionFileSchema, lumosTaskMetaSchema, lumosTaskModeSchema } from "@lumos/shared";

export type LegacyTaskSessionFile = Omit<LumosSessionFile, "meta"> & {
  meta: Omit<LumosTaskMeta, "mode"> & { mode?: LumosTaskMeta["mode"] };
};

const legacyTaskSessionFileSchema = lumosSessionFileSchema.extend({
  // Claude 原生迁移会按清洗路径删除 meta.mode。
  // legacy snapshot 读取/写入仍要校验其它必需字段，但不能再强制把被过滤字段补回文件。
  meta: lumosTaskMetaSchema.extend({
    mode: lumosTaskModeSchema.optional(),
  }),
});

export function parseLegacyTaskSessionFile(input: unknown): LegacyTaskSessionFile {
  return legacyTaskSessionFileSchema.parse(input);
}

export function safeParseLegacyTaskSessionFile(input: unknown) {
  return legacyTaskSessionFileSchema.safeParse(input);
}
