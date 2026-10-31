import nextEnv from "@next/env";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import OpenAI from "openai";
nextEnv.loadEnvConfig(process.cwd());
if (!process.argv.includes("--qualified"))
  throw new Error(
    "Use --qualified only after every factual script claim is supported by release evidence.",
  );
if (Date.now() >= Date.parse("2027-01-06T00:00:00Z"))
  throw new Error(
    "This one-time production script used a retired speech endpoint; migrate before regenerating.",
  );
const scenes = JSON.parse(
  await readFile("submission/video/narration.json", "utf8"),
);
const client = new OpenAI({ maxRetries: 0 });
await mkdir("public/media/narration", { recursive: true });
for (const [index, scene] of scenes.entries()) {
  const audio = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "cedar",
    input: scene.text,
    instructions:
      "Calm, precise, confident product documentary narration. Natural English. Pronounce COMRDY as com ready. Leave a slight pause between sentences. No sales theatrics.",
    response_format: "wav",
  });
  await writeFile(
    `public/media/narration/${String(index + 1).padStart(2, "0")}.wav`,
    Buffer.from(await audio.arrayBuffer()),
  );
}
console.log(
  "Seven synthetic narration segments generated. Measure and edit timing before assembling. AI voice disclosure is mandatory.",
);
