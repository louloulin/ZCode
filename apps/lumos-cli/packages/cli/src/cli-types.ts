import type { TuiReadClipboardImage, TuiWriteClipboardText } from "@lumos/tui";
import type { UiLocale } from "@lumos/i18n";
import type { Logger } from "@lumos/contracts";
import type {
  createManagedCdpBrowserRuntime,
  ManagedCdpBrowserRuntimeOptions,
} from "@lumos/adapters/browser";
import type {
  createDefaultProviderEndpointRoutingPort,
  createModelAdapter,
  createLumosApp,
  CreateDefaultProviderEndpointRoutingPortOptions,
  CreateModelAdapterOptions,
  configureCodingPlanApiKey,
  ConfigureCodingPlanApiKeyOptions,
  inspectLumosSkill,
  inspectWorkspaceHookTrust,
  grantWorkspaceHookTrust,
  revokeWorkspaceHookTrustCli,
  inspectLumosCustomCommand,
  InspectLumosCustomCommandOptions,
  InspectLumosSkillOptions,
  loginLumosCli,
  loginBigmodelCodingPlan,
  LoginBigmodelCodingPlanOptions,
  LoginLumosCliOptions,
  listLumosCustomCommands,
  ListLumosCustomCommandsOptions,
  loadLumosCustomCommand,
  listLumosSessions,
  listLumosSkills,
  ListLumosSessionsOptions,
  ListLumosSkillsOptions,
  logoutLumosCli,
  LogoutLumosCliOptions,
  resolveLatestSession,
  ResolveLatestSessionOptions,
  RunLumosProtocolAgentOptions,
  prepareLumosTelemetryEnv,
  startProcessProviderRegistryRuntime,
  shutdownLumosTelemetry,
  LumosAppOptions,
} from "@lumos/bootstrap";
import type { CliEnv, DotenvLoadResult, LoadCliDotenvOptions } from "./env.js";
import type { PluginsCommandOverrides } from "./plugins-command.js";
import type { CliShutdownProcess } from "./shutdown.js";
import type { resolveWorkspaceGitBranch } from "./tui-workspace-git.js";

export type BootstrapModule = typeof import("@lumos/bootstrap");

export interface RunDependencies extends PluginsCommandOverrides {
  protocolLifecycle?: RunLumosProtocolAgentOptions["lifecycle"];
  protocolInput?: NodeJS.ReadableStream;
  createManagedCdpBrowserRuntime?: (
    options?: ManagedCdpBrowserRuntimeOptions,
  ) => ReturnType<typeof createManagedCdpBrowserRuntime>;
  createModelAdapter?: (
    options?: CreateModelAdapterOptions,
  ) => ReturnType<typeof createModelAdapter>;
  createProviderEndpointRoutingPort?: (
    options: CreateDefaultProviderEndpointRoutingPortOptions,
  ) => ReturnType<typeof createDefaultProviderEndpointRoutingPort>;
  createLumosApp?: (
    options?: LumosAppOptions,
  ) => Awaited<ReturnType<typeof createLumosApp>> | ReturnType<typeof createLumosApp>;
  /**
   * Session-event shaper for --output-format stream-json. Defaults to the
   * bootstrap module's, which is also what the protocol server uses; injectable
   * so a caller that supplies its own `createLumosApp` (tests, embedders) can
   * still stream, since the bootstrap module is not loaded on that path.
   */
  mapSessionEvent?: BootstrapModule["mapSessionEvent"];
  cwd?: () => string;
  env?: CliEnv;
  inspectSkill?: (options: InspectLumosSkillOptions) => ReturnType<typeof inspectLumosSkill>;
  inspectWorkspaceHookTrust?: typeof inspectWorkspaceHookTrust;
  grantWorkspaceHookTrust?: typeof grantWorkspaceHookTrust;
  revokeWorkspaceHookTrustCli?: typeof revokeWorkspaceHookTrustCli;
  inspectCustomCommand?: (
    options: InspectLumosCustomCommandOptions,
  ) => ReturnType<typeof inspectLumosCustomCommand>;
  loginLumosCli?: (options?: LoginLumosCliOptions) => ReturnType<typeof loginLumosCli>;
  loginBigmodelCodingPlan?: (
    options?: LoginBigmodelCodingPlanOptions,
  ) => ReturnType<typeof loginBigmodelCodingPlan>;
  configureCodingPlanApiKey?: (
    options: ConfigureCodingPlanApiKeyOptions,
  ) => ReturnType<typeof configureCodingPlanApiKey>;
  loadDotenv?: (options?: LoadCliDotenvOptions) => DotenvLoadResult;
  prepareLumosTelemetryEnv?: typeof prepareLumosTelemetryEnv;
  projectConfigPath?: string;
  listSessions?: (options: ListLumosSessionsOptions) => ReturnType<typeof listLumosSessions>;
  listCustomCommands?: (
    options: ListLumosCustomCommandsOptions,
  ) => ReturnType<typeof listLumosCustomCommands>;
  loadCustomCommand?: (
    options: InspectLumosCustomCommandOptions,
  ) => ReturnType<typeof loadLumosCustomCommand>;
  // headless slash 路由要和 app facade 的保留名 gate 用同一个判据；默认取 bootstrap 的，
  // 注入点只为让单测不必拉起整个 bootstrap 模块。见 prompt-command.ts。
  isReservedSlashCommandName?: BootstrapModule["isReservedLumosSlashCommandName"];
  listSkills?: (options: ListLumosSkillsOptions) => ReturnType<typeof listLumosSkills>;
  logger?: Logger;
  readClipboardImage?: TuiReadClipboardImage;
  writeClipboardText?: TuiWriteClipboardText;
  resolveLatestSession?: (
    options: ResolveLatestSessionOptions,
  ) => ReturnType<typeof resolveLatestSession>;
  resolveWorkspaceGitBranch?: typeof resolveWorkspaceGitBranch;
  logoutLumosCli?: (options?: LogoutLumosCliOptions) => ReturnType<typeof logoutLumosCli>;
  runLumosProtocolAgent?: (options?: RunLumosProtocolAgentOptions) => Promise<void>;
  runTui?: typeof import("@lumos/tui").runTui;
  skipUserConfig?: boolean;
  userConfigPath?: string;
  exitProcess?: (code: number) => void;
  shutdownCleanupTimeoutMs?: number;
  shutdownProcess?: CliShutdownProcess;
  startProcessProviderRegistryRuntime?: typeof startProcessProviderRegistryRuntime;
  shutdownLumosTelemetry?: typeof shutdownLumosTelemetry;
}

export type CliPermissionMode = "build" | "plan" | "edit" | "yolo" | "guarded";
export type CliRuntimeMode = CliPermissionMode | "auto";

export interface CliModeState {
  current?: CliRuntimeMode;
  override?: CliPermissionMode;
}

export interface CliTargetRequest {
  objective: string;
  replaceExisting: boolean;
}

export type ModeCapableApp = Awaited<ReturnType<typeof createLumosApp>> & {
  getMode?: () => CliRuntimeMode;
  setLocale?: (locale: UiLocale) => Promise<{ locale: "en-US" | "zh-CN" }>;
  setMode?: (mode: CliRuntimeMode) => Promise<{ mode: CliRuntimeMode }>;
};

export interface CliResumeRequest {
  continueSession: boolean;
  resumeSessionId?: string;
}
