import { recordArmsCustomEventForE2E } from "@lumos/ui";
import { DesktopCommandIds, buildLocalMediaPreviewUrl, type IPlatformService } from "@lumos/shared";

import { desktopBrowserPlatformBridge } from "./desktopBrowserPlatformBridge.js";
import { createDesktopPluginSandboxPlatform } from "./plugin-sandbox/desktopPluginSandboxPlatform.js";

export function createDesktopPlatform(options: {
  isLocalDevelopmentRuntime: boolean;
}): IPlatformService {
  return {
    canSelectFilePath: true,
    pluginSandbox: createDesktopPluginSandboxPlatform(),
    createLocalMediaPreviewUrl: buildLocalMediaPreviewUrl,
    isLocalDevelopmentRuntime: options.isLocalDevelopmentRuntime,
    selectDirectory: () => window.lumos.selectDirectory(),
    selectFile: () => window.lumos.selectFile(),
    selectFiles: () => window.lumos.selectFiles?.() ?? Promise.resolve([]),
    createTempTextAttachment: (payload) => window.lumos.createTempTextAttachment(payload),
    materializeWorkflowArtifactFile: (payload) =>
      window.lumos.materializeWorkflowArtifactFile(payload),
    onRemoteConnectionLog: (handler) => window.lumos.onRemoteConnectionLog(handler),
    onRemoteSessionClosed: (handler) => window.lumos.onRemoteSessionClosed(handler),
    onBotRemoteWorkspaceReconnected: (handler) =>
      window.lumos.onBotRemoteWorkspaceReconnected(handler),
    activateOrSetWorkspace: (path) =>
      window.lumos.activateOrSetWorkspace?.(path) ?? Promise.resolve({ activated: false }),
    connectRemote: (remoteOptions, requestId, context) =>
      window.lumos.connectRemote(remoteOptions, requestId, context),
    cancelPendingRemoteConnection: (requestId) =>
      window.lumos.cancelPendingRemoteConnection?.(requestId) ?? Promise.resolve(),
    bindRemoteWorkspaceSessionContext: (context) =>
      window.lumos.bindRemoteWorkspaceSessionContext?.(context) ?? Promise.resolve(),
    startWebRemoteControl: (context) => window.lumos.startWebRemoteControl(context),
    refreshWebRemoteControlPairing: (context) =>
      window.lumos.refreshWebRemoteControlPairing(context),
    stopWebRemoteControl: () => window.lumos.stopWebRemoteControl(),
    getWebRemoteControlStatus: () => window.lumos.getWebRemoteControlStatus(),
    onWebRemoteControlStatusChanged: (handler) =>
      window.lumos.onWebRemoteControlStatusChanged?.(handler) ?? (() => {}),
    disposeRemoteSession: (sessionId) => window.lumos.disposeRemoteSession(sessionId),
    isDockerAvailable: () => window.lumos.isDockerAvailable(),
    listWSLDistros: () => window.lumos.listWSLDistros(),
    listDockerContainers: () => window.lumos.listDockerContainers(),
    listSSHConfigAliases: () => window.lumos.listSSHConfigAliases(),
    loadMcpFromUserDirectory: (payload) => window.lumos.loadMcpFromUserDirectory(payload),
    saveMcpToUserDirectory: (payload) => window.lumos.saveMcpToUserDirectory(payload),
    migrateLegacyCommonMcp: (payload) => window.lumos.migrateLegacyCommonMcp(payload),
    openExternal: (url) => window.lumos.openExternal(url),
    openFeedback: () => window.lumos.executeDesktopCommand(DesktopCommandIds.OpenFeedback),
    openCommunity: () => window.lumos.executeDesktopCommand(DesktopCommandIds.OpenCommunity),
    canOpenCommunity: (locale) => window.lumos.canOpenCommunity(locale),
    openInFileManager: (path) => window.lumos.openInFileManager(path),
    openExternalFile: (path) => window.lumos.openExternalFile(path),
    openCuaPermissionOnboarding: window.lumos.openCuaPermissionOnboarding
      ? (permissionOptions) =>
          window.lumos.openCuaPermissionOnboarding?.(permissionOptions) ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    prepareCuaHelperPermissionDrag: window.lumos.prepareCuaHelperPermissionDrag
      ? () =>
          window.lumos.prepareCuaHelperPermissionDrag?.() ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    startCuaHelperPermissionDrag: window.lumos.startCuaHelperPermissionDrag
      ? () => window.lumos.startCuaHelperPermissionDrag?.()
      : undefined,
    registerOAuthState: (payload) => window.lumos.registerOAuthState(payload),
    onOAuthCallback: (callback) => window.lumos.onOAuthCallback(callback),
    onPaymentCallback: (callback) => window.lumos.onPaymentCallback(callback),
    onShareImport: (callback) => window.lumos.onShareImport?.(callback) ?? (() => {}),
    notifyRendererReady: () => window.lumos.notifyRendererReady(),
    reportTelemetryEvent: (payload) => window.lumos.reportTelemetryEvent(payload),
    reportArmsCustomEvent: (payload) => {
      recordArmsCustomEventForE2E(payload);
      return window.lumos.reportArmsCustomEvent(payload);
    },
    getRendererActionTraceConfig: window.lumos.getRendererActionTraceConfig
      ? () => window.lumos.getRendererActionTraceConfig!()
      : undefined,
    onRendererActionTraceConfigChanged: window.lumos.onRendererActionTraceConfigChanged
      ? (callback) => window.lumos.onRendererActionTraceConfigChanged!(callback)
      : undefined,
    reportLocalTtftBatch: (batch) => window.lumos.reportLocalTtftBatch(batch),
    reportRendererActionTraceBatch: window.lumos.reportRendererActionTraceBatch
      ? (batch) => window.lumos.reportRendererActionTraceBatch!(batch)
      : undefined,
    reportRendererHeapSample: window.lumos.reportRendererHeapSample
      ? (sample) => window.lumos.reportRendererHeapSample!(sample)
      : undefined,
    showTaskNotification: (payload) => window.lumos.showTaskNotification(payload),
    syncWindowTabs: (paths) => window.lumos.syncWindowTabs(paths),
    syncWebRemoteControlWorkspaces: (workspaces) =>
      window.lumos.syncWebRemoteControlWorkspaces?.(workspaces),
    syncWebRemoteControlTasks: (tasks) => window.lumos.syncWebRemoteControlTasks?.(tasks),
    onWebRemoteControlReconnectWorkspace: (handler) =>
      window.lumos.onWebRemoteControlReconnectWorkspace?.(handler) ?? (() => {}),
    syncWindowUnreadCount: (count) => window.lumos.syncWindowUnreadCount(count),
    syncActiveTaskSession: (sessionId) => window.lumos.syncActiveTaskSession(sessionId),
    syncAppSettings: (patch) => window.lumos.syncAppSettings?.(patch),
    // 桥缺失（旧 preload 升级窗口）时按 supported 兜底，与 Windows 现状一致，设置开关可用。
    getCloseToTrayCapability: () =>
      window.lumos.getCloseToTrayCapability?.() ??
      Promise.resolve({ supported: true, gnomeLikeWithoutTray: false }),
    setShortcutRecordingActive: (active) => window.lumos.setShortcutRecordingActive?.(active),
    onFocusTab: (handler) => window.lumos.onFocusTab(handler),
    onNewTab: (handler) => window.lumos.onNewTab(handler),
    onCloseActiveContextRequest: (handler) =>
      window.lumos.onCloseActiveContextRequest?.(handler) ?? (() => {}),
    onOpenBrowserUrl: (handler) => window.lumos.onOpenBrowserUrl?.(handler) ?? (() => {}),
    onEmbeddedBrowserPermissionPrompt: (handler) =>
      window.lumos.onEmbeddedBrowserPermissionPrompt?.(handler) ?? (() => {}),
    resolveEmbeddedBrowserPermissionPrompt: (request) =>
      window.lumos.resolveEmbeddedBrowserPermissionPrompt?.(request),
    getEmbeddedBrowserSitePermissions: () =>
      window.lumos.getEmbeddedBrowserSitePermissions?.() ?? Promise.resolve({}),
    setEmbeddedBrowserSitePermission: (request) =>
      window.lumos.setEmbeddedBrowserSitePermission?.(request) ?? Promise.resolve({}),
    clearEmbeddedBrowserSitePermissions: () =>
      window.lumos.clearEmbeddedBrowserSitePermissions?.() ?? Promise.resolve({}),
    resetEmbeddedBrowserSitePermission: (request) =>
      window.lumos.resetEmbeddedBrowserSitePermission?.(request) ?? Promise.resolve({}),
    onBrowserViewScreenshotSurfacePrepare: (handler) =>
      window.lumos.onBrowserViewScreenshotSurfacePrepare?.(handler) ?? (() => {}),
    onBrowserViewScreenshotSurfaceRelease: (handler) =>
      window.lumos.onBrowserViewScreenshotSurfaceRelease?.(handler) ?? (() => {}),
    browserViewScreenshotSurfaceReady: (payload) =>
      window.lumos.browserViewScreenshotSurfaceReady?.(payload),
    ...desktopBrowserPlatformBridge,
    onNewTask: (handler) => window.lumos.onNewTask(handler),
    onOpenWorkspace: (handler) => {
      // 开发态或升级后的旧窗口可能仍运行未暴露 onOpenWorkspace 的 preload，
      // renderer 直接调用会在启动时崩溃。这里和 activateOrSetWorkspace 一样做兼容兜底，
      // 缺少该 bridge 时只禁用原生菜单回调，不影响应用继续打开。
      return window.lumos.onOpenWorkspace?.(handler) ?? (() => {});
    },
    onOpenWorkspacePath: (handler) => window.lumos.onOpenWorkspacePath?.(handler) ?? (() => {}),
    onOpenFeedbackDialog: (handler) => window.lumos.onOpenFeedbackDialog?.(handler) ?? (() => {}),
    onOpenTicketsPanel: (handler) => window.lumos.onOpenTicketsPanel?.(handler) ?? (() => {}),
    onWindowFullscreenChanged: (handler) => window.lumos.onWindowFullscreenChanged(handler),
    getDesktopWindowChromeState: window.lumos.getDesktopWindowChromeState
      ? () => window.lumos.getDesktopWindowChromeState!()
      : undefined,
    onDesktopWindowChromeStateChanged: window.lumos.onDesktopWindowChromeStateChanged
      ? (handler) => window.lumos.onDesktopWindowChromeStateChanged!(handler)
      : undefined,
    getWindowControlsOverlayMetrics: () => window.lumos.getWindowControlsOverlayMetrics?.() ?? null,
    onWindowControlsOverlayChanged: (handler) =>
      window.lumos.onWindowControlsOverlayChanged?.(handler) ?? (() => {}),
    getDesktopZoomLevel: () =>
      window.lumos.getDesktopZoomLevel?.() ?? Promise.resolve({ zoomLevel: 0 }),
    onDesktopZoomLevelChanged: (handler) =>
      window.lumos.onDesktopZoomLevelChanged?.(handler) ?? (() => {}),
    onTaskNotificationClick: (handler) => window.lumos.onTaskNotificationClick(handler),
    exportLogs: () => window.lumos.exportLogs(),
    captureWindowScreenshot: () =>
      window.lumos.captureWindowScreenshot?.() ?? Promise.resolve(null),
    onUpdateReady: (callback) => window.lumos.onUpdateReady(callback),
    onUpdateCheckResult: (callback) => window.lumos.onUpdateCheckResult(callback),
    onUpdateStateChanged: (callback) => window.lumos.onUpdateStateChanged?.(callback) ?? (() => {}),
    getUpdateState: () =>
      window.lumos.getUpdateState?.() ?? Promise.resolve({ kind: "idle", enabled: true }),
    downloadUpdate: () => window.lumos.downloadUpdate?.() ?? Promise.resolve(),
    cancelUpdateDownload: () => window.lumos.cancelUpdateDownload?.() ?? Promise.resolve(),
    openUpdateStatusWindow: () => window.lumos.openUpdateStatusWindow?.() ?? Promise.resolve(),
    getAutoUpdatePreferences: () =>
      window.lumos.getAutoUpdatePreferences?.() ??
      Promise.resolve({ autoDownloadAndInstallUpdates: false }),
    setAutoDownloadAndInstallUpdates: (enabled) =>
      window.lumos.setAutoDownloadAndInstallUpdates?.(enabled) ?? Promise.resolve(),
    getDesktopSessionActivity: () =>
      window.lumos.getDesktopSessionActivity?.() ??
      Promise.resolve({ runningAgentSessionCount: 0 }),
    getLumosStdioTapDevState: () =>
      window.lumos.getLumosStdioTapDevState?.() ??
      Promise.resolve({ enabled: false, visible: false, logDir: "", statePath: "" }),
    onSettingsChanged: (callback) => window.lumos.onSettingsChanged?.(callback) ?? (() => {}),
    onApplicationLocaleChanged: (callback) =>
      window.lumos.onApplicationLocaleChanged?.(callback) ?? (() => {}),
    onPostUpdateReleaseNotes: (callback) => window.lumos.onPostUpdateReleaseNotes(callback),
    acknowledgePostUpdateReleaseNotes: (version) =>
      window.lumos.acknowledgePostUpdateReleaseNotes(version),
    skipUpdateVersion: (version) => window.lumos.skipUpdateVersion?.(version) ?? Promise.resolve(),
    quitAndInstallUpdate: () => window.lumos.quitAndInstallUpdate(),
    getInstalledEditors: () => window.lumos.getInstalledEditors(),
    getApplicationIcon: (bundleId) =>
      window.lumos.getApplicationIcon?.(bundleId) ?? Promise.resolve(null),
    openInEditor: (editorId, path, editorOptions) =>
      window.lumos.openInEditor(editorId, path, editorOptions),
    executeDesktopCommand: (command) => window.lumos.executeDesktopCommand(command),
    setApplicationLocale: (locale) => window.lumos.setApplicationLocale(locale),
    getSystemLocale: () =>
      window.lumos.getSystemLocale?.() ??
      Promise.resolve(navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US"),
    setTitleBarTheme: (theme) => window.lumos.setTitleBarTheme(theme),
    getDeviceId: () =>
      (window as Window & { __LUMOS_DEVICE_ID__?: string }).__LUMOS_DEVICE_ID__ ?? "",
  };
}
