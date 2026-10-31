"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

/** A finite illustrative trace; it never describes or performs a payment. */
export function TransactionDiagram() {
  const [iteration, setIteration] = useState(0);
  return (
    <div className="transaction-diagram">
      <svg
        key={iteration}
        className="transaction-svg"
        viewBox="0 0 500 270"
        role="img"
        aria-label="Illustration: confirmed size M changes to S. The contract gate blocks capture."
      >
        <defs>
          <pattern
            id="signal-grid"
            width="25"
            height="25"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M25 0H0V25"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".08"
            />
          </pattern>
        </defs>
        <rect width="500" height="270" fill="url(#signal-grid)" />
        <path
          d="M35 54V37H52M448 37H465V54M35 220V237H52M448 237H465V220"
          stroke="currentColor"
          strokeOpacity=".35"
          fill="none"
        />
        <text x="62" y="69" className="diagram-label">
          CONFIRMED
        </text>
        <text x="290" y="69" className="diagram-label">
          FINAL MERCHANT STATE
        </text>
        <text x="57" y="164" className="diagram-size">
          M
        </text>
        <text x="292" y="164" className="diagram-size diagram-size-drift">
          S
        </text>
        <path d="M155 126H267" className="diagram-wire" />
        <path d="M155 126H267" pathLength="1" className="diagram-trace" />
        <path d="M259 120L267 126L259 132" className="diagram-arrow" />
        <text x="172" y="112" className="diagram-annotation">
          variant drift
        </text>
        <path d="M333 178V211H392" className="diagram-wire" />
        <path
          d="M333 178V211H392"
          pathLength="1"
          className="diagram-trace diagram-trace-late"
        />
        <path d="M404 192V230M416 192V230" className="diagram-barrier" />
        <path d="M430 211H463" className="diagram-wire diagram-blocked-wire" />
        <circle cx="392" cy="211" r="4" className="diagram-stop" />
        <text x="62" y="211" className="diagram-annotation">
          Original intent stays locked
        </text>
        <text x="373" y="254" className="diagram-label diagram-blocked-label">
          CAPTURE BLOCKED
        </text>
      </svg>
      <button
        className="diagram-replay"
        onClick={() => setIteration((value) => value + 1)}
      >
        <RotateCcw size={12} />
        Replay illustration
      </button>
    </div>
  );
}
