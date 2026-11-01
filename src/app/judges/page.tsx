import type { Metadata } from "next";
import { JudgeWorkbench } from "./workbench";

export const metadata: Metadata = {
  title: "Judge workbench — Commerce Ready",
  description:
    "Inspect saved COMRDY evidence, run the local readiness bench, and follow the controlled checkout journey. Payment facts and evidence sources remain separate.",
};

export default function JudgesPage() {
  return <JudgeWorkbench />;
}
