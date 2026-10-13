import { Worker } from "node:worker_threads";

import {
  isLumosDataSizeScanResult,
  type LumosDataSizeScanRequest,
  type LumosDataSizeScanResult,
} from "./lumosDataSizeScanner.js";

export function scanLumosDataDirectoryInWorker(
  request: LumosDataSizeScanRequest,
  signal: AbortSignal,
): Promise<LumosDataSizeScanResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./lumosDataSizeWorker.js", import.meta.url), {
      workerData: request,
    });
    let settled = false;

    const finish = (run: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      signal.removeEventListener("abort", abort);
      run();
    };
    const abort = () => {
      void worker.terminate();
      finish(() => reject(new DOMException("Lumos data size scan aborted", "AbortError")));
    };

    worker.once("message", (message: unknown) => {
      const response = message as { ok?: unknown; result?: unknown; error?: unknown };
      if (response.ok === true && isLumosDataSizeScanResult(response.result)) {
        finish(() => resolve(response.result as LumosDataSizeScanResult));
        return;
      }
      finish(() =>
        reject(
          new Error(
            response.ok === false && typeof response.error === "string"
              ? response.error
              : "Invalid Lumos data size worker response",
          ),
        ),
      );
    });
    worker.once("error", (error) => finish(() => reject(error)));
    worker.once("exit", (code) => {
      if (code !== 0) {
        finish(() => reject(new Error(`Lumos data size worker exited with code ${code}`)));
      }
    });
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    worker.unref();
  });
}
