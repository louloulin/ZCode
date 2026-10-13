import type { LumosRuntimeEnv } from "./runtimeEnv.js";

export type LumosEnv = "test" | "production";
/** 安装包身份：决定应用名、app id、Electron 数据目录与更新策略；与后端环境 `LumosEnv` 是两个轴。 */
export type LumosProductFlavor = "production" | "preview";
export type ArmsRumEnv = "local" | "prod";

// 非构建环境（如 e2e 测试的 mocha）下 define 不存在，用 typeof 检查 + fallback 避免 ReferenceError
declare const __LUMOS_ENV__: string;
declare const __LUMOS_PRODUCT_FLAVOR__: string;
declare const __LUMOS_ARMS_RUM_ENDPOINT__: string;
declare const __LUMOS_TELEMETRY_REPORT_ENDPOINT__: string;
declare const __LUMOS_AUTO_UPDATE_ENABLED__: boolean;

export function normalizeLumosEnv(value: string | undefined): LumosEnv {
  return value?.trim().toLowerCase() === "production" ? "production" : "test";
}

export const LUMOS_ENV = normalizeLumosEnv(
  typeof __LUMOS_ENV__ !== "undefined" ? __LUMOS_ENV__ : undefined,
);

/**
 * 身份缺省跟随后端环境（test → preview，production → production）。
 * 桌面构建通过 `LUMOS_PREVIEW_IDENTITY=1` 显式注入 preview，得到连接生产后端的 Preview 包；
 * 未注入 define 的 bundle（web、CLI、测试）沿用旧的单轴语义。
 */
export function normalizeLumosProductFlavor(
  value: string | undefined,
  lumosEnv: LumosEnv,
): LumosProductFlavor {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "production" || normalized === "preview") {
    return normalized;
  }
  return lumosEnv === "production" ? "production" : "preview";
}

export const LUMOS_PRODUCT_FLAVOR = normalizeLumosProductFlavor(
  typeof __LUMOS_PRODUCT_FLAVOR__ !== "undefined" ? __LUMOS_PRODUCT_FLAVOR__ : undefined,
  LUMOS_ENV,
);
export const LUMOS_APP_VERSION_ENV = "LUMOS_APP_VERSION" as const;
export const LUMOS_BUILD_COMMIT_ID_ENV = "LUMOS_BUILD_COMMIT_ID" as const;

// ── 运行时环境变量（不经过编译打包，启动时从 process.env 读取） ──
// 启用调试模式，值为 inspect-brk 的端口号，如 LUMOS_DEBUG=9230
export const RUNTIME_LUMOS_DEBUG =
  typeof process !== "undefined" ? process.env.LUMOS_DEBUG : undefined;

// ── 构建期可选能力（见 docs/desktop/build-time-optional-capabilities.md），未注入时一律关闭 ──
/** ARMS RUM 上报地址；为空时 SDK 以 enable=false 初始化，不产生上报。 */
export const LUMOS_ARMS_RUM_ENDPOINT: string =
  typeof __LUMOS_ARMS_RUM_ENDPOINT__ !== "undefined" ? __LUMOS_ARMS_RUM_ENDPOINT__ : "";
/** 事件上报（数仓）地址；为空时不上报。 */
export const LUMOS_TELEMETRY_REPORT_ENDPOINT: string =
  typeof __LUMOS_TELEMETRY_REPORT_ENDPOINT__ !== "undefined"
    ? __LUMOS_TELEMETRY_REPORT_ENDPOINT__
    : "";
/** 桌面自动更新是否启用。 */
export const LUMOS_AUTO_UPDATE_ENABLED: boolean =
  typeof __LUMOS_AUTO_UPDATE_ENABLED__ !== "undefined" ? __LUMOS_AUTO_UPDATE_ENABLED__ : false;

/** 将本地运行态与编译期 LUMOS_ENV 映射为 ARMS 控制台识别的上报环境标签 */
export function mapLumosEnvToArmsRumEnv(runtimeEnv: LumosRuntimeEnv): ArmsRumEnv {
  return runtimeEnv !== "development" && LUMOS_ENV === "production" ? "prod" : "local";
}
