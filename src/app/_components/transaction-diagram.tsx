"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

const stages = [
  {
    title: "Confirmed contract",
    detail: "Human-reviewed purchase constraints",
    note: "INPUT",
  },
  {
    title: "Controlled shopper",
    detail: "Agent actions + merchant observations",
    note: "EXECUTE",
  },
  {
    title: "Verification gate",
    detail: "Every hard constraint must pass",
    note: "CHECK",
  },
  {
    title: "Evidence record",
    detail: "Contract, observations and decision",
    note: "INSPECT",
  },
];

/** A finite explanatory trace. No agent, merchant or payment calls are made. */
export function TransactionDiagram() {
  const [iteration, setIteration] = useState(0);
  return (
    <div className="transaction-diagram">
      <div className="test-bench">
        <svg
          key={iteration}
          className="bench-rail"
          viewBox="0 0 72 352"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path className="diagram-wire" d="M31 42V306" />
          <path className="bench-control-wire" d="M31 42H61V218H31" />
          <path className="diagram-trace" pathLength="1" d="M31 42V306" />
          <path
            className="diagram-trace bench-control-trace"
            pathLength="1"
            d="M31 42H61V218H31"
          />
          <g className="bench-node">
            <path d="M21 29H36L42 35V54H21Z" />
            <path d="M35 29V36H42M26 42H36M26 47H33" />
          </g>
          <g className="bench-node">
            <path d="M19 119H43V142H19Z" />
            <path d="M19 125H43M25 130L29 134L25 138M33 138H37" />
          </g>
          <g className="bench-gate">
            <path d="M19 205H28V231H19M43 205H34V231H43" />
            <path d="M25 218H37" />
          </g>
          <g className="bench-node bench-evidence">
            <path d="M20 294H42V319H20Z" />
            <path d="M25 301H37M25 307H37M25 313H33" />
          </g>
        </svg>
        <ol className="bench-stages">
          {stages.map((stage, index) => (
            <li
              key={stage.note}
              className={index === 2 ? "bench-stage-gate" : ""}
            >
              <div>
                <span className="bench-stage-index">0{index + 1}</span>
                <span className="bench-stage-note">{stage.note}</span>
              </div>
              <h3>{stage.title}</h3>
              <p>{stage.detail}</p>
            </li>
          ))}
        </ol>
      </div>
      <div className="bench-controls">
        <span>One contract. A traceable decision.</span>
        <button
          className="diagram-replay"
          onClick={() => setIteration((value) => value + 1)}
        >
          <RotateCcw size={12} />
          Replay illustration
        </button>
      </div>
    </div>
  );
}
