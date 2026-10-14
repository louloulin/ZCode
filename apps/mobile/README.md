# Lumos Mobile（Android + iOS 一套代码）

一个共享的**薄壳**，用**同一套代码**产出 Android 与 iOS 应用；界面与业务逻辑**完全复用**现有的
`/remote` Web 客户端，不重写 Agent、relay 或 RPC 协议。

## 设计

沿用 `packages/android`（旧 Kotlin 壳）已经验证过的思路，但把"只写一次"的部分真正抽了出来：

| 层 | 位置 | 是否共用 |
| --- | --- | --- |
| URL 白名单策略 | `src/shell/url-policy.ts` | ✅ 两端共用（从 `RemoteControlUrlPolicy.kt` 1:1 移植） |
| 扫码 / 深链 / 最近连接 | `src/shell/shell.ts`、`src/shell/recent-links.ts` | ✅ 两端共用（Capacitor 注入平台实现） |
| 远控界面 | `packages/web` 的 `/remote` bundle | ✅ 完全复用（壳只做校验 + 跳转） |
| 原生工程 | `android/`、`ios/` | 由 Capacitor 生成，一般不需要手改 |
| 深链清单 / 权限 / 签名 | 各平台配置 | 每端一处（见下） |

数据流：

```text
扫码 / 深链 / 粘贴
      ↓
url-policy.ts 校验（生产：仅 https://lumosai.cc/remote）
      ↓
shell.ts 记录最近连接 + 申请屏幕唤醒
      ↓
location.replace(远端 /remote 页面)   ← 现有 Web 客户端，不重写
```

## 命令

```sh
npm install
npm run build          # esbuild 打包 src/shell → www/shell.js
npm run typecheck      # tsc --noEmit
npm run sync           # build + cap sync（把 www 与插件同步进 android/、ios/）

npm run open:android   # 用 Android Studio 打开
npm run open:ios       # 用 Xcode 打开（需 macOS）
```

构建调试包时可放开局域网/本机远控地址：

```sh
LUMOS_MOBILE_DEBUG=1 npm run sync
```

生产构建必须**不带**该变量（否则壳会允许 localhost/局域网 `/remote`，失去白名单意义）。

## 构建环境要求

| 平台 | 需要 | 本机（Linux）能否出包 |
| --- | --- | --- |
| Android | JDK 17+、Android SDK（AGP/Gradle 由工程自带） | ✅ 装齐即可 |
| iOS | **macOS + Xcode**（以及 Apple 开发者账号签名） | ❌ 不能 |

> 当前开发机是 Linux：无 JDK / Android SDK / Xcode / hvigor，因此**两个平台都还出不了包**；
> 代码与工程已就绪，补齐工具链即可构建。iOS 必须在 macOS 上执行 `npm run sync && npm run open:ios`。

## iOS 依赖管理：用 CocoaPods（而非 Capacitor 8 默认的 SPM）

Capacitor 8 默认给 iOS 用 SPM，但 `@capacitor-mlkit/barcode-scanning` **没有提供 `Package.swift`**，
`cap sync` 会直接报：

```text
[warn] @capacitor-mlkit/barcode-scanning does not have a Package.swift
[warn] Some installed Capacitor plugins are not compatible with SPM
```

因此本工程用 **CocoaPods** 生成：

```sh
npx cap add ios --packagemanager CocoaPods
```

结果：`ios/App/Podfile` 中已声明三个插件（含 `CapacitorMlkitBarcodeScanning`），
Xcode 用 `App.xcworkspace` 打开。**在 macOS 上首次构建前需执行 `pod install`**（未装 CocoaPods 会失败）。

> 备选：若不想引入 CocoaPods，可换一个提供 SPM 支持的扫码插件，或自行给该插件补 `Package.swift`。

## 域名侧前置条件（否则深链退化）

- **Android App Link**：`https://lumosai.cc/.well-known/assetlinks.json` 需包含
  `cc.lumosai.mobile` 的签名指纹，并把该 intent-filter 的 `autoVerify` 置为生效。
- **iOS Universal Links**：`https://lumosai.cc/.well-known/apple-app-site-association` 需包含
  `appID: <TeamID>.cc.lumosai.mobile` 与 `/remote*` 路径；同时在 Apple Developer 的 App ID 上勾选
  Associated Domains（`ios/App/App/App.entitlements` 已声明 `applinks:lumosai.cc`）。

未配置时，自定义 scheme（`lumos://remote?...`）仍然可用，只是从浏览器点击 https 链接不会直接唤起 App。

## 与 `packages/android` 的关系

`packages/android` 是更早的 **Android-only Kotlin 壳**（1277 行，自带 CameraX + MLKit + 前台服务）。
本目录是它的**一套代码版**：同一套逻辑同时服务 Android 与 iOS，扫码统一走
`@capacitor-mlkit/barcode-scanning`（Android=MLKit，iOS=Apple Vision），无需分别写 Kotlin 与 Swift。

建议：新功能只在 `apps/mobile` 迭代；`packages/android` 作为参考实现保留，待 iOS 侧验证通过后再决定退役。

## 状态

- ✅ 共享壳已实现并**通过 `tsc --noEmit` 与 esbuild 打包**
- ✅ `android/` 与 `ios/` 原生工程已生成（`applicationId` / bundle id 均为 `cc.lumosai.mobile`）
- ✅ Android 深链（`lumos://remote`、`https://lumosai.cc/remote`）与 CAMERA 权限已写入 manifest
- ✅ iOS 已加 `NSCameraUsageDescription`、自定义 scheme、Associated Domains entitlement
- ⏳ 未验证：真机扫码、真机远控、WKWebView 兼容性、两端实际出包（受限于当前 Linux 环境与账号）

## 不在本目录内的事

- 不实现业务界面（复用 `packages/web`）
- 不创建 Agent runtime / local host / SSH/WSL/Docker session：手机端只 attach 到**已存在**的 host
