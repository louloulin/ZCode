import type { LumosBackgroundTaskControlItem } from "./background-task-controls.js";

export function mergeLumosBackgroundTaskControlItems(
  current: readonly LumosBackgroundTaskControlItem[],
  updates: readonly LumosBackgroundTaskControlItem[],
): LumosBackgroundTaskControlItem[] {
  const jobsById = new Map(current.map((job) => [job.jobId, job] as const));
  for (const job of updates) {
    jobsById.set(job.jobId, job);
  }
  return Array.from(jobsById.values());
}
