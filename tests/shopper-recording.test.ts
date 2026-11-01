import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MIN_RECORDING_FREE_BYTES,
  prepareShopperRecording,
  withShopperCleanup,
} from "../src/server/shopper-recording";

type Recording = Awaited<ReturnType<typeof prepareShopperRecording>>;
type ReplayClient = Parameters<Recording["start"]>[0];
const mp4 = Buffer.from(
  "000000186674797069736f6d0000000069736f6d6d703432",
  "hex",
);
const secretError = () =>
  new Error("https://private-cdp.invalid/?token=merchant-secret");

function clientFor(
  order: string[],
  overrides: Partial<ReplayClient> = {},
): ReplayClient {
  return {
    start: async (_session, options, request) => {
      order.push("start");
      assert.deepEqual(options, {
        framerate: 20,
        max_duration_in_seconds: 150,
        record_audio: false,
      });
      assert.equal(request?.maxRetries, 0);
      return {
        replay_id: "replay123",
        replay_view_url: "https://secret-replay.invalid/",
      };
    },
    stop: async (_replay, params, request) => {
      order.push("stop");
      assert.equal(params.id_or_name, "session123");
      assert.equal(request?.maxRetries, 0);
    },
    download: async () => {
      order.push("download");
      return new Response(new Uint8Array(mp4), {
        headers: { "content-type": "video/mp4" },
      });
    },
    ...overrides,
  };
}

async function fixture(
  options: Parameters<typeof prepareShopperRecording>[2] = {},
) {
  const directory = await mkdtemp(join(tmpdir(), "comrdy-recording-test-"));
  const recording = await prepareShopperRecording("run123", directory, {
    availableBytes: async () => MIN_RECORDING_FREE_BYTES,
    ...options,
  });
  return {
    directory,
    recording,
    path: join(directory, "recordings", "run123"),
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}

function resources(recording: Recording, order: string[]) {
  return {
    recording,
    close: async () => {
      order.push("close");
    },
    delete: async () => {
      order.push("delete");
    },
  };
}

test("recording exports before browser cleanup, saves private metadata and returns only safe evidence", async () => {
  const f = await fixture();
  const order: string[] = [];
  try {
    const result = await withShopperCleanup(
      async () => {
        await f.recording.start(clientFor(order), "session123");
        order.push("shop");
        return { size: "M" };
      },
      resources(f.recording, order),
    );
    assert.deepEqual(order, [
      "start",
      "shop",
      "stop",
      "download",
      "close",
      "delete",
    ]);
    assert.deepEqual(result, {
      observation: { size: "M" },
      recording: {
        file: "run123-shopper.mp4",
        bytes: mp4.length,
        sha256: createHash("sha256").update(mp4).digest("hex"),
      },
    });
    assert.deepEqual(await readFile(join(f.path, "run123-shopper.mp4")), mp4);
    const metadataText = await readFile(join(f.path, "recording.json"), "utf8");
    const metadata = JSON.parse(metadataText);
    assert.equal(metadata.runId, "run123");
    assert.equal(metadata.sessionId, "session123");
    assert.equal(metadata.replayId, "replay123");
    assert.equal(metadata.state, "saved");
    assert.equal(metadataText.includes("https://"), false);
    assert.equal((await stat(f.path)).mode & 0o777, 0o700);
    for (const file of ["recording.json", "run123-shopper.mp4"])
      assert.equal((await stat(join(f.path, file))).mode & 0o777, 0o600);
  } finally {
    await f.cleanup();
  }
});

test("failed recording start prevents shopping but still closes and deletes without exposing provider errors", async () => {
  const f = await fixture();
  const order: string[] = [];
  try {
    const client = clientFor(order, {
      start: async () => {
        order.push("start");
        throw secretError();
      },
    });
    await assert.rejects(
      withShopperCleanup(
        async () => {
          await f.recording.start(client, "session123");
          order.push("shop");
        },
        resources(f.recording, order),
      ),
      { message: "SHOPPER_RECORDING_START_FAILED" },
    );
    assert.deepEqual(order, ["start", "close", "delete"]);
    assert.equal(
      (await readFile(join(f.path, "recording.json"), "utf8")).includes(
        "secret",
      ),
      false,
    );
  } finally {
    await f.cleanup();
  }
});

test("stop and download failures block successful observation and still perform cleanup", async () => {
  for (const stage of ["stop", "download"] as const) {
    const f = await fixture();
    const order: string[] = [];
    try {
      const client = clientFor(order, {
        [stage]: async () => {
          order.push(stage);
          throw secretError();
        },
      });
      await assert.rejects(
        withShopperCleanup(
          async () => {
            await f.recording.start(client, "session123");
            return { size: "M" };
          },
          resources(f.recording, order),
        ),
        {
          message: `SHOPPER_RECORDING_${stage.toUpperCase()}_FAILED`,
        },
      );
      assert.deepEqual(order.slice(-2), ["close", "delete"]);
      assert.equal(
        (await readdir(f.path)).some(
          (name) => name.endsWith(".mp4") || name.endsWith(".part"),
        ),
        false,
      );
    } finally {
      await f.cleanup();
    }
  }
});

test("streamed byte cap cancels the stream and removes the task-owned partial file", async () => {
  const f = await fixture({ maxBytes: 16 });
  const order: string[] = [];
  let cancelled = false;
  try {
    const client = clientFor(order, {
      download: async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(mp4);
            },
            cancel() {
              cancelled = true;
            },
          }),
          { headers: { "content-type": "video/mp4" } },
        ),
    });
    await assert.rejects(
      withShopperCleanup(
        async () => {
          await f.recording.start(client, "session123");
        },
        resources(f.recording, order),
      ),
      { message: "SHOPPER_RECORDING_BYTE_CAP" },
    );
    assert.equal(cancelled, true);
    assert.deepEqual(await readdir(f.path), ["recording.json"]);
    assert.deepEqual(order.slice(-2), ["close", "delete"]);
  } finally {
    await f.cleanup();
  }
});

