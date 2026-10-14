# 手机版构建计划（Android + iOS + 鸿蒙）

- 日期：2026-10-14
- 范围：为 Lumos 增加手机端发行形态，覆盖 **Android / iOS / HarmonyOS（鸿蒙 NEXT）**
- 前提：**最大化复用现有代码**，不重写 Agent、relay 与 RPC 协议

---

## 0. 结论先行

**推荐方案：一个 Web 客户端 + 三套"薄壳"，而不是三套原生 App。**

现有仓库已经把这条路走通了一半：`packages/android` 就是一个 **WebView 薄壳**（1277 行 Kotlin/Compose），它不实现业务，只做"扫码/深链 → 校验 URL → 用 WebView 承载现有 `/remote` 手机远控页面"。

因此新增 iOS 与鸿蒙时，**不需要重写界面**：三端各自只写一层"扫码 + 深链 + WebView + 保活"的壳，UI 与业务逻辑 100% 复用 `packages/web` 产出的 `/remote` bundle。

**唯一必须接受的现实**：鸿蒙 NEXT 已移除 AOSP/Android 兼容层，Android APK 在鸿蒙 NEXT 上**无法作为一等应用运行**，必须单独出一个 ArkTS/HAP（Huawei AppGallery 分发）。也就是说"一套 Android 代码同时覆盖鸿蒙"不可行；但"一套 **Web** 代码覆盖三端"完全可行。

---

## 1. 现状盘点（已验证）

### 1.1 已有的手机端资产

| 资产 | 位置 | 状态 |
| --- | --- | --- |
| Android 薄壳 | `packages/android`（独立 Gradle 工程，**不在 pnpm workspace**） | 已有，1277 行 |
| Android 设计说明 | `docs/mobile-remote-control-android.md` | 已有 29 行 |
| 远控重连设计 | `docs/superpowers/plans/2026-05-06-mobile-remote-reconnect.md` | 已有 |
| 远控 Web 部署 | `docs/superpowers/plans/2026-06-04-web-remote-{test,v3}-static-deployment.md` | 已有 |

Android 壳构成（`packages/android/app/src/main/java/com/example/lumos_mobile/`）：

- `MainActivity.kt` — Compose 入口，处理 deep link、最近链接、屏幕常亮
- `ui/RemoteControlApp.kt` — 扫码页 + `RemoteControlWebViewScreen`（`WebView` + `AndroidView`）
- `remote/RemoteControlUrlPolicy.kt` — **URL 白名单**（生产仅 `https://lumosai.cc/remote`，debug 额外放行 localhost/局域网）
- `remote/RemoteControlKeepAliveService.kt` — 前台服务（`dataSync`）降低后台回收概率
- `remote/RemoteControlRecentLinksStore.kt` — 最近 5 条链接（SharedPreferences）
- 扫码：**CameraX 1.6.0 + ML Kit barcode 17.3.0**（仅 QR）
- 构建：AGP 9.2.1 / Gradle 9.4.1 / Kotlin 2.2.10 / Compose BOM 2026.02.01，minSdk 24 / targetSdk 36
- 深链：`lumos://remote`、`https://lumosai.cc/remote`
- `BuildConfig.REMOTE_CONTROL_DEFAULT_URL = "https://lumosai.cc/remote"`

### 1.2 可复用的"业务内核"（三端共享）

| 复用面 | 位置 | 说明 |
| --- | --- | --- |
| 远控 Web 客户端 | `packages/web`，`build:web-remote-control`（`vite build --base=/remote/`），另有 `:v3`/`:v4`/`:test` | **手机端 UI 本体** |
| 共享 UI/逻辑 | `packages/ui`、`packages/client`、`packages/shared` | 已被 web bundle 打包进去 |
| 分享页 | `packages/web-share` + `packages/share-ui` | 手机端可直接跳转 |
| 远控协议 | `packages/server/src/http.ts`（`/ws/remote/:id`、`/ws`、`/api/server-info`）、`/api/remote-control/windows/bootstrap/<token>`、`/ws/remote-control/window/<token>` | 三端完全一致，不改 |
| 断线语义 | `web-remote-replayable`、bridge 重建、task snapshot 对齐（见 Android 说明文档） | 三端复用同一套恢复语义 |

