import assert from "node:assert/strict";
export type FilmManifest = {
  mode: "release" | "review" | "rehearsal";
  release: string;
  providerRunIds: string[];
  narration: string;
  captions: { start: number; end: number; text: string }[];
  captionFile: string;
  clips: { file: string; start: number; seconds: number; caption: string }[];
  screenshots: { file: string; label: string; reviewed: boolean }[];
  links: { demo: string; source: string };
  reviews: { captions: boolean; redaction: boolean; intentOutputs: boolean };
};
export function validateFilmManifest(m: FilmManifest) {
  assert.ok(
    ["release", "review", "rehearsal"].includes(m.mode),
    "Explicit release/review/rehearsal mode required",
  );
  assert.match(m.release, /^[a-f0-9]{40}$/, "Full source commit required");
  assert.equal(m.clips.length, 7, "Seven actual clips required");
  let end = 0;
  for (const clip of m.clips) {
    assert.equal(clip.start, end, "Clips must be continuous");
    assert.ok(clip.seconds > 0 && clip.caption.trim() && clip.file);
    end += clip.seconds;
  }
  assert.equal(end, 165, "Film must be 165 seconds");
  assert.ok(
    m.narration && m.captionFile && m.captions.length > 7,
    "Narration and full captions required",
  );
  let previous = 0;
  for (const cue of m.captions) {
    assert.ok(
      cue.start >= previous &&
        cue.end > cue.start &&
        cue.end <= 165 &&
        cue.text.trim(),
      "Invalid caption timing",
    );
    previous = cue.end;
  }
  assert.equal(m.screenshots.length, 6, "Six screenshots required");
  assert.equal(
    new Set(m.screenshots.map((s) => s.file)).size,
    6,
    "Screenshots must be distinct",
  );
  if (m.mode === "release") {
    assert.ok(
      m.reviews.captions && m.reviews.redaction && m.reviews.intentOutputs,
      "Human caption/redaction/intent review required",
    );
    assert.ok(
      m.screenshots.every((s) => s.reviewed && s.label.trim()),
      "Review all public screenshots",
    );
  }
  if (m.mode === "review") {
    assert.ok(
      Object.values(m.reviews).every((reviewed) => reviewed === false) &&
        m.screenshots.every((shot) => shot.reviewed === false),
      "Review copy must keep human approvals pending",
    );
  }
  if (m.mode !== "rehearsal") {
    assert.ok(
      m.screenshots.every((shot) => shot.label.trim()),
      "Screenshot labels required",
    );
    assert.ok(
      m.providerRunIds.length >= 3 &&
        new Set(m.providerRunIds).size === m.providerRunIds.length,
    );
    for (const link of Object.values(m.links)) {
      const url = new URL(link);
      assert.ok(
        url.protocol === "https:" &&
          !/localhost|example\.|\.invalid$|127\.0\.0\.1/.test(url.hostname),
        "Real public HTTPS links required",
      );
    }
  } else {
    assert.equal(
      m.providerRunIds.length,
      0,
      "Rehearsal cannot claim provider evidence",
    );
  }
}

export function validateCaptionFile(
  text: string,
  captions: FilmManifest["captions"],
) {
  const blocks = text
    .replaceAll("\r\n", "\n")
    .trim()
    .split(/\n\s*\n/);
  assert.equal(
    blocks.shift()?.trim(),
    "WEBVTT",
    "Caption asset must be WebVTT",
  );
  const time = (value: string) => {
    assert.match(value, /^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    const [h, m, s] = value.split(":").map(Number);
    assert.ok(m! < 60 && s! < 60);
    return h! * 3600 + m! * 60 + s!;
  };
  assert.equal(
    blocks.length,
    captions.length,
    "Caption file cue count differs",
  );
  blocks.forEach((block, index) => {
    const [timing, ...lines] = block.split("\n");
    const parts = timing!.split(" --> ");
    assert.equal(parts.length, 2, "Caption timing line required");
    const cue = captions[index]!;
    assert.ok(
      Math.abs(time(parts[0]!) - cue.start) <= 0.001 &&
        Math.abs(time(parts[1]!) - cue.end) <= 0.001,
      "Caption file timing differs from rendered cue",
    );
    assert.equal(
      lines.join(" ").replace(/\s+/g, " ").trim(),
      cue.text.replace(/\s+/g, " ").trim(),
      "Caption text differs from rendered cue",
    );
  });
}
