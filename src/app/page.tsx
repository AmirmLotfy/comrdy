import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDot,
  GitBranch,
  Layers3,
  MoveRight,
} from "lucide-react";
import { Lineage } from "./_components/lineage";
import { Footer, MarketingNav, StatusPill } from "./_components/ui";
import { DEFAULT_MANDATE, type Run } from "./_components/types";

const illustration: Run = {
  id: "illustrative-example",
  mode: "simulation",
  fault: "variant",
  status: "illustration",
  contract: {
    mandate: DEFAULT_MANDATE,
    size: "M",
    maxTotalMinor: 16000,
    currency: "USD",
  },
  snapshots: [
    {
      checkpoint: "CHECKOUT",
      size: "M",
      totalMinor: 14800,
      revision: "1",
      source: "Illustrative checkout",
    },
    {
      checkpoint: "AUTHORIZED",
      size: "M",
      totalMinor: 14800,
      revision: "1",
      source: "Illustrative authorization checkpoint",
    },
    {
      checkpoint: "FINAL_CHECK",
      size: "S",
      totalMinor: 14800,
      revision: "2",
      source: "Illustrative merchant state after authorization",
    },
  ],
  events: [],
  decision: { verdict: "DENY", reason: "Requested size M; observed size S." },
  payment: { status: "ILLUSTRATION", authorizationId: null, captureId: null },
};

export default function Home() {
  return (
    <>
      <MarketingNav />
      <main id="main">
        <section className="hero container">
          <div className="hero-kicker">
            <span className="small-blue-rule" /> TRANSACTION ASSURANCE FOR AI
            CHECKOUT
          </div>
          <h1>
            A payment can succeed.
            <br />
            The purchase can still be wrong.
          </h1>
          <p className="hero-description">
            Test whether an AI shopper keeps the customer’s promise. Find the
            first divergence, inspect the evidence, and check the purchase
            before capture.
          </p>
          <div className="hero-actions">
            <Link href="/demo" className="button brand large">
              Run the failure case
              <ArrowUpRight size={17} />
            </Link>
            <Link href="/docs" className="button secondary large">
              Explore the evidence model
              <ArrowRight size={16} />
            </Link>
          </div>
          <p className="hero-scope">
            <CircleDot size={12} />
            Controlled demo merchant<span>·</span>Explicit simulation labels
            <span>·</span>No real money
          </p>
        </section>
        <section
          className="hero-evidence container"
          aria-label="Illustration of a wrong-variant purchase"
        >
          <div className="product-window">
            <div className="product-window-bar">
              <div>
                <GitBranch size={16} />
                <strong>Ocean Shell / intent verification</strong>
              </div>
              <span>ILLUSTRATIVE EXAMPLE</span>
            </div>
            <div className="example-mandate">
              <span className="mini-label">THE CUSTOMER ASKED</span>
              <p>“Blue. Size M. Exactly one. No more than $160 delivered.”</p>
              <StatusPill verdict="DENY">Outside the contract</StatusPill>
            </div>
            <Lineage run={illustration} illustrative />
            <div className="example-bottom">
              <span>
                <Check size={15} />
                The amount is within budget.
              </span>
              <strong>But the size changed from M to S.</strong>
              <Link href="/demo">
                Inspect a working run
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
        <section id="mechanism" className="mechanism-section container">
          <div className="section-intro">
            <p className="eyebrow">A DIFFERENT DEFINITION OF DONE</p>
            <h2>
              Follow the intent.
              <br />
              Verify the outcome.
            </h2>
            <p>
              Completion tells you the flow worked. The contract tells you
              whether it did what the customer actually asked.
            </p>
          </div>
          <div className="mechanism-steps">
            <article>
              <span className="step-index">01</span>
              <div>
                <h3>Make the promise explicit.</h3>
                <p>
                  Turn a purchase instruction into inspectable constraints.
                  Confirm the size, quantity, and delivered-total limit before
                  the run.
                </p>
                <span className="step-detail">Human-confirmed contract</span>
              </div>
            </article>
            <article>
              <span className="step-index">02</span>
              <div>
                <h3>Watch the transaction change.</h3>
                <p>
                  Introduce a controlled merchant fault. Follow the actual
                  observations from selection through checkout.
                </p>
                <span className="step-detail">
                  Versioned state + source evidence
                </span>
              </div>
            </article>
            <article>
              <span className="step-index">03</span>
              <div>
                <h3>Keep the decision deterministic.</h3>
                <p>
                  Check the observed state against the confirmed contract.
                  Missing required evidence cannot become a pass.
                </p>
                <span className="step-detail">Allow, review, or deny</span>
              </div>
            </article>
          </div>
        </section>
        <section className="payment-story">
          <div className="container payment-story-inner">
            <div>
              <p className="eyebrow">AT THE PAYMENT BOUNDARY</p>
              <h2>
                Permission to authorize.
                <br />A reason to capture.
              </h2>
              <p>
                PayPal’s authorization and capture are separate steps. COMRDY’s
                Sandbox path places a contract check between them, with the
                resulting payment state available for inspection.
              </p>
              <Link href="/docs#payment" className="text-link">
                Understand the payment boundary
                <ArrowRight size={15} />
              </Link>
            </div>
            <div
              className="boundary-diagram"
              aria-label="Authorization passes through contract verification before capture"
            >
              <div className="boundary-step">
                <CircleDot size={19} />
                <span>PayPal authorization</span>
                <small>Buyer approval</small>
              </div>
              <div className="boundary-connector" />
              <div className="boundary-gate">
                <Layers3 size={20} />
                <div>
                  <strong>COMRDY contract check</strong>
                  <span>Exact state. Confirmed constraints.</span>
                </div>
              </div>
              <div className="boundary-branches">
                <div>
                  <Check size={16} />
                  <strong>Allow</strong>
                  <span>Capture verified attempt</span>
                </div>
                <div>
                  <MoveRight size={16} />
                  <strong>Deny / review</strong>
                  <span>Block and preserve evidence</span>
                </div>
              </div>
              <p className="diagram-note">
                Local simulation makes no PayPal API calls. The app displays the
                active environment.
              </p>
            </div>
          </div>
        </section>
        <section className="closing-section container">
          <p className="eyebrow">BUILT FOR THE ENGINEER SHIPPING AI CHECKOUT</p>
          <div>
            <h2>
              Try the wrong purchase.
              <br />
              See exactly why it fails.
            </h2>
            <Link href="/demo" className="button brand large">
              Open the test lab
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <p>
            One controlled store. A confirmed contract. Evidence you can
            inspect.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
