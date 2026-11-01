/** Frame-based and deterministic; no timers or random animation. */
export const reveal = (frame: number, duration: number) =>
  1 - Math.pow(1 - Math.max(0, Math.min(1, frame / duration)), 4);

export const chapterProgress = (time: number, start: number, seconds: number) =>
  Math.max(0, Math.min(1, (time - start) / seconds));

/** Balanced two-line captions; sentence text is never shortened. */
export function captionLines(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 44) return [clean];
  const words = clean.split(" ");
  if (words.length === 1) return [clean];
  let best = 1;
  let score = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ");
    const right = words.slice(i).join(" ");
    const candidate = Math.abs(left.length - right.length);
    if (candidate < score) {
      best = i;
      score = candidate;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}