test("stalled stream export has a bounded deadline and still cleans up", async () => {
  const f = await fixture({ exportTimeoutMs: 10 });
  const order: string[] = [];
  let cancelled = false;
  try {
    const client = clientFor(order, {
      download: async () =>
        new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
          { headers: { "content-type": "video/mp4" } },
        ),
    });
    await assert.rejects(
      withShopperCleanup(
        async () => {
          await f.recording.start(client, "session123");
        },
        resources(f.recording, order),
      ),
      { message: "SHOPPER_RECORDING_TIMEOUT" },
    );
    assert.equal(cancelled, true);
    assert.deepEqual(await readdir(f.path), ["recording.json"]);
    assert.deepEqual(order.slice(-2), ["close", "delete"]);
  } finally {
    await f.cleanup();
  }
});

test("original shopper failure survives export and close errors while deletion still runs", async () => {
  const f = await fixture();
  const order: string[] = [];
  const original = new Error("controlled-shopper-failure");
  try {
    const client = clientFor(order, {
      stop: async () => {
        order.push("stop");
        throw secretError();
      },
    });
    await assert.rejects(
      withShopperCleanup(
        async () => {
          await f.recording.start(client, "session123");
          throw original;
        },
        {
          ...resources(f.recording, order),
          close: async () => {
            order.push("close");
            throw secretError();
          },
        },
      ),
      (error) => error === original,
    );
    assert.deepEqual(order, ["start", "stop", "close", "delete"]);
  } finally {
    await f.cleanup();
  }
});

test("insufficient private disk capacity refuses admission before any provider request", async () => {
  const directory = await mkdtemp(join(tmpdir(), "comrdy-recording-test-"));
  try {
    await assert.rejects(
      prepareShopperRecording("run123", directory, {
        availableBytes: async () => MIN_RECORDING_FREE_BYTES - 1,
      }),
      { message: "SHOPPER_RECORDING_DISK_RESERVE" },
    );
    assert.deepEqual(await readdir(join(directory, "recordings")), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
