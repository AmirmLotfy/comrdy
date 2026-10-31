import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Minus } from "lucide-react";
import { Footer, MarketingNav } from "./_components/ui";
import { TransactionDiagram } from "./_components/transaction-diagram";
import { BrandMark } from "./_components/brand-mark";
import { ScrollReveal } from "./_components/scroll-reveal";

export default function Home() {
  return (
    <>
      <MarketingNav />
      <main id="main" className="overview">
        <ScrollReveal />
        <section className="overview-intro container">
          <div className="overview-copy">
            <p className="technical-label">
              <span /> Transaction assurance for AI checkout
            </p>
            <h1>
              Test the purchase.
              <br />
              Before the capture.
            </h1>
            <p className="overview-description">
              Your agent found the right jacket. The merchant changed the size.
              Would your checkout catch it?
            </p>
            <div className="overview-actions">
              <Link href="/demo" className="button brand large">
                Run the failure case <ArrowUpRight size={17} />
              </Link>
              <Link href="/docs" className="text-link">
                Read the model <ArrowRight size={15} />
              </Link>
            </div>
            <p className="overview-scope">
              Controlled merchant · Simulation or PayPal Sandbox
              <br />
              No real-money payments
            </p>
          </div>
          <div
            className="transaction-figure"
            aria-label="Illustrative example: requested size M changes to size S, so capture is blocked"
          >
            <div className="figure-top">
              <span>01 / VARIANT DRIFT</span>
              <span>Illustrative example</span>
            </div>
            <div className="figure-contract">
              <span>Confirmed contract</span>
              <strong>Ocean Shell / Blue / One / ≤ $160</strong>
            </div>
            <TransactionDiagram />
            <dl className="figure-facts">
              <div>
                <dt>Delivered total</dt>
                <dd>
                  $148.00 <Check size={14} /> <span>Within budget</span>
                </dd>
              </div>
              <div>
                <dt>Requested size</dt>
                <dd>
                  M → S <Minus size={14} />{" "}
                  <span className="failure-text">Outside contract</span>
                </dd>
              </div>
            </dl>
            <div className="figure-outcome">
              <BrandMark className="outcome-brand" />
              <div>
                <strong>Capture blocked</strong>
                <span>The amount passes. The purchase fails.</span>
              </div>
              <span className="figure-deny">DENY</span>
            </div>
            <p className="figure-caption">
              A designed example, not a recorded payment outcome.
            </p>
          </div>
        </section>
        <div className="overview-index container">
          <span>THE CHECK BETWEEN AUTHORIZATION AND CAPTURE</span>
          <a href="#mechanism">
            Follow the transaction <span aria-hidden="true">↓</span>
          </a>
        </div>
        <section id="mechanism" className="workflow-section container">
          <div className="workflow-intro" data-reveal>
            <p className="technical-label">The verification path</p>
            <h2>
              One promise.
              <br />
              Every checkpoint.
            </h2>
            <p>
              A completed flow is only part of the story. Inspect what the
              shopper was allowed to buy and what the merchant actually offered.
            </p>
            <Link className="text-link" href="/docs#evidence">
              Inside the evidence model <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="workflow-stages">
            <article data-reveal>
              <span className="stage-index">01</span>
              <div>
                <h3>Confirm the contract</h3>
                <p>
                  Turn the instruction into explicit constraints. Review the
                  size, quantity and delivered-total limit before the run.
                </p>
                <div className="stage-spec">
                  <span>Customer intent</span>
                  <ArrowRight size={14} />
                  <strong>Confirmed constraints</strong>
                </div>
              </div>
            </article>
            <article data-reveal>
              <span className="stage-index">02</span>
              <div>
                <h3>Introduce a known failure</h3>
                <p>
                  Change the variant or shipping cost in a controlled store.
                  Follow versioned observations through the transaction.
                </p>
                <div className="stage-spec">
                  <span>Checkout</span>
                  <ArrowRight size={14} />
                  <strong>Final merchant state</strong>
                </div>
              </div>
            </article>
            <article data-reveal>
              <span className="stage-index">03</span>
              <div>
                <h3>Inspect the decision</h3>
                <p>
                  Compare the final state with the original contract. A missing
                  hard constraint cannot become a pass.
                </p>
                <div className="stage-spec">
                  <span>Deterministic check</span>
                  <ArrowRight size={14} />
                  <strong>Allow / review / deny</strong>
                </div>
              </div>
            </article>
          </div>
        </section>
        <section className="capture-band">
          <div className="capture-section container" data-reveal>
            <div className="capture-copy">
              <p className="technical-label">Payment boundary</p>
              <h2>
                Authorization is a step.
                <br />
                Capture needs evidence.
              </h2>
              <p>
                The Sandbox path rechecks the confirmed contract before capture.
                Inspect the test verdict, authorization, capture and merchant
                order as separate facts.
              </p>
              <Link className="text-link" href="/docs#payment">
                Read the payment contract <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="capture-path">
              <div>
                <span>01</span>
                <strong>Buyer approval</strong>
                <small>PayPal authorization</small>
              </div>
              <div className="capture-gate">
                <span>02</span>
                <strong>COMRDY check</strong>
                <small>All hard constraints must pass</small>
              </div>
              <div>
                <span>03</span>
                <strong>Capture or stop</strong>
                <small>Preserve the outcome and evidence</small>
              </div>
              <p>
                Local simulation makes no PayPal API calls. Each run displays
                its environment.
              </p>
            </div>
          </div>
        </section>
        <section className="overview-close container" data-reveal>
          <div>
            <p className="technical-label">Start with a controlled failure</p>
            <h2>Find the first divergence.</h2>
            <p>One store. A fixed example. An inspectable decision.</p>
          </div>
          <Link href="/demo" className="button brand large">
            Open the test lab <ArrowUpRight size={17} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
