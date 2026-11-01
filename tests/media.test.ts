import test from "node:test";
import assert from "node:assert/strict";
import {
  validateFilmManifest,
  type FilmManifest,
} from "../scripts/lib/film-manifest";
import { assertLatestConsecutiveRuns } from "../scripts/lib/consecutive";
function manifest(): FilmManifest {
  return {
    mode: "rehearsal",
    release: "a".repeat(40),
    providerRunIds: [],
    narration: "draft.wav",
    captionFile: "draft.vtt",
    captions: Array.from({ length: 10 }, (_, i) => ({
      start: i * 10,
      end: i * 10 + 5,
      text: "Caption",
    })),
    clips: [12, 23, 25, 30, 35, 20, 20].map((seconds, i, a) => ({
      file: `${i}.mp4`,
      seconds,
      start: a.slice(0, i).reduce((a, b) => a + b, 0),
      caption: "Scene",
    })),
    screenshots: Array.from({ length: 6 }, (_, i) => ({
      file: `${i}.png`,
      label: "Local",
      reviewed: false,
    })),
    links: { demo: "", source: "" },
    reviews: { captions: false, redaction: false, intentOutputs: false },
  };
}
test("rehearsal cannot become a release by changing its label", () => {
  const m = manifest();
  validateFilmManifest(m);
  m.mode = "release";
  assert.throws(() => validateFilmManifest(m), /review/);
  m.mode = "rehearsal";
  m.providerRunIds = ["fake"];
  assert.throws(() => validateFilmManifest(m), /cannot claim/);
});
test("review requires qualified manifest inputs while release still requires human approval", () => {
  const m = manifest();
  m.mode = "review";
  assert.throws(() => validateFilmManifest(m));
  m.providerRunIds = ["original", "recovery", "shipping"];
  m.links = {
    demo: "https://comrdy.vercel.app",
    source: "https://github.com/AmirmLotfy/comrdy",
  };
  validateFilmManifest(m);
  m.mode = "release";
  assert.throws(() => validateFilmManifest(m), /Human.*review/);
  m.reviews = { captions: true, redaction: true, intentOutputs: true };
  assert.throws(() => validateFilmManifest(m), /Review all public screenshots/);
  m.screenshots.forEach((shot) => {
    shot.reviewed = true;
  });
  validateFilmManifest(m);
  m.mode = "review";
  assert.throws(() => validateFilmManifest(m), /approvals pending/);
});
test("review does not relax source, public link, or caption validation", () => {
  const m = manifest();
  m.mode = "review";
  m.providerRunIds = ["original", "recovery", "shipping"];
  m.links = {
    demo: "http://localhost",
    source: "https://github.com/AmirmLotfy/comrdy",
  };
  assert.throws(() => validateFilmManifest(m), /public HTTPS/);
  m.links.demo = "https://comrdy.vercel.app";
  m.release = "unqualified";
  assert.throws(() => validateFilmManifest(m), /source commit/);
  m.release = "a".repeat(40);
  m.captions[1]!.start = 0;
  assert.throws(() => validateFilmManifest(m), /caption timing/);
});
test("film rejects broken continuity, overlapping captions and duplicate screenshots", () => {
  const m = manifest();
  m.clips[2]!.start++;
  assert.throws(() => validateFilmManifest(m), /continuous/);
  const n = manifest();
  n.captions[1]!.start = 1;
  assert.throws(() => validateFilmManifest(n), /caption/);
  const o = manifest();
  o.screenshots[1]!.file = o.screenshots[0]!.file;
  assert.throws(() => validateFilmManifest(o), /distinct/);
});
test("consecutive qualification cannot cherry-pick around the latest failed attempt", () => {
  const all = ["none", "variant", "shipping"].flatMap((fault) =>
    Array.from({ length: 4 }, (_, i) => ({
      id: fault + i,
      mode: "sandbox",
      fault,
      createdAt: `2026-11-01T00:00:0${i}Z`,
      execution: { revision: "release" },
    })),
  );
  const latest = all.filter((r) => !r.id.endsWith("0")).map((r) => r.id);
  assertLatestConsecutiveRuns(all, latest, "release");
  assert.throws(
    () =>
      assertLatestConsecutiveRuns(
        all,
        latest.map((id) => (id === "none3" ? "none0" : id)),
        "release",
      ),
    /latest three/,
  );
});

test("caption asset must match the rendered text AND time boundaries", async () => {
  const { validateCaptionFile } = await import("../scripts/lib/film-manifest");
  const captions = [{ start: 0, end: 1.5, text: "Test the purchase." }];
  const vtt = "WEBVTT\n\n00:00:00.000 --> 00:00:01.500\nTest the purchase.\n";
  validateCaptionFile(vtt, captions);
  assert.throws(
    () => validateCaptionFile(vtt.replace("01.500", "02.500"), captions),
    /timing differs/,
  );
  assert.throws(
    () => validateCaptionFile(vtt.replace("purchase", "payment"), captions),
    /text differs/,
  );
});
