import {
  collectVisibleLumosBackgroundTaskControlItems,
  getLumosBackgroundTaskControlItemElapsedMs,
  isActiveLumosBackgroundTaskControlItem,
  parseLumosBackgroundTaskControlItems,
  type LumosBackgroundTaskControlItem,
  type LumosBackgroundTaskControlStatus,
} from "./background-task-controls.js";

export type LumosBackgroundBashJobStatus = LumosBackgroundTaskControlStatus;
export type LumosBackgroundBashJob = LumosBackgroundTaskControlItem & {
  taskKind: "bash";
};

export function parseLumosBackgroundBashJobs(value: unknown): LumosBackgroundBashJob[] {
  return parseLumosBackgroundTaskControlItems(value).filter(isBackgroundBashJob);
}

export function isActiveLumosBackgroundBashJob(job: LumosBackgroundBashJob): boolean {
  return isActiveLumosBackgroundTaskControlItem(job);
}

export function getLumosBackgroundBashJobElapsedMs(
  job: LumosBackgroundBashJob,
  now = Date.now(),
): number {
  return getLumosBackgroundTaskControlItemElapsedMs(job, now);
}

export function collectVisibleLumosBackgroundBashJobs(
  jobs: readonly LumosBackgroundBashJob[],
  now = Date.now(),
  thresholdMs = 30_000,
): Array<LumosBackgroundBashJob & { elapsedMs: number }> {
  return collectVisibleLumosBackgroundTaskControlItems(jobs, now, thresholdMs) as Array<
    LumosBackgroundBashJob & { elapsedMs: number }
  >;
}

function isBackgroundBashJob(job: LumosBackgroundTaskControlItem): job is LumosBackgroundBashJob {
  return job.taskKind === "bash";
}
