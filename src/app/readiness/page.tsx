import type { Metadata } from "next";
import {
  READINESS_SCENARIOS,
  READINESS_SCHEMA_VERSION,
} from "../../core/readiness";
import { ReadinessBench } from "./readiness-bench";

export const metadata: Metadata = {
  title: "Commerce readiness bench",
  description:
    "Execute a bounded synthetic checkout suite against COMRDY's actual invariant engine. Inspect every condition without payment or agent calls.",
};

export default function ReadinessPage() {
  return (
    <ReadinessBench
      scenarios={READINESS_SCENARIOS}
      schemaVersion={READINESS_SCHEMA_VERSION}
    />
  );
}
