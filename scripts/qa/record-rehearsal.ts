/** Records actual local UI. Refuses any non-local origin or Sandbox-mode execution. */
import { chromium, type Page } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const dir = "public/media/rehearsal";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
let storage:
  | Awaited<ReturnType<import("playwright").BrowserContext["storageState"]>>
  | undefined;
let run: any, recovery: any;
const shots: { file: string; label: string; reviewed: boolean }[] = [];
const scenes = JSON.parse(
  await readFile("submission/video/rehearsal-narration.json", "utf8"),
);
async function shot(page: Page, file: string, label: string) {
  await page.screenshot({ path: `${dir}/${file}.png` });
  shots.push({ file: `media/rehearsal/${file}.png`, label, reviewed: false });
}
try {
  for (const [i, scene] of scenes.entries()) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 810 },
      reducedMotion: "reduce",
      storageState: storage,
      recordVideo: {
        dir: `artifacts/raw-footage/${i}`,
        size: { width: 1440, height: 810 },
      },
    });
    assert.equal(
      (await (await context.request.get(base + "/api/v1/status")).json()).mode,
      "simulation",
    );
    const page = await context.newPage();
    const start = Date.now();
    if (i === 0) {
      await page.goto(base);
      await shot(page, "01-home", "Local homepage");
    }
    if (i === 1) {
      await page.goto(base + "/demo");
      await page
        .getByRole("button", { name: "Compile intent contract", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Confirm these constraints", exact: true })
        .click();
      await page
        .locator(".contract-review")
        .first()
        .scrollIntoViewIfNeeded()
        .catch(() => {});
      await shot(page, "02-contract", "Locally confirmed fixture contract");
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/v1/runs") && r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Run transaction test", exact: true })
        .click();
      run = await (await response).json();
      assert.equal(run.mode, "simulation");
    }
    if (i === 2) {
      await page.goto(base + "/store");
      await page.getByLabel("Size", { exact: true }).selectOption("M");
      await page
        .getByRole("button", { name: "Add to cart", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Review checkout", exact: true })
        .click();
      await shot(page, "03-store", "Controlled local storefront");
    }
    if (i === 3) {
      await page.goto(base + "/cases/" + run.id);
      await page
        .getByRole("heading", { name: "Constraint evidence", exact: true })
        .waitFor();
      await shot(
        page,
        "04-denial",
        "Simulated variant denial; no provider authorization",
      );
      await page
        .getByRole("heading", { name: "Constraint evidence", exact: true })
        .scrollIntoViewIfNeeded();
    }
    if (i === 4) {
      recovery = await (
        await context.request.post(base + `/api/v1/runs/${run.id}/recover`, {
          data: {},
        })
      ).json();
      assert.equal(recovery.mode, "simulation");
      assert.equal(recovery.contract.hash, run.contract.hash);
      await page.goto(base + `/compare?left=${run.id}&right=${recovery.id}`);
      await page.locator(".compare-table").waitFor();
      await shot(page, "05-recovery", "Local original and recovery comparison");
    }
    if (i === 5) {
      await page.goto(base + "/cases/" + run.id);
      await page
        .getByRole("button", { name: "Next recorded event", exact: true })
        .click();
      await page
        .getByLabel("Recorded event", { exact: true })
        .scrollIntoViewIfNeeded();
      await shot(
        page,
        "06-playback",
        "Read-only recorded local event playback",
      );
      await page
        .getByRole("button", { name: "Next recorded event", exact: true })
        .click();
    }
    if (i === 6) {
      await page.goto(base);
      await page.locator("#mechanism").scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(
      Math.max(1000, scene.seconds * 1000 + 1000 - (Date.now() - start)),
    );
    storage = await context.storageState();
    const video = page.video()!;
    await context.close();
    execFileSync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      await video.path(),
      "-t",
      String(scene.seconds),
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      `${dir}/0${i + 1}.mp4`,
    ]);
    console.log(
      `Recorded scene ${i + 1}/7, ${scene.seconds}s, local simulation.`,
    );
  }
  const manifest = {
    mode: "rehearsal",
    release: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    providerRunIds: [],
    narration: "media/rehearsal/narration.wav",
    captions: JSON.parse(await readFile(`${dir}/captions.json`, "utf8")),
    captionFile: "media/rehearsal/captions.vtt",
    clips: scenes.map((s: any, i: number) => ({
      file: `media/rehearsal/0${i + 1}.mp4`,
      start: s.start,
      seconds: s.seconds,
      caption: s.title,
    })),
    screenshots: shots,
    links: { demo: "", source: "" },
    reviews: { captions: false, redaction: false, intentOutputs: false },
  };
  await writeFile(
    "artifacts/rehearsal-manifest.json",
    JSON.stringify(manifest, null, 2),
  );
  console.log(
    "Seven actual local UI clips and six screenshots recorded. This is not provider evidence.",
  );
} finally {
  await browser.close();
}
