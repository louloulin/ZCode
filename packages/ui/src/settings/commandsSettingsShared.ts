import {
  LUMOS_AGENT_PROVIDER,
  LUMOS_COMMAND_AGENT_SOURCES,
  type LumosProvider,
  type CommandAgentSource,
} from "@lumos/shared";

export const COMMAND_AGENT_SOURCES = [
  ...LUMOS_COMMAND_AGENT_SOURCES,
] as const satisfies readonly CommandAgentSource[];

export const COMMAND_AGENT_SOURCE_META: Record<
  CommandAgentSource,
  {
    labelId: string;
    provider: LumosProvider;
    pathHint: string;
  }
> = {
  lumosAgent: {
    labelId: "settings.commands.source.lumosAgent",
    pathHint: "~/.lumos/commands",
    provider: LUMOS_AGENT_PROVIDER,
  },
};
