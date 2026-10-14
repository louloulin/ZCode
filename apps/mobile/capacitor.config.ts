import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Lumos 手机端（Android + iOS）共用配置。
 *
 * 设计原则与 packages/android 的既有壳一致：
 *   - 壳只负责「扫码 / 深链 → URL 白名单校验 → 承载现有 /remote 页面」
 *   - 不重写 Agent、relay 或 RPC 协议；手机端只 attach 到已存在的 host
 *
 * www/ 里只有一层极薄的 native 桥（扫码、深链、最近链接），
 * 真正的界面始终是 packages/web 产出的 /remote bundle。
 */
const config: CapacitorConfig = {
  appId: "cc.lumosai.mobile",
  appName: "Lumos",
  webDir: "www",
  // 壳自身不打包业务 UI：它校验完 URL 后会 location.replace 到远端 /remote 页面，
  // 因此这里保持默认的本地 webDir 即可（www/shell.js 即桥接层）。
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
