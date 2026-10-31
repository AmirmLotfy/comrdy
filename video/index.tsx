import React from "react";
import {
  AbsoluteFill,
  Composition,
  Sequence,
  Video,
  Audio,
  staticFile,
  registerRoot,
} from "remotion";
export type FilmProps = {
  clips: { file: string; start: number; seconds: number; caption: string }[];
  narration: string;
  release: string;
};
function Film({ clips, narration, release }: FilmProps) {
  return (
    <AbsoluteFill
      style={{
        background: "#fff",
        color: "#0c1117",
        fontFamily: "Arial,sans-serif",
      }}
    >
      {clips.map((clip, i) => (
        <Sequence
          key={i}
          from={Math.round(clip.start * 30)}
          durationInFrames={Math.round(clip.seconds * 30)}
        >
          <AbsoluteFill>
            <Video
              src={staticFile(clip.file)}
              muted
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 40,
                left: 80,
                right: 80,
                background: "rgba(255,255,255,.96)",
                padding: "18px 24px",
                border: "1px solid #d9dee5",
                fontSize: 30,
              }}
            >
              {clip.caption}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}
      {narration && <Audio src={staticFile(narration)} />}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 28,
          fontSize: 17,
          background: "#fff",
          padding: 8,
        }}
      >
        PayPal Sandbox · AI narration · {release}
      </div>
    </AbsoluteFill>
  );
}
const Root = () => (
  <Composition
    id="COMRDY"
    component={Film}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={4950}
    defaultProps={{ clips: [], narration: "", release: "UNQUALIFIED" }}
  />
);
registerRoot(Root);
