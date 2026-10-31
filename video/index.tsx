import React from "react";
import {
  AbsoluteFill,
  Composition,
  Sequence,
  Video,
  Audio,
  Img,
  staticFile,
  registerRoot,
  useCurrentFrame,
  interpolate,
} from "remotion";
import type { FilmManifest } from "../scripts/lib/film-manifest";
function Film(m: FilmManifest) {
  const frame = useCurrentFrame(),
    time = frame / 30;
  const index = Math.max(
    0,
    m.clips.findIndex((c) => time >= c.start && time < c.start + c.seconds),
  );
  const current = m.clips[index];
  const cue = m.captions.find((c) => time >= c.start && time < c.end);
  const progress = interpolate(frame, [0, 4949], [0, 100]);
  return (
    <AbsoluteFill
      style={{
        background: "#eef2f6",
        color: "#111b27",
        fontFamily: "Arial,sans-serif",
      }}
    >
      <div
        style={{
          height: 104,
          padding: "0 56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          borderBottom: "1px solid #d3dce5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Img
            src={staticFile("brand/comrdy-mark.svg")}
            style={{ width: 40, height: 40 }}
          />
          <strong style={{ fontSize: 32, letterSpacing: -1 }}>COMRDY</strong>
          <span style={{ fontSize: 19, marginLeft: 22, color: "#4c5b70" }}>
            TRANSACTION TEST LAB
          </span>
        </div>
        <div
          style={{
            fontSize: 18,
            color: m.mode === "rehearsal" ? "#805000" : "#34536c",
            background: m.mode === "rehearsal" ? "#fff1cf" : "#edf4fa",
            padding: "14px 20px",
          }}
        >
          {m.mode === "rehearsal"
            ? "LOCAL REHEARSAL · SIMULATED OUTCOMES"
            : "PAYPAL SANDBOX · SYNTHETIC NARRATION"}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 132,
          left: 56,
          right: 56,
          display: "flex",
          alignItems: "baseline",
          gap: 22,
        }}
      >
        <span style={{ fontSize: 20, color: "#165dff", fontWeight: 700 }}>
          0{index + 1} / 07
        </span>
        <h1 style={{ fontSize: 32, letterSpacing: -0.7, margin: 0 }}>
          {current?.caption || "Test the purchase against the promise."}
        </h1>
      </div>
      {m.clips.map((clip, i) => (
        <Sequence
          key={clip.file}
          from={Math.round(clip.start * 30)}
          durationInFrames={Math.round(clip.seconds * 30)}
        >
          <div
            style={{
              position: "absolute",
              left: 56,
              right: 56,
              top: 188,
              bottom: 150,
              overflow: "hidden",
              border: "1px solid #cdd7e2",
              background: "white",
              boxShadow: "0 12px 30px #1732540a",
            }}
          >
            <Video
              src={staticFile(clip.file)}
              muted
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        </Sequence>
      ))}
      {m.narration && <Audio src={staticFile(m.narration)} />}
      {cue && (
        <div
          style={{
            position: "absolute",
            left: 160,
            right: 160,
            bottom: 58,
            textAlign: "center",
            fontSize: 29,
            lineHeight: 1.25,
            fontWeight: 500,
          }}
        >
          {cue.text}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 56,
          right: 56,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          color: "#5a687b",
        }}
      >
        <span>
          {m.mode === "rehearsal"
            ? "No provider calls · Draft synthetic voice · Not submission evidence"
            : m.links.demo + "  ·  " + m.links.source}
        </span>
        <span>
          SOURCE {m.release.slice(0, 8)}
          {m.mode === "rehearsal" ? " + LOCAL CHANGES" : ""}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          height: 4,
          width: progress + "%",
          background: "#165dff",
        }}
      />
    </AbsoluteFill>
  );
}
registerRoot(() => (
  <Composition
    id="COMRDY"
    component={Film}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={4950}
    defaultProps={{
      mode: "rehearsal",
      clips: [],
      captions: [],
      narration: "",
      captionFile: "",
      release: "UNQUALIFIED",
      providerRunIds: [],
      screenshots: [],
      links: { demo: "", source: "" },
      reviews: { captions: false, redaction: false, intentOutputs: false },
    }}
  />
));
