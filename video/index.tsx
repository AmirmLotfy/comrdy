import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Img,
  Sequence,
  Video,
  registerRoot,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { FilmManifest } from "../scripts/lib/film-manifest";
import {
  captionLines,
  chapterProgress,
  reveal,
} from "../scripts/lib/film-presentation";
import { useFilmFont } from "./use-film-font";

const FPS = 30;
const FRAMES = 165 * FPS;
const BLUE = "#0b63f6";

/** Only editorial framing lives here. All outcomes remain in the actual footage. */
export function Film({
  manifest: m,
  reducedMotion = false,
}: {
  manifest: FilmManifest;
  reducedMotion?: boolean;
}) {
  useFilmFont();
  const frame = useCurrentFrame();
  const time = frame / FPS;
  const index = m.clips.findIndex(
    (clip) => time >= clip.start && time < clip.start + clip.seconds,
  );
  const current = m.clips[index];
  const cue = m.captions.find(
    (caption) => time >= caption.start && time < caption.end,
  );
  const chapterFrame = current ? frame - Math.round(current.start * FPS) : 0;
  const entrance = reducedMotion ? 1 : reveal(chapterFrame, 10);
  const closing = time >= 160;
  const rehearsal = m.mode === "rehearsal";
  const review = m.mode === "review";
  return (
    <AbsoluteFill
      style={{
        background: "#f4f6f9",
        color: "#0c1117",
        fontFamily: '"COMRDY Film", sans-serif',
        fontWeight: 500,
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        @media (prefers-reduced-motion: reduce) {
          .editorial-motion { transform: none !important; opacity: 1 !important; }
        }
      `}</style>
      {/* A 60px rail keeps chapter context and disclosure outside the product. */}
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 28px",
          background: "#fbfcfd",
          borderBottom: "1px solid #d9dee5",
        }}
      >
        <Img
          src={staticFile("brand/comrdy-mark.svg")}
          style={{ width: 29, height: 29 }}
        />
        <span style={{ fontSize: 20, fontWeight: 750, letterSpacing: -0.7 }}>
          COMRDY
        </span>
        <div
          style={{
            width: 1,
            height: 22,
            background: "#d9dee5",
            margin: "0 5px",
          }}
        />
        <div
          className="editorial-motion"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            flex: 1,
            opacity: entrance,
            transform: `translateY(${(1 - entrance) * 7}px)`,
          }}
        >
          <span
            style={{
              color: BLUE,
              fontSize: 15,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {String(Math.max(0, index) + 1).padStart(2, "0")}
          </span>
          <span style={{ fontSize: 19, letterSpacing: -0.3 }}>
            {closing
              ? "Commerce Ready · Explore the demo and source"
              : current?.caption || "Test the purchase against the promise."}
          </span>
        </div>
        <div
          style={{
            color: rehearsal ? "#785000" : "#34475c",
            fontSize: 16,
            fontWeight: 650,
            letterSpacing: 0.25,
            whiteSpace: "nowrap",
            padding: "7px 11px",
            background: rehearsal ? "#fff0cc" : "#eaf0f7",
          }}
        >
          {rehearsal
            ? "REHEARSAL · SIMULATED OUTCOMES · SYNTHETIC NARRATION"
            : "PAYPAL SANDBOX · SYNTHETIC NARRATION"}
        </div>
      </div>
      {/* Author closeups in reviewed source clips. No speculative crops/outcome overlays. */}
      <div
        style={{
          position: "absolute",
          top: 60,
          bottom: 148,
          left: 0,
          right: 0,
          background: "#e9edf2",
        }}
      >
        {m.clips.map((clip, i) => (
          <Sequence
            key={`${clip.file}-${i}`}
            from={Math.round(clip.start * FPS)}
            durationInFrames={Math.round(clip.seconds * FPS)}
          >
            <Footage file={clip.file} />
          </Sequence>
        ))}
        {closing && !rehearsal && (
          <AbsoluteFill
            style={{
              background: "#f4f6f9",
              alignItems: "center",
              justifyContent: "center",
              gap: 32,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <Img
                src={staticFile("brand/comrdy-mark.svg")}
                style={{ width: 88, height: 88 }}
              />
              <span
                style={{ fontSize: 96, fontWeight: 750, letterSpacing: -5 }}
              >
                COMRDY
              </span>
            </div>
            <div style={{ fontSize: 42, color: "#536173", marginBottom: 35 }}>
              Commerce Ready
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  color: BLUE,
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                EXPLORE THE DEMO
              </div>
              <div style={{ fontSize: 68, fontWeight: 650, letterSpacing: -2 }}>
                {m.links.demo}
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <div
                style={{
                  color: "#536173",
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                READ THE SOURCE
              </div>
              <div
                style={{ fontSize: 52, fontWeight: 550, letterSpacing: -1.2 }}
              >
                {m.links.source}
              </div>
            </div>
          </AbsoluteFill>
        )}
        <div
          style={{
            position: "absolute",
            inset: "auto 0 0",
            height: 1,
            background: "#cfd8e3",
          }}
        />
      </div>
      {m.narration && <Audio src={staticFile(m.narration)} />}
      {/* Captions cannot cover merchant amounts, size, or provider evidence. */}
      <div
        style={{
          position: "absolute",
          left: 56,
          right: 56,
          bottom: 38,
          height: 104,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cue && (
          <div
            style={{
              fontSize: 40,
              lineHeight: 1.18,
              textAlign: "center",
              fontWeight: 550,
              letterSpacing: -0.35,
            }}
          >
            {captionLines(cue.text).map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 28,
          right: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color: "#536173",
          letterSpacing: 0.15,
        }}
      >
        <span
          style={{
            color: closing ? BLUE : undefined,
            fontWeight: closing ? 650 : 500,
          }}
        >
          {rehearsal
            ? "No provider calls · Not submission evidence · Caption and redaction review required"
            : `${m.links.demo}  ·  ${m.links.source}`}
        </span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          SOURCE {m.release.slice(0, 8)}
          {rehearsal ? " + LOCAL CHANGES" : ""}
        </span>
      </div>
      {review && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 5,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 750,
            color: "#7a3d00",
          }}
        >
          REVIEW COPY – NOT APPROVED
        </div>
      )}
      {/* Editorial progress, never a test score. */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          display: "flex",
          gap: 3,
        }}
      >
        {m.clips.map((clip, i) => (
          <div
            key={i}
            style={{
              flex: clip.seconds,
              background: "#d9e0e9",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: BLUE,
                transformOrigin: "left",
                transform: `scaleX(${reducedMotion ? (time >= clip.start ? 1 : 0) : chapterProgress(time, clip.start, clip.seconds)})`,
              }}
            />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function Footage({ file }: { file: string }) {
  return (
    <AbsoluteFill>
      <Video
        src={staticFile(file)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </AbsoluteFill>
  );
}

const defaults: FilmManifest = {
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
};
const MotionFilm = (manifest: FilmManifest) => <Film manifest={manifest} />;
const StillMotionFilm = (manifest: FilmManifest) => (
  <Film manifest={manifest} reducedMotion />
);
registerRoot(() => (
  <>
    <Composition
      id="COMRDY"
      component={MotionFilm}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={FRAMES}
      defaultProps={defaults}
    />
    <Composition
      id="COMRDYReducedMotion"
      component={StillMotionFilm}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={FRAMES}
      defaultProps={defaults}
    />
  </>
));
