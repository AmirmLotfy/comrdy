import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDot,
  FileCheck2,
} from "lucide-react";
import { AppShell, PageHeading } from "../_components/ui";

export const metadata: Metadata = { title: "Evidence model" };

export default function DocsPage() {
  return (
    <AppShell title="Documentation">
      <PageHeading
        eyebrow="THE EVIDENCE MODEL"
        title="Know what the result means."
        description="A short guide to the contract, the checks, and the boundaries of this prototype."
      />
      <div className="docs-layout">
        <nav className="docs-contents" aria-label="Documentation sections">
          <span className="mini-label">ON THIS PAGE</span>
          <a href="#start">Run your first test</a>
          <a href="#readiness">Executable readiness checks</a>
          <a href="#contract">The intent contract</a>
          <a href="#evidence">Read the evidence</a>
          <a href="#payment">Payment boundaries</a>
          <a href="#recovery">Bounded recovery</a>
          <a href="#limits">What is not proved</a>
        </nav>
        <article className="docs-article">
          <section id="start">
            <span className="docs-section-index">01 / START HERE</span>
            <h2>A complete test in three steps.</h2>
            <ol className="docs-steps">
              <li>
                <strong>Compile and confirm the intent.</strong>
                <p>
                  Use the example instruction in the test lab. Review the
                  extracted constraints, then confirm them. The run uses this
                  locked contract.
                </p>
              </li>
              <li>
                <strong>Choose a controlled fault.</strong>
                <p>
                  A variant fault changes medium to small. A shipping fault
                  pushes the delivered total beyond the limit. The no-fault case
                  keeps the state unchanged.
                </p>
              </li>
              <li>
                <strong>Inspect the decision.</strong>
                <p>
                  Open a lineage value or timeline event to see the source
                  observation. Check the payment panel to distinguish simulated
                  behavior from provider evidence.
                </p>
              </li>
            </ol>
            <Link className="button dark" href="/demo">
              Open the test lab
              <ArrowRight size={15} />
            </Link>
          </section>
          <section id="readiness">
            <span className="docs-section-index">REPRODUCIBLE CHECKS</span>
            <h2>Make the failure cases executable.</h2>
            <p>
              The readiness bench executes twelve synthetic scenarios against
              the shared contract and payment-binding engine. It covers exact
              budget boundaries, wrong variants and quantities, missing or stale
              evidence, subscriptions, inventory and mismatched payment
              bindings. Run the suite to see actual decisions; the initial
              screen reports zero executed cases.
            </p>
            <p>
              The what-if controls change only bounded checkout facts under the
              unchanged contract. Reports include exact inputs and hashes for
              reproduction. No agent, PayPal request, capture or void is invoked
              by this bench.
            </p>
            <div className="overview-actions">
              <Link href="/readiness" className="button dark">
                Open the readiness bench <ArrowUpRight size={15} />
              </Link>
              <a
                href="/verification/comrdy.postman_collection.json"
                download
                className="text-link"
              >
                Download the Postman kit <ArrowUpRight size={15} />
              </a>
            </div>
            <p>
              The Postman collection checks this bounded HTTP surface and
              forbidden public financial commands. Provider qualification
              remains a separate task. The{" "}
              <Link href="/judges" className="text-link">
                judge workbench
              </Link>{" "}
              lists accessible saved records with separate authorization,
              capture and merchant-order facts.
            </p>
          </section>
          <section id="contract">
            <span className="docs-section-index">02 / THE SOURCE OF TRUTH</span>
            <h2>An instruction becomes a contract.</h2>
            <p>
              The intent contract is a structured version of what the shopper is
              allowed to do. It separates exact constraints from unresolved
              information. A candidate contract needs human confirmation before
              execution.
            </p>
            <div className="docs-example">
              <span className="mini-label">EXAMPLE CONSTRAINT</span>
              <div>
                <span>Customer says</span>
                <strong>“No substitutions or subscriptions.”</strong>
              </div>
              <div>
                <span>Verifier checks</span>
                <code>substitutionOccurred = false; subscription = false</code>
              </div>
            </div>
            <p>
              The model does not approve its own purchase. The evaluator checks
              the recorded state using deterministic rules. A missing required
              hard constraint cannot be treated as satisfied.
            </p>
            <p>
              In local simulation, the compiler supports a fixed example. It
              does not claim general language understanding.
            </p>
          </section>
          <section id="evidence">
            <span className="docs-section-index">03 / READ THE RESULT</span>
            <h2>Start with the first divergence.</h2>
            <p>
              Intent Lineage aligns the same attributes across checkpoints. A
              highlighted cell shows where the observed value first moves
              outside the displayed constraint. Later cells keep that divergence
              visible.
            </p>
            <dl className="docs-definitions">
              <div>
                <dt>
                  <Check size={16} />
                  Allow
                </dt>
                <dd>
                  The available required checks passed for that exact attempt.
                  Read the payment state separately.
                </dd>
              </div>
              <div>
                <dt>
                  <ArrowRight size={16} />
                  Deny
                </dt>
                <dd>
                  At least one hard constraint failed. The reason and recorded
                  observation explain the block.
                </dd>
              </div>
              <div>
                <dt>
                  <CircleDot size={16} />
                  Review
                </dt>
                <dd>
                  Required evidence is missing or unresolved. The attempt must
                  not proceed to capture.
                </dd>
              </div>
            </dl>
            <p>
              Raw evidence includes the run environment. A local payload is a
              local observation; it is not a PayPal response or proof of a real
              payment.
            </p>
          </section>
          <section id="payment">
            <span className="docs-section-index">04 / PAYMENT BOUNDARIES</span>
            <h2>Authorization and capture are different facts.</h2>
            <p>
              A PayPal authorization is not the completed charge. The Sandbox
              integration can verify a transaction before deciding whether to
              capture it. Denied authorizations require their own cancellation
              and status reconciliation.
            </p>
            <div className="environment-comparison">
              <div>
                <span className="environment-badge">
                  <CircleDot size={12} />
                  LOCAL SIMULATION
                </span>
                <p>
                  Exercises local contracts, merchant state, and decisions. No
                  provider IDs or payment outcomes are invented.
                </p>
              </div>
              <div>
                <span className="environment-badge sandbox">
                  <CircleDot size={12} />
                  PAYPAL SANDBOX
                </span>
                <p>
                  Requires a configured Sandbox connection. Only actual provider
                  responses establish authorization, capture, or void status.
                </p>
              </div>
            </div>
            <p>
              Sandbox funds are not real money. A successful Sandbox run does
              not certify a production integration.
            </p>
            <a
              className="text-link"
              href="https://developer.paypal.com/v5/checkout/auth-capture/"
              target="_blank"
              rel="noreferrer"
            >
              PayPal’s authorization and capture documentation
              <ArrowUpRight size={14} />
            </a>
          </section>
          <section id="recovery">
            <span className="docs-section-index">05 / A SEPARATE ATTEMPT</span>
            <h2>Recover without changing the promise.</h2>
            <p>
              The wrong-variant case supports one bounded recovery: restore the
              exact confirmed variant and verify a fresh attempt. The original
              size, quantity, and spending limit remain fixed.
            </p>
            <p>
              Recovery creates another run. Compare both to inspect the changed
              state and decision. A recovery from an injected fault does not
              prove that an underlying merchant defect has been fixed.
            </p>
          </section>
          <section id="limits">
            <span className="docs-section-index">06 / EVIDENCE LIMITS</span>
            <h2>Specific proof. Explicit limits.</h2>
            <ul className="docs-limit-list">
              <li>
                This is a controlled merchant prototype, not a production
                payment service.
              </li>
              <li>
                Seeded faults demonstrate particular behaviors; they do not
                measure how often those failures occur in real commerce.
              </li>
              <li>
                A confirmed contract can still misrepresent the original
                instruction. Review matters.
              </li>
              <li>
                A hash can identify unchanged evidence; it does not establish
                that the source observation was truthful.
              </li>
              <li>
                Local simulation does not prove live AI execution, real browser
                execution, or PayPal connectivity.
              </li>
              <li>
                Recorded runs demonstrate their own environment and
                configuration, not universal agent reliability.
              </li>
            </ul>
            <div className="docs-end">
              <FileCheck2 size={22} />
              <div>
                <strong>Every claim should have a checkpoint.</strong>
                <p>Start a run and inspect the evidence for yourself.</p>
              </div>
              <Link href="/demo" className="button secondary small">
                Run a test
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </article>
      </div>
    </AppShell>
  );
}