### 1.3 关键约束（来自现有设计文档，必须继承）

> Android App **不创建独立 Agent runtime、local host 或 SSH/WSL/Docker session**；手机端只能 attach 到**已经存在**的桌面窗口 host。

→ 手机端是**纯客户端**。本计划不改变这一点；若将来要让手机独立跑 Agent，属于另一个课题。

---

## 2. 选型对比（含调研依据）

| 方案 | 一套代码覆盖三端 | 复用现有 React UI | 风险/成本 | 结论 |
| --- | --- | --- | --- | --- |
| **A. Web bundle + 三套薄壳（WebView/WKWebView/ArkWeb）** | 是（Web 层 100%） | **完全复用** | 需写 3 个壳（Android 已有）；iOS/鸿蒙保活受限 | ✅ **推荐** |
| B. Capacitor 8（Android/iOS）+ 鸿蒙单独 HAP | Android/iOS 是，鸿蒙否 | 完全复用 | 仍需鸿蒙 HAP；Capacitor 对鸿蒙无官方支持 | 备选（可降低 Android/iOS 壳成本） |
| C. Taro 4（编译 H5 + 鸿蒙 hybrid）+ Capacitor | 是 | **不能直接复用**（需把 UI 改写成 Taro 组件） | 重写 UI，与"充分复用"冲突 | ❌ 不推荐 |
| D. ArkUI-X（ArkTS 一套跑 OpenHarmony/HarmonyOS/Android/iOS） | 是 | **不能复用**（ArkTS UI，非 React） | 需用 ArkTS 重写全部界面 | ❌ 现阶段不推荐（可作远期选项） |
| E. Flutter | iOS/Android 官方；鸿蒙仅社区移植 | 不能复用 | 鸿蒙非官方支持，风险高 | ❌ 不推荐 |
| F. React Native（含鸿蒙 RN-OH） | 部分 | 不能复用（RN 非 DOM） | 重写 UI | ❌ 不推荐 |

**调研依据**

