// Bootstrap public API surface.

export * from "./app/create-app.js";
export type {
  ListLumosSessionsOptions,
  PromptInput,
  ResolveLatestSessionOptions,
  ResumeOptions,
  RunLumosProtocolAgentOptions,
  SendInputOptions,
  SendInputResult,
  SetLocaleResult,
  SteerTurnOptions,
  SubmitPromptOptions,
  UserPromptInput,
  LumosApp,
  LumosAppOptions,
  LumosModelOption,
} from "./app/types.js";
export * from "./auth-login.js";
export {
  inspectLumosCustomCommand,
  listLumosCustomCommands,
  loadLumosCustomCommand,
} from "./custom-commands.js";
export type {
  InspectLumosCustomCommandOptions,
  ListLumosCustomCommandsOptions,
  LumosCustomCommandInspection,
} from "./custom-commands.js";
export { createModelAdapter } from "./model-factory.js";
export type { CreateModelAdapterOptions } from "./model-factory.js";
export {
  createDefaultProviderEndpointRoutingPort,
  resolveProcessProviderEndpointRoutingPort,
} from "./provider-endpoint-routing.js";
export type {
  CreateDefaultProviderEndpointRoutingPortOptions,
  ResolveProcessProviderEndpointRoutingPortOptions,
} from "./provider-endpoint-routing.js";
export { startProcessProviderRegistryRuntime } from "./app/process-provider-registry-runtime.js";
export type { ProcessProviderRegistryRuntimeOptions } from "./app/process-provider-registry-runtime.js";
export {
  addLumosPluginMarketplace,
  getLumosPluginsOverview,
  installLumosMarketplacePlugin,
  listLumosPlugins,
  removeLumosPluginMarketplace,
  resolveLumosPlugins,
  setLumosPluginEnabled,
  uninstallLumosMarketplacePlugin,
  updateLumosMarketplacePlugin,
  updateLumosPluginMarketplace,
  validateLumosPluginPath,
} from "./plugins.js";
export type {
  AddLumosMarketplaceOptions,
  InstallLumosMarketplacePluginOptions,
  ListLumosPluginsOptions,
  RemoveLumosMarketplaceOptions,
  ResolveLumosPluginsOptions,
  SetLumosPluginEnabledOptions,
  SetLumosPluginEnabledResult,
  UninstallLumosMarketplacePluginOptions,
  UpdateLumosMarketplaceOptions,
  UpdateLumosMarketplacePluginOptions,
  ValidateLumosPluginPathOptions,
  LumosAvailablePluginData,
  LumosInstalledPluginData,
  LumosMarketplaceSummaryData,
  LumosMarketplaceUpdateData,
  LumosPluginInstallData,
  LumosPluginUpdateData,
  LumosPluginsOverviewData,
} from "./plugins.js";
export { runLumosProtocolAgent } from "./lumos-protocol-entrypoint.js";
// Exposed for the CLI's --output-format stream-json: it needs the same event
// shape the protocol server emits, rather than inventing a second one.
export { mapSessionEvent } from "./lumos-protocol/session-mapper.js";
export { prepareLumosTelemetryEnv, shutdownLumosTelemetry } from "./telemetry-bootstrap.js";
export type { SessionTranscriptMessage, SessionTranscriptPart } from "./session-transcript.js";
export { listLumosSessions, resolveLatestSession } from "./sessions.js";
export { inspectLumosSkill, listLumosSkills } from "./skills.js";
export type {
  InspectLumosSkillOptions,
  ListLumosSkillsOptions,
  LumosSkillInspection,
} from "./skills.js";
// Exposed for the CLI's headless slash routing: it must decide "is this a real
// custom command?" with the *same* reserved-name gate the app facade's
// customCommandPromptResolver applies, or the two disagree and a reserved name
// reaches the model as literal prompt text. See prompt-command.ts.
export { isReservedLumosSlashCommandName } from "./slash-command-surface.js";
export {
  grantWorkspaceHookTrust,
  inspectWorkspaceHookTrust,
  revokeWorkspaceHookTrustCli,
} from "./workspace-hook-trust-cli.js";
export type {
  WorkspaceHookTrustCliItem,
  WorkspaceHookTrustCliStatus,
  WorkspaceHookTrustCliTarget,
} from "./workspace-hook-trust-cli.js";
