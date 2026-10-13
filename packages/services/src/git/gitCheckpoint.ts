import type {
  GitCheckpointDiff,
  GitCheckpointDiffQuery,
  GitCheckpointMeta,
  GitCheckpointRequest,
  GitCheckpointRestoreQuery,
  GitCheckpointRestoreResult,
  GitRepositoryRequest,
} from "@lumos/shared";
import { ServiceChannels } from "@lumos/shared";
import { createServiceDescriptor } from "../descriptors.js";

export interface IGitCheckpointService {
  createCheckpoint(params: GitRepositoryRequest): Promise<GitCheckpointMeta>;
  diffCheckpoints(params: GitCheckpointDiffQuery): Promise<GitCheckpointDiff>;
  restoreBetweenCheckpoints(params: GitCheckpointRestoreQuery): Promise<GitCheckpointRestoreResult>;
  deleteCheckpoint(params: GitCheckpointRequest): Promise<void>;
}

export const IGitCheckpointService = createServiceDescriptor<IGitCheckpointService>(
  ServiceChannels.GitCheckpoint,
);