- 鸿蒙 NEXT（HarmonyOS 5）**移除了 AOSP/Android 兼容层**，Android APK 不再是一等应用格式，须用 DevEco Studio 写 **ArkTS/ArkUI**、打包 HAP/APP、经 **AppGallery** 分发。（来源：Wikipedia *HarmonyOS 5*；promon.io；itechguides）
- **ArkUI-X** 是华为官方把 ArkUI 扩展到 OpenHarmony/HarmonyOS/**Android/iOS** 的方案，一套 ArkTS 主代码多端部署——能力很强，但 UI 必须用 ArkTS 写，**无法复用现有 React 界面**。（来源：gitee.com/arkui-x；gitcode.com/arkui-x/docs）
- 业界对"已有 React Web 应用要上手机"的主流做法是 **WebView 承载**（Capacitor/Median 等），在业务型应用上杠杆最高；原生重写只在强交互/高帧率场景才必要。（来源：median.co；robertmarshall.dev）
- 也有 **Taro 4 + Capacitor 8 + 鸿蒙 hybrid** 的组合案例，但代价是 UI 用 Taro 组件重写。（来源：BitzOrcas mobile shell 文档）

---

## 3. 目标架构

```text
                    ┌───────────────────────────────┐
                    │   packages/web（一份代码）      │
                    │   vite build --base=/remote/   │
                    └───────────────┬───────────────┘
                                    │ 同一份 /remote bundle
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼────────┐        ┌─────────▼─────────┐       ┌─────────▼─────────┐
│ Android 壳      │        │ iOS 壳            │       │ HarmonyOS 壳      │
│ (已有, Kotlin)  │        │ (新, SwiftUI)     │       │ (新, ArkTS)       │
│ WebView         │        │ WKWebView         │       │ Web 组件          │
│ CameraX+MLKit   │        │ AVFoundation/     │       │ Scan Kit /        │
│                 │        │ Vision QR         │       │ camera+image QR   │
│ FGS 保活        │        │ 受限保活(重连)     │       │ continuousTask    │
│ intent-filter   │        │ Universal Link    │       │ skills + uri      │
└─────────────────┘        └───────────────────┘       └───────────────────┘
        └───────────────────────────┼───────────────────────────┘
                                    │  attach（不新建 host）
                    ┌───────────────▼───────────────┐
                    │ 现有远端：桌面窗口 host / 服务 │
                    │ /ws/remote/:id, /ws, bootstrap │
                    └───────────────────────────────┘
```

**目录建议**（沿用 Android 的"独立工程"先例，避免污染 pnpm workspace）：

```text
packages/android/     # 已有，独立 Gradle
apps/mobile-ios/      # 新增，Xcode 工程
apps/mobile-harmony/  # 新增，DevEco 工程（ArkTS）
```

---

## 4. 分阶段计划

### 阶段 0：打通"移动端可独立连接"（1 周，最高优先级）

现状：手机端依赖**桌面窗口已存在的 host** + 桌面生成的二维码。
问题：没有桌面时手机完全不可用；也无法自测。

- [ ] 让手机端支持直接连接 **Lumos 服务端**（现有 `--host 0.0.0.0 --token <t>` 已具备），即 `/api/server-info` + `/ws` 直连模式
- [ ] `RemoteControlUrlPolicy` 增加"服务端模式"白名单（域名/局域网 + token）
- [ ] 文档化两种配对：**桌面二维码**（现有）与 **服务端地址 + token**（新增）
- 验收：手机（或模拟器）不依赖桌面即可打开 `/` 并建立 WS

### 阶段 1：Android 收口（1 周）

- [ ] 补 `packages/android/README.md`（构建、签名、产物、debug 局域网开关）
- [ ] 增加 Gradle CI（Linux runner：JDK 17+ + Android SDK）
- [ ] 保活适配 Android 14+/15 前台服务新规（`dataSync` 需通知与用途说明）
- [ ] 与 web 端对齐 `/remote` 版本（`v3`/`v4` base 切换）
- 验收：`./gradlew assembleDebug` 通过；真机扫码 → 远控页面可用；断线可恢复

### 阶段 2：iOS 壳（2–3 周）

- [ ] 新建 `apps/mobile-ios`：SwiftUI + **WKWebView**
- [ ] 扫码：`AVCaptureMetadataOutput`（或 Vision）
- [ ] 深链：**Universal Links**（`lumosai.cc/remote`，需 `apple-app-site-association`）+ 自定义 scheme
- [ ] URL 白名单：与 Android `RemoteControlUrlPolicy` 同规则（生产仅 `https://lumosai.cc/remote`）
- [ ] **保活降级**：iOS 不允许任意常驻后台；改为后台任务申请 + `WKWebView` 恢复 + 依赖既有 `web-remote-replayable` 重连语义
- [ ] 校验 **WKWebView（WebKit）** 下现有 bundle 的兼容性（重点：pdf.js、Office 预览、大 bundle）
- 验收：真机（非模拟器）扫码 → 远控可用；切后台再回前台能恢复

### 阶段 3：鸿蒙壳（3–4 周）

- [ ] 新建 `apps/mobile-harmony`（DevEco，ArkTS）
- [ ] `Web` 组件承载同一 `/remote` bundle（ArkWeb 为 Chromium 内核，兼容性优于 WKWebView）
- [ ] 扫码：**Scan Kit（`@hms.core.scan`）** 或 camera+image 解码
- [ ] 深链：`module.json5` 的 `skills` 配置 `lumos://remote` 与 `https://lumosai.cc/remote`
- [ ] 保活：`backgroundTasks` / `continuousTask`，并声明对应权限
- [ ] 隐私与合规：华为要求的权限清单、隐私声明、AppGallery 上架材料
- 验收：真机（HarmonyOS NEXT）扫码 → 远控可用；HAP 可签名安装

### 阶段 4：统一化与自动化（持续）

- [ ] 三端共用的"壳契约"抽出为一份规格（扫码内容格式、URL 白名单、深链、版本协商），避免三份实现漂移
- [ ] `/remote` bundle 版本与三端最低版本协商（后端可拒绝过旧壳）
- [ ] 发版流水线：Android（Linux runner）、iOS（**macOS runner**）、鸿蒙（DevEco）
- [ ] 崩溃/日志上报统一（可选，注意隐私）

---

## 5. 平台差异与风险清单

| 项 | Android | iOS | HarmonyOS NEXT |
| --- | --- | --- | --- |
| 应用格式 | APK/AAB | IPA | **HAP/APP** |
| WebView 内核 | Chromium（System WebView） | **WebKit** | ArkWeb（Chromium） |
| 保活 | 前台服务（受限） | **基本不允许常驻**，靠重连 | continuousTask |
| 扫码 | CameraX + MLKit ✅已有 | AVFoundation/Vision | Scan Kit |
| 深链 | intent-filter ✅已有 | Universal Links | skills + uri |
| 分发 | Google Play | App Store | **AppGallery** |
| 构建机 | Linux ✅ | **必须 macOS + Xcode** | **必须 DevEco（Win/macOS）** |
| 费用/门槛 | 一次性注册 | Apple 开发者 $99/年 | 华为开发者 + 上架审核 |

**最高风险三条**

1. **iOS 保活**：Android 靠前台服务"降低被回收概率"这套在 iOS 不成立。必须把体验设计成"可断可续"，而不是"常驻在线"。
2. **WKWebView 兼容性**：现有 `/remote` 页面在 Chromium 上验证过，但在 WebKit 上未验证（pdf.js/Office 预览/剪贴板/文件选择器差异较大）。**建议阶段 2 第一件事就是拿真机 iPhonE 打开 `https://lumosai.cc/remote` 跑一遍**，再决定是否需要为 iOS 裁剪功能。
3. **构建环境**：本机是 Linux，**无法构建 iOS 与鸿蒙**（无 `xcodebuild`、无 `hvigor`、无 Java/Android SDK）。Android 可在 Linux 补齐（装 JDK+SDK）；iOS/鸿蒙必须准备 macOS 与 DevEco 环境，否则阶段 2/3 只能"写代码、不能出包"。

---

## 6. 复用清单（明确"改什么/不改什么"）

**完全不改（复用）**

- `packages/web` 的 `/remote` 页面与其打包配置
- `packages/ui` / `packages/client` / `packages/shared` / `packages/share-ui`
- 远端协议：`/ws/remote/:id`、`/ws`、`/api/server-info`、`/api/remote-control/windows/bootstrap/<token>`、`/ws/remote-control/window/<token>`
- 断线恢复语义（`web-remote-replayable`、bridge 重建、snapshot 对齐）

**每端各自实现（薄）**

- 扫码、深链、URL 白名单、WebView 容器、保活策略、权限声明、上架材料

**可能需要的极小增强**

- web 端暴露一个"壳能力探测"（例如 `window.lumosShell`）供壳注入扫码结果/返回键/分享
- 服务端/桌面端生成二维码时附带**壳版本协商字段**（便于将来优雅拒绝过旧壳）

---

## 7. 验收标准（三端一致）

1. 扫码或深链打开后，`/remote` 页面在 **30 秒内**完成 pairing（bootstrap + WS ready）
2. 断网 1 分钟后恢复网络，任务状态与桌面一致（复用现有重连语义）
3. 生产包**只能**打开 `https://lumosai.cc/remote`（白名单生效，非法链接被拒）
4. 不能创建独立 Agent runtime / host（保持 attach 语义）
5. 三端各自的构建产物可签名、可安装（APK / IPA / HAP）

---

## 8. 待决策项

1. **是否接受"纯 WebView 复用"路线**（推荐），还是希望将来有原生 UI（那要评估 ArkUI-X/Flutter 重写成本）
2. 手机端是否需要**免桌面**模式（阶段 0）—— 这决定是否需要服务端配套（`--host 0.0.0.0 --token` 已有，主要是产品与安全策略）
3. iOS / 鸿蒙的**构建与分发账号**是否已具备（Apple Developer / 华为开发者）
4. 鸿蒙目标版本：只做 **HarmonyOS NEXT**（HAP）还是也要兼容 HarmonyOS 4 及以前（可跑 APK）
5. 是否需要推送通知（FCM/APNs/HMS Push）——会显著增加三端工作量
