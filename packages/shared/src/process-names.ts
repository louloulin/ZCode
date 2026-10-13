const LUMOS_PROCESS_PREFIX = "lumos";
const MAX_PROCESS_NAME_SEGMENT_LENGTH = 24;

function sanitizeProcessNameSegment(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, MAX_PROCESS_NAME_SEGMENT_LENGTH);
}

function joinLumosProcessName(...segments: Array<string | null | undefined>): string {
  const sanitizedSegments = segments
    .map((segment) => sanitizeProcessNameSegment(segment))
    .filter((segment): segment is string => Boolean(segment));
  return [LUMOS_PROCESS_PREFIX, ...sanitizedSegments].join("-");
}

function pickWorkspaceTag(workspacePath: string | null | undefined): string | undefined {
  const trimmedPath = workspacePath?.trim();
  if (!trimmedPath) {
    return undefined;
  }

  const parts = trimmedPath.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) ?? trimmedPath;
}

export function formatLumosMainProcessName(): string {
  return joinLumosProcessName("main");
}

export function formatLumosGpuProcessName(): string {
  return joinLumosProcessName("gpu");
}

export function formatLumosHostProcessName(label?: string): string {
  return joinLumosProcessName("host", label);
}

export function formatLumosRendererProcessName(windowTitle?: string): string {
  const normalizedTitle = windowTitle?.trim();
  if (!normalizedTitle || normalizedTitle === "Lumos") {
    return joinLumosProcessName("renderer", "main");
  }

  if (normalizedTitle === "Resource Manager") {
    return joinLumosProcessName("renderer", "resource-manager");
  }

  const remoteWindowPrefix = "Lumos - ";
  if (normalizedTitle.startsWith(remoteWindowPrefix)) {
    return joinLumosProcessName(
      "renderer",
      "remote",
      normalizedTitle.slice(remoteWindowPrefix.length),
    );
  }

  return joinLumosProcessName("renderer", normalizedTitle);
}

export function formatLumosAgentProcessName(provider: string, workspacePath?: string): string {
  return joinLumosProcessName("agent", provider, pickWorkspaceTag(workspacePath));
}

export function formatLumosUtilityProcessName(name?: string, type = "utility"): string {
  return joinLumosProcessName(type, name);
}
