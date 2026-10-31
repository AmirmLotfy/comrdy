"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  LoaderCircle,
  Mountain,
  ShoppingBag,
} from "lucide-react";
import { api, money } from "../_components/types";
import { ErrorNotice } from "../_components/ui";

type Cart = { size: string; totalMinor: number; revision?: string | number };

export function DemoStore() {
  const [size, setSize] = useState("");
  const [cart, setCart] = useState<Cart | null>(null);
  const [review, setReview] = useState<Cart | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<"pack" | "bottle" | null>(null);
  const [bridged, setBridged] = useState(false);
  function add() {
    if (!size) {
      setError("Choose a size before adding the Ocean Shell to your cart.");
      return;
    }
    setCart({ size, totalMinor: 14800 });
    setReview(null);
    setError(null);
  }
  async function reviewCheckout() {
    if (!cart) return;
    setBusy(true);
    setError(null);
    try {
      const url = new URL(window.location.href);
      const runId = url.searchParams.get("run");
      const token = url.searchParams.get("token");
      if (runId) {
        const data = await api<{
          size?: string;
          totalMinor?: number;
          revision?: string | number;
          cart?: Cart;
        }>("/api/v1/merchant/cart", { runId, size: cart.size, token });
        const observed = data.cart ?? data;
        if (
          typeof observed.size !== "string" ||
          typeof observed.totalMinor !== "number"
        )
          throw new Error(
            "The merchant did not return a complete checkout state. Please try again.",
          );
        setReview({
          size: observed.size,
          totalMinor: observed.totalMinor,
          revision: observed.revision,
        });
        setBridged(true);
      } else {
        setReview(cart);
        setBridged(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Checkout could not be reviewed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="storefront">
      <div className="store-environment">
        <span>CONTROLLED DEMO STORE · NO REAL MONEY</span>
        <Link href="/demo">
          Back to COMRDY
          <ArrowRight size={12} />
        </Link>
      </div>
      <header className="store-header container">
        <Link href="/store" className="store-wordmark">
          <Mountain size={27} strokeWidth={1.5} />
          <span>
            NORTHPATH
            <br />
            <small>SUPPLY</small>
          </span>
        </Link>
        <nav aria-label="Store navigation">
          <a href="#ocean-shell">The Ocean Shell</a>
          <a href="#catalog">The collection</a>
        </nav>
        <a className="store-cart-link" href="#shopping-cart">
          <ShoppingBag size={18} />
          <span>Cart</span>
          <span className="cart-count">{cart ? 1 : 0}</span>
        </a>
      </header>
      <main id="main" className="container store-main">
        <div className="store-breadcrumb">
          <span>Northpath Supply</span>
          <ChevronRight size={12} />
          <span>Outerwear</span>
          <ChevronRight size={12} />
          <strong>Ocean Shell</strong>
        </div>
        <section id="ocean-shell" className="store-product-layout">
          <div className="product-artwork hero-product-art">
            <div className="product-art-label">
              <span>OCEAN SHELL</span>
              <span>NPS-OS-01</span>
            </div>
            <ProductArt kind="shell" />
            <p className="illustration-label">
              Illustrative product · Fictional demo catalog
            </p>
          </div>
          <div className="product-purchase">
            <p className="eyebrow">NORTHPATH / OUTERWEAR</p>
            <h1>Ocean Shell</h1>
            <div className="product-price-row">
              <span className="product-price">$129.00</span>
              <span className="product-category">Blue · Everyday shell</span>
            </div>
            <p className="product-description">
              A straightforward shell for the journey ahead. Select your size,
              review the delivered total, and keep the details in view.
            </p>
            <div className="product-color">
              <span className="field-label">Color — Blue</span>
              <span className="color-swatch" aria-label="Blue" />
            </div>
            <div className="size-field">
              <label className="field-label" htmlFor="product-size">
                Size
              </label>
              <select
                id="product-size"
                aria-label="Size"
                value={size}
                onChange={(event) => setSize(event.target.value)}
              >
                <option value="">Choose your size</option>
                <option value="S">S — Small</option>
                <option value="M">M — Medium</option>
                <option value="L">L — Large</option>
              </select>
            </div>
            <div className="quantity-field">
              <span className="field-label">Quantity</span>
              <span>1</span>
              <small>This demo purchases exactly one item.</small>
            </div>
            <button className="button store-primary full" onClick={add}>
              <ShoppingBag size={17} />
              Add to cart
              <ArrowRight size={16} />
            </button>
            <div className="product-purchase-notes">
              <p>
                <Check size={14} />
                One-time purchase. No subscription.
              </p>
              <p>
                <Check size={14} />
                No automatic substitutions.
              </p>
            </div>
            <div className="product-cost-note">
              <span>Delivered total in this fixture</span>
              <strong>$148.00</strong>
              <small>$129 item + $10 shipping + $9 tax</small>
            </div>
          </div>
        </section>
        <ErrorNotice message={error} />
        <section id="shopping-cart" className="store-cart-section">
          <div className="store-section-heading">
            <p className="eyebrow">REVIEW THE DETAILS</p>
            <h2>Your cart</h2>
          </div>
          {!cart ? (
            <div className="store-cart-empty">
              <ShoppingBag size={23} />
              <p>Your cart is empty. Choose a size and add the Ocean Shell.</p>
            </div>
          ) : (
            <div className="store-cart-grid">
              <div className="cart-item">
                <div className="cart-thumbnail">
                  <ProductArt kind="shell" />
                </div>
                <div>
                  <h3>Ocean Shell</h3>
                  <p>Blue / Size {cart.size}</p>
                  <span>Quantity: 1</span>
                  <button
                    className="text-button"
                    onClick={() => {
                      setCart(null);
                      setReview(null);
                    }}
                  >
                    Remove item
                  </button>
                </div>
                <strong>$129.00</strong>
              </div>
              <div className="cart-summary">
                <dl>
                  <div>
                    <dt>Subtotal</dt>
                    <dd>$129.00</dd>
                  </div>
                  <div>
                    <dt>Shipping</dt>
                    <dd>$10.00</dd>
                  </div>
                  <div>
                    <dt>Tax</dt>
                    <dd>$9.00</dd>
                  </div>
                  <div className="total-row">
                    <dt>Delivered total</dt>
                    <dd>{money(cart.totalMinor)}</dd>
                  </div>
                </dl>
                <button
                  className="button store-primary full"
                  onClick={reviewCheckout}
                  disabled={busy}
                >
                  {busy ? (
                    <LoaderCircle size={15} className="spin" />
                  ) : (
                    <ArrowRight size={16} />
                  )}{" "}
                  {busy ? "Reviewing checkout…" : "Review checkout"}
                </button>
                <p>
                  Review creates a checkout observation. It does not place an
                  order or charge a payment method.
                </p>
              </div>
            </div>
          )}
          {review && (
            <div className="checkout-review" role="status">
              <div className="checkout-review-title">
                <Check size={19} />
                <div>
                  <h3>Checkout reviewed</h3>
                  <p>
                    {bridged
                      ? "This observed cart is attached to the active COMRDY run."
                      : "Local storefront preview. Start a COMRDY run for transaction verification."}
                  </p>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Product</dt>
                  <dd>Ocean Shell</dd>
                </div>
                <div>
                  <dt>Color</dt>
                  <dd>Blue</dd>
                </div>
                <div>
                  <dt>Observed size</dt>
                  <dd data-testid="cart-size">{review.size}</dd>
                </div>
                <div>
                  <dt>Quantity</dt>
                  <dd>1</dd>
                </div>
                <div>
                  <dt>Final total</dt>
                  <dd data-testid="cart-total">{money(review.totalMinor)}</dd>
                </div>
              </dl>
              <Link className="text-link" href="/demo">
                Return to the transaction lab
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </section>
        <section id="catalog" className="store-catalog">
          <div className="store-section-heading">
            <p className="eyebrow">THE CONTROLLED CATALOG</p>
            <h2>A few things for the journey.</h2>
            <p>
              Three fictional products. Ocean Shell is the enabled transaction
              scenario.
            </p>
          </div>
          <div className="catalog-grid">
            <article>
              <a href="#ocean-shell" className="product-artwork">
                <ProductArt kind="shell" />
              </a>
              <div className="catalog-item-heading">
                <h3>Ocean Shell</h3>
                <span>$129.00</span>
              </div>
              <p>Blue · S / M / L</p>
              <a href="#ocean-shell" className="text-link">
                Choose a size
                <ArrowRight size={13} />
              </a>
            </article>
            <article>
              <button
                className="product-artwork"
                aria-label="View Ridge Pack details"
                onClick={() => setPreview(preview === "pack" ? null : "pack")}
              >
                <ProductArt kind="pack" />
              </button>
              <div className="catalog-item-heading">
                <h3>Ridge Pack 22L</h3>
                <span>$92.00</span>
              </div>
              <p>Slate · Catalog preview</p>
              <button
                className="text-link"
                onClick={() => setPreview(preview === "pack" ? null : "pack")}
              >
                View details
                <ArrowRight size={13} />
              </button>
              {preview === "pack" && (
                <p className="catalog-preview-note">
                  A fictional 22-liter pack. Purchases are not enabled for this
                  catalog item.
                </p>
              )}
            </article>
            <article>
              <button
                className="product-artwork"
                aria-label="View Transit Bottle details"
                onClick={() =>
                  setPreview(preview === "bottle" ? null : "bottle")
                }
              >
                <ProductArt kind="bottle" />
              </button>
              <div className="catalog-item-heading">
                <h3>Transit Bottle 750</h3>
                <span>$29.00</span>
              </div>
              <p>Steel · Catalog preview</p>
              <button
                className="text-link"
                onClick={() =>
                  setPreview(preview === "bottle" ? null : "bottle")
                }
              >
                View details
                <ArrowRight size={13} />
              </button>
              {preview === "bottle" && (
                <p className="catalog-preview-note">
                  A fictional 750 ml bottle. Purchases are not enabled for this
                  catalog item.
                </p>
              )}
            </article>
          </div>
        </section>
      </main>
      <footer className="store-footer container">
        <span>NORTHPATH SUPPLY</span>
        <p>A fictional merchant built for reproducible transaction tests.</p>
        <Link href="/docs">
          About the demo
          <ArrowUpRightIcon />
        </Link>
      </footer>
    </div>
  );
}

function ProductArt({ kind }: { kind: "shell" | "pack" | "bottle" }) {
  if (kind === "shell")
    return (
      <svg
        className="product-svg shell-art"
        viewBox="0 0 360 360"
        fill="none"
        role="img"
        aria-label="Illustration of the blue Ocean Shell jacket"
      >
        <path
          d="m133 78 27-15h40l27 15 38 18 43 100-43 21-27-63v139H122V154l-27 63-43-21L95 96l38-18Z"
          fill="#587B8D"
          stroke="#2F505F"
          strokeWidth="2"
        />
        <path
          d="m133 78 17 33 30-12 30 12 17-33-27-15h-40l-27 15Z"
          fill="#416376"
          stroke="#2F505F"
          strokeWidth="2"
        />
        <path
          d="m160 63-10 48 30-12 30 12-10-48"
          stroke="#9CB2BE"
          strokeWidth="2"
        />
        <path
          d="M180 99v194M122 154l11-76m105 76-11-76M122 276h116M69 186l28 14m166 0 28-14"
          stroke="#2F505F"
          strokeWidth="2"
        />
        <path
          d="m138 196 21-15m63 15-21-15"
          stroke="#B4C7D0"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M138 197v39m84-39v39" stroke="#355B6D" strokeWidth="2" />
        <path
          d="M185 146v17"
          stroke="#C0CED5"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="m113 111-21 69m155-69 21 69"
          stroke="#7393A3"
          strokeWidth="2"
        />
      </svg>
    );
  if (kind === "pack")
    return (
      <svg
        className="product-svg"
        viewBox="0 0 360 360"
        fill="none"
        role="img"
        aria-label="Illustration of the slate Ridge Pack"
      >
        <path
          d="M153 84V70c0-19 54-19 54 0v14"
          stroke="#46525C"
          strokeWidth="9"
        />
        <path
          d="M107 124c0-37 33-51 73-51s73 14 73 51l11 151c-14 24-154 24-168 0l11-151Z"
          fill="#8B959D"
          stroke="#46525C"
          strokeWidth="2"
        />
        <path
          d="M117 133c1-30 125-30 126 0v24H117v-24Z"
          fill="#A7AFB5"
          stroke="#59656D"
          strokeWidth="2"
        />
        <path
          d="M121 196c0-19 118-19 118 0v64c0 16-118 16-118 0v-64Z"
          fill="#79858E"
          stroke="#46525C"
          strokeWidth="2"
        />
        <path
          d="M124 210h112M133 135h94M106 174l-11 4-5 68 13 7m151-79 11 4 5 68-13 7"
          stroke="#46525C"
          strokeWidth="2"
        />
        <path d="M145 83v58m70-58v58" stroke="#C6CCCF" strokeWidth="8" />
        <path d="M142 226h76" stroke="#A9B3B9" strokeWidth="2" />
      </svg>
    );
  return (
    <svg
      className="product-svg"
      viewBox="0 0 360 360"
      fill="none"
      role="img"
      aria-label="Illustration of the steel Transit Bottle"
    >
      <path
        d="M154 63h52v38h-52z"
        fill="#59666E"
        stroke="#3C4A54"
        strokeWidth="2"
      />
      <path
        d="M155 100c0 15-29 30-29 51v126c0 25 108 25 108 0V151c0-21-29-36-29-51h-50Z"
        fill="#A4AFB5"
        stroke="#687983"
        strokeWidth="2"
      />
      <path d="M137 151v120m86-120v120" stroke="#C8D0D4" strokeWidth="3" />
      <path d="M127 261h106M154 82h52" stroke="#687983" strokeWidth="2" />
      <rect
        x="171"
        y="193"
        width="18"
        height="18"
        rx="2"
        stroke="#6D7F8A"
        strokeWidth="2"
      />
      <path d="m164 62 3-8h26l3 8" stroke="#3C4A54" strokeWidth="3" />
    </svg>
  );
}
function ArrowUpRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}
