import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  open,
  rename,
  statfs,
  unlink,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import type { Replays } from "@onkernel/sdk/resources/browsers/replays";
import { executionProvenance } from "./provenance";

export const MIN_RECORDING_FREE_BYTES = 128 * 1024 * 1024;
export const MAX_RECORDING_BYTES = 64 * 1024 * 1024;
export const RECORDING_BROWSER_OPTIONS = {
  headless: false,
  kiosk_mode: true,
  viewport: { width: 1920, height: 1080, refresh_rate: 25 },
} as const;

type ReplayClient = {
  [K in "start" | "stop" | "download"]: (
    ...args: Parameters<Replays[K]>
  ) => PromiseLike<Awaited<ReturnType<Replays[K]>>>;
};
export interface ShopperRecordingEvidence {
  file: string;
  sha256: string;
  bytes: number;
}
export class ShopperRecordingError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ShopperRecordingError";
  }
}

async function bounded<T>(
  operation: () => PromiseLike<T>,
  milliseconds: number,
  abort?: AbortController,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => {
            abort?.abort();
            reject(new ShopperRecordingError("SHOPPER_RECORDING_TIMEOUT"));
          },
          Math.max(1, milliseconds),
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Private server-only admission; no browser or provider request is made here. */
export async function prepareShopperRecording(
  runId: string,
  evidenceDir: string,
  options: {
    availableBytes?: () => Promise<number>;
    maxBytes?: number;
    requestTimeoutMs?: number;
    exportTimeoutMs?: number;
  } = {},
) {
  if ("window" in globalThis || !/^[A-Za-z0-9_-]{1,128}$/.test(runId))
    throw new ShopperRecordingError("SHOPPER_RECORDING_INVALID_CONTEXT");
  const maxBytes = Math.min(
    options.maxBytes ?? MAX_RECORDING_BYTES,
    MAX_RECORDING_BYTES,
  );
  const requestTimeout = Math.min(options.requestTimeoutMs ?? 10_000, 10_000);
  const exportTimeout = Math.min(options.exportTimeoutMs ?? 20_000, 20_000);
  const root = resolve(evidenceDir, "recordings");
  const directory = resolve(root, runId);
  const filename = `${runId}-shopper.mp4`;
  const partial = resolve(directory, filename + ".part");
  const metadataFile = resolve(directory, "recording.json");
  let sessionId: string | undefined;
  let replayId: string | undefined;
  let replayClient: ReplayClient | undefined;
  let started = false;
  let finished = false;
  const metadata: Record<string, unknown> = {
    runId,
    execution: executionProvenance(),
    state: "prepared",
    preparedAt: new Date().toISOString(),
  };
  async function save(state: string, extra: Record<string, unknown> = {}) {
    Object.assign(metadata, extra, { state });
    const temporary = metadataFile + ".part";
    await writeFile(temporary, JSON.stringify(metadata, null, 2), {
      mode: 0o600,
    });
    await rename(temporary, metadataFile);
  }
  try {
    await mkdir(root, { recursive: true, mode: 0o700 });
    await chmod(root, 0o700);
    const available = options.availableBytes
      ? await options.availableBytes()
      : await statfs(root).then((stats) => stats.bavail * stats.bsize);
    if (!Number.isFinite(available) || available < MIN_RECORDING_FREE_BYTES)
      throw new ShopperRecordingError("SHOPPER_RECORDING_DISK_RESERVE");
    // Exclusive directory creation prevents overwriting another recording for this run.
    await mkdir(directory, { mode: 0o700 });
    await save("prepared");
  } catch (error) {
    throw error instanceof ShopperRecordingError
      ? error
      : new ShopperRecordingError("SHOPPER_RECORDING_STORAGE_UNAVAILABLE");
  }

  return {
    async start(client: ReplayClient, id: string) {
      if (started || !/^[A-Za-z0-9_-]{1,200}$/.test(id))
        throw new ShopperRecordingError("SHOPPER_RECORDING_INVALID_SESSION");
      started = true;
      replayClient = client;
      sessionId = id;
      const abort = new AbortController();
      try {
        await save("starting", { sessionId });
        const replay = await bounded(
          () =>
            client.start(
              id,
              {
                framerate: 20,
                max_duration_in_seconds: 150,
                record_audio: false,
              },
              { timeout: requestTimeout, maxRetries: 0, signal: abort.signal },
            ),
          requestTimeout,
          abort,
        );
        if (!/^[A-Za-z0-9_-]{1,200}$/.test(replay.replay_id))
          throw new ShopperRecordingError("SHOPPER_RECORDING_INVALID_REPLAY");
        replayId = replay.replay_id;
        await save("recording", {
          replayId,
          startedAt: new Date().toISOString(),
        });
      } catch {
        await save("start_failed", { replayId }).catch(() => {});
        throw new ShopperRecordingError("SHOPPER_RECORDING_START_FAILED");
      }
    },
    async finish(): Promise<ShopperRecordingEvidence | undefined> {
      if (!replayClient || !replayId || !sessionId || finished)
        return undefined;
      finished = true;
      const client = replayClient;
      const id = replayId;
      const session = sessionId;
      const abort = new AbortController();
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let handle: Awaited<ReturnType<typeof open>> | undefined;
      let ownsPartial = false;
      let stage = "stop";
      try {
        await save("stopping");
        await bounded(
          () =>
            client.stop(
              id,
              { id_or_name: session },
              {
                timeout: requestTimeout,
                maxRetries: 0,
                signal: abort.signal,
              },
            ),
          requestTimeout,
          abort,
        );
        await save("exporting", { stoppedAt: new Date().toISOString() });
        stage = "download";
        const deadline = Date.now() + exportTimeout;
        const response = await bounded(
          () =>
            client.download(
              id,
              { id_or_name: session },
              {
                timeout: exportTimeout,
                maxRetries: 0,
                signal: abort.signal,
              },
            ),
          exportTimeout,
          abort,
        );
        if (
          !response.ok ||
          !response.body ||
          !/^(video\/mp4|application\/octet-stream)(?:;|$)/i.test(
            response.headers.get("content-type") ?? "",
          )
        ) {
          void response.body?.cancel().catch(() => {});
          throw new ShopperRecordingError("SHOPPER_RECORDING_INVALID_DOWNLOAD");
        }
        reader = response.body.getReader();
        const declaredBytes = Number(response.headers.get("content-length"));
        if (declaredBytes > maxBytes)
          throw new ShopperRecordingError("SHOPPER_RECORDING_BYTE_CAP");
        handle = await open(partial, "wx", 0o600);
        ownsPartial = true;
        const hash = createHash("sha256");
        let bytes = 0;
        // Only retain the tiny container header for a basic MP4 identity check.
        let header = Buffer.alloc(0);
        while (true) {
          if (Date.now() >= deadline)
            throw new ShopperRecordingError("SHOPPER_RECORDING_TIMEOUT");
          const item = await bounded(
            () => reader!.read(),
            deadline - Date.now(),
            abort,
          );
          if (item.done) break;
          bytes += item.value.byteLength;
          if (bytes > maxBytes)
            throw new ShopperRecordingError("SHOPPER_RECORDING_BYTE_CAP");
          if (header.length < 12)
            header = Buffer.concat([
              header,
              Buffer.from(item.value.subarray(0, 12 - header.length)),
            ]);
          hash.update(item.value);
          let offset = 0;
          while (offset < item.value.byteLength) {
            const { bytesWritten } = await handle.write(item.value, offset);
            if (!bytesWritten)
              throw new ShopperRecordingError("SHOPPER_RECORDING_WRITE_FAILED");
            offset += bytesWritten;
          }
        }
        if (bytes < 12 || header.toString("ascii", 4, 8) !== "ftyp")
          throw new ShopperRecordingError("SHOPPER_RECORDING_INVALID_MP4");
        if (declaredBytes > 0 && declaredBytes !== bytes)
          throw new ShopperRecordingError(
            "SHOPPER_RECORDING_INCOMPLETE_DOWNLOAD",
          );
        await handle.sync();
        await handle.close();
        handle = undefined;
        await rename(partial, resolve(directory, filename));
        ownsPartial = false;
        const evidence = { file: filename, sha256: hash.digest("hex"), bytes };
        await save("saved", { ...evidence, savedAt: new Date().toISOString() });
        return evidence;
      } catch (error) {
        const safe =
          error instanceof ShopperRecordingError
            ? error
            : new ShopperRecordingError(
                stage === "stop"
                  ? "SHOPPER_RECORDING_STOP_FAILED"
                  : "SHOPPER_RECORDING_DOWNLOAD_FAILED",
              );
        await save("failed", { errorCode: safe.code }).catch(() => {});
        throw safe;
      } finally {
        abort.abort();
        if (reader) void reader.cancel().catch(() => {});
        try {
          await handle?.close();
        } finally {
          if (ownsPartial) await unlink(partial).catch(() => {});
        }
      }
    },
  };
}

/** Always export first, then close and delete; preserve the original shopper failure. */
export async function withShopperCleanup<T>(
  work: () => Promise<T>,
  resources: {
    recording?: Awaited<ReturnType<typeof prepareShopperRecording>>;
    close: () => Promise<unknown>;
    delete: () => Promise<unknown>;
  },
): Promise<{ observation: T; recording?: ShopperRecordingEvidence }> {
  // Preserve the ordinary shopper's existing cleanup semantics when capture is off.
  if (!resources.recording) {
    try {
      return { observation: await work() };
    } finally {
      try {
        await resources.close();
      } finally {
        await resources.delete();
      }
    }
  }
  let observation: T | undefined;
  let recording: ShopperRecordingEvidence | undefined;
  let failure: unknown;
  try {
    observation = await work();
  } catch (error) {
    failure = error;
  } finally {
    try {
      recording = await resources.recording?.finish();
    } catch (error) {
      failure ??= error;
    } finally {
      try {
        await bounded(resources.close, 10_000);
      } catch {
        failure ??= new ShopperRecordingError("SHOPPER_BROWSER_CLOSE_FAILED");
      } finally {
        try {
          await bounded(resources.delete, 10_000);
        } catch {
          failure ??= new ShopperRecordingError(
            "SHOPPER_BROWSER_DELETE_FAILED",
          );
        }
      }
    }
  }
  if (failure) throw failure;
  return { observation: observation as T, ...(recording ? { recording } : {}) };
}
