"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  Mountain,
  Ruler,
  ShoppingBag,
  X,
} from "lucide-react";
import { api, money } from "../_components/types";
import styles from "./store.module.css";

type Cart = { size: string; totalMinor: number; revision?: string | number };
type ProductView = "front" | "back" | "detail";
const sizes = [
  { value: "S", label: "Small" },
  { value: "M", label: "Medium" },
  { value: "L", label: "Large" },
];

export function DemoStore() {
  const [size, setSize] = useState("");
  const [cart, setCart] = useState<Cart | null>(null);
  const [removedCart, setRemovedCart] = useState<Cart | null>(null);
  const [review, setReview] = useState<Cart | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorArea, setErrorArea] = useState<"size" | "checkout">("size");
  const [bridged, setBridged] = useState(false);
  const [view, setView] = useState<ProductView>("front");
  const [announcement, setAnnouncement] = useState("");
  const sizeGuide = useRef<HTMLDialogElement>(null);
  const cartDialog = useRef<HTMLDialogElement>(null);
  const productSize = useRef<HTMLSelectElement>(null);
  const cartSize = useRef<HTMLSelectElement>(null);
  const cartTitle = useRef<HTMLHeadingElement>(null);
  const drawerBody = useRef<HTMLDivElement>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const selectedSize = sizes.find((option) => option.value === size);
  const observationChanged =
    !!cart &&
    !!review &&
    (cart.size !== review.size || cart.totalMinor !== review.totalMinor);

  function chooseSize(value: string) {
    setSize(value);
    if (errorArea === "size") setError(null);
  }

  function openCart() {
    cartDialog.current?.showModal();
  }

  function add() {
    if (!size) {
      setErrorArea("size");
      setError("Choose S, M or L before adding the Ocean Shell.");
      productSize.current?.focus();
      return;
    }
    setCart({ size, totalMinor: 14800 });
    setRemovedCart(null);
    setReview(null);
    setError(null);
    setAnnouncement(`Added to your cart: Blue / ${size}.`);
    openCart();
  }

  function editCart(value: string) {
    if (!cart) return;
    setCart({ size: value, totalMinor: 14800 });
    setSize(value);
    setReview(null);
    setError(null);
    setAnnouncement(`Size updated to ${value}. Ready to review again.`);
  }

  function remove() {
    setRemovedCart(cart);
    setCart(null);
    setReview(null);
    setError(null);
    setAnnouncement("Ocean Shell removed from your cart.");
    requestAnimationFrame(() => undoButton.current?.focus());
  }

  function undoRemove() {
    if (!removedCart) return;
    setCart(removedCart);
    setRemovedCart(null);
    setAnnouncement(`Ocean Shell, size ${removedCart.size}, restored.`);
    requestAnimationFrame(() => reviewButton.current?.focus());
  }

  async function reviewCheckout() {
    if (!cart) return;
    setBusy(true);
    setErrorArea("checkout");
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
      setAnnouncement(
        "Checkout reviewed. The observed details are ready below.",
      );
      requestAnimationFrame(() => {
        if (!cartDialog.current?.open) return;
        drawerBody.current?.scrollTo({ top: 0 });
        cartTitle.current?.focus({ preventScroll: true });
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Checkout could not be reviewed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.store}>
      <div className={styles.environment}>
        <span>FICTIONAL STORE · NO REAL MONEY</span>
        <Link href="/demo">
          COMRDY <ArrowUpRight size={12} aria-hidden="true" />
        </Link>
      </div>
      <header className={`${styles.header} ${styles.container}`}>
        <a
          href="#ocean-shell"
          className={styles.wordmark}
          aria-label="Northpath Supply, back to product"
        >
          <Mountain size={29} strokeWidth={1.5} aria-hidden="true" />
          <span>
            NORTHPATH<small>SUPPLY</small>
          </span>
        </a>
        <nav aria-label="Store navigation">
          <a href="#ocean-shell">Ocean Shell</a>
          <a href="#catalog">The collection</a>
        </nav>
        <button
          type="button"
          className={styles.cartLink}
          onClick={openCart}
          aria-label={`Open cart, ${cart ? "1 item" : "empty"}`}
        >
          <ShoppingBag size={18} aria-hidden="true" />
          <span>Cart</span>
          <span className={styles.cartCount}>{cart ? 1 : 0}</span>
        </button>
      </header>

      <main id="main" className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <a href="#catalog">Collection</a>
          <ChevronRight size={11} aria-hidden="true" />
          <span>Outerwear</span>
          <ChevronRight size={11} aria-hidden="true" />
          <span aria-current="page">Ocean Shell</span>
        </nav>
        <section
          id="ocean-shell"
          className={styles.productLayout}
          aria-labelledby="product-title"
        >
          <div className={styles.productIntro}>
            <p className={styles.eyebrow}>NORTHPATH / OUTERWEAR</p>
            <div className={styles.titleRow}>
              <h1 id="product-title">Ocean Shell</h1>
              <span className={styles.price}>
                $129<small>.00</small>
              </span>
            </div>
            <p className={styles.introMeta}>
              <span className={styles.colorDot} aria-hidden="true" />
              Blue <span>·</span> One-time purchase <span>·</span> USD
            </p>
            <p className={styles.description}>
              A hooded shell with a zip front and two angled pockets.
            </p>
          </div>

          <div className={styles.gallery}>
            <div className={styles.productStage}>
              <span className={styles.stageCode}>NPS—OS—01</span>
              <div
                className={`${styles.mainArt} ${view === "detail" ? styles.detailArt : ""}`}
              >
                <ProductArt kind="shell" view={view} />
              </div>
              <span className={styles.artDisclosure}>Product illustration</span>
              <span className={styles.stageView}>
                {view === "back"
                  ? "Back"
                  : view === "detail"
                    ? "Pocket & zip"
                    : "Front"}
              </span>
            </div>
            <div
              className={styles.galleryControls}
              role="group"
              aria-label="Product views"
            >
              {(["front", "back", "detail"] as const).map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                >
                  {option === "front"
                    ? "Front view"
                    : option === "back"
                      ? "Back view"
                      : "Details"}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.purchase}>
            <div id="product-options" className={styles.sizeField}>
              <div className={styles.sizeHeading}>
                <label htmlFor="product-size">Size</label>
                <div className={styles.selectWrap}>
                  <select
                    id="product-size"
                    ref={productSize}
                    aria-label="Size"
                    value={size}
                    disabled={busy}
                    aria-invalid={!!error && errorArea === "size"}
                    aria-describedby={
                      error && errorArea === "size" ? "size-error" : "size-help"
                    }
                    onChange={(event) => chooseSize(event.target.value)}
                  >
                    <option value="">Choose…</option>
                    {sizes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value} — {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} aria-hidden="true" />
                </div>
                <button
                  type="button"
                  className={styles.inlineButton}
                  onClick={() => sizeGuide.current?.showModal()}
                >
                  <Ruler size={14} aria-hidden="true" />
                  Size guide
                </button>
              </div>
              <div
                className={styles.sizeChoices}
                role="group"
                aria-label="Quick size choices"
              >
                {sizes.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    aria-label={`Select ${option.label.toLowerCase()} (${option.value})`}
                    aria-pressed={size === option.value}
                    disabled={busy}
                    onClick={() => chooseSize(option.value)}
                  >
                    <strong>{option.value}</strong>
                    <span>{option.label}</span>
                    {size === option.value && (
                      <Check size={14} aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
              <p
                id="size-help"
                className={styles.sizeStatus}
                aria-live="polite"
              >
                {selectedSize ? (
                  <>
                    <Check size={12} aria-hidden="true" />
                    {selectedSize.label} selected · Blue / {selectedSize.value}
                  </>
                ) : (
                  "Choose the size you want to keep through checkout."
                )}
              </p>
              {error && errorArea === "size" && (
                <p id="size-error" className={styles.error} role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className={styles.deliveredPrice}>
              <div>
                <span>
                  Delivered total <small>1 item</small>
                </span>
                <strong>
                  $148.00 <small>USD</small>
                </strong>
              </div>
              <p>
                $129 item <span>+</span> $10 shipping <span>+</span> $9 tax
              </p>
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={add}
              disabled={busy}
            >
              <ShoppingBag size={17} aria-hidden="true" />
              <span>Add to cart</span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <p className={styles.purchaseNote}>
              No subscription. No automatic substitutions.
            </p>
            {cart && (
              <div className={styles.inCart}>
                <span>
                  <Check size={14} aria-hidden="true" />
                  Your cart: Blue / {cart.size}
                </span>
                <button type="button" onClick={openCart}>
                  View cart <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            )}
            <p className={styles.previewNote}>
              A fictional product for checkout testing. Reviewing this store on
              its own is a local preview.
            </p>
          </div>

          <div className={styles.productDetails}>
            <details>
              <summary>
                Product details
                <ChevronDown size={15} aria-hidden="true" />
              </summary>
              <dl>
                <div>
                  <dt>Style</dt>
                  <dd>Hooded shell / NPS-OS-01</dd>
                </div>
                <div>
                  <dt>Color & sizes</dt>
                  <dd>Blue / S, M, L</dd>
                </div>
                <div>
                  <dt>Purchase</dt>
                  <dd>One item, one time</dd>
                </div>
              </dl>
              <p>
                The original illustration shows a zip front and two pockets.
                This fictional product has no verified material, fit or
                performance specifications.
              </p>
            </details>
            <details>
              <summary>
                How this test store works
                <ChevronDown size={15} aria-hidden="true" />
              </summary>
              <p>
                Choose a size, add the item and review the current cart. A
                COMRDY test can observe a different merchant state. Review
                returns that observation; it does not authorize a payment,
                capture money or place a new merchant order.
              </p>
              <p>
                No item is shipped and no delivery date is promised. The
                standard test total includes $10 shipping and $9 tax.
              </p>
            </details>
          </div>
        </section>

        <section
          id="catalog"
          className={styles.catalog}
          aria-labelledby="catalog-title"
        >
          <div className={styles.catalogHeading}>
            <div>
              <p className={styles.eyebrow}>NORTHPATH COLLECTION</p>
              <h2 id="catalog-title">Along for the journey.</h2>
            </div>
            <p>Catalog previews. Purchases are enabled for Ocean Shell only.</p>
          </div>
          <div className={styles.catalogGrid}>
            <article>
              <div className={styles.catalogArt}>
                <ProductArt kind="pack" />
              </div>
              <div>
                <span className={styles.catalogTag}>PREVIEW ONLY</span>
                <h3>Ridge Pack 22L</h3>
                <p>Slate · $92.00</p>
                <details>
                  <summary>
                    View details <ChevronDown size={13} aria-hidden="true" />
                  </summary>
                  <p>
                    A fictional 22-liter pack. This item cannot be added to the
                    test cart.
                  </p>
                </details>
              </div>
            </article>
            <article>
              <div className={`${styles.catalogArt} ${styles.bottleArt}`}>
                <ProductArt kind="bottle" />
              </div>
              <div>
                <span className={styles.catalogTag}>PREVIEW ONLY</span>
                <h3>Transit Bottle 750</h3>
                <p>Steel · $29.00</p>
                <details>
                  <summary>
                    View details <ChevronDown size={13} aria-hidden="true" />
                  </summary>
                  <p>
                    A fictional 750 ml bottle. This item cannot be added to the
                    test cart.
                  </p>
                </details>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <span>NORTHPATH SUPPLY</span>
          <p>A fictional merchant for reproducible transaction tests.</p>
          <Link href="/docs">
            About this demo <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </footer>

      <div className={styles.mobileBar}>
        <div>
          <strong>{cart ? "Your cart · 1 item" : "Ocean Shell"}</strong>
          <span>
            {cart
              ? "Blue / " + cart.size + " · $148.00 total"
              : selectedSize
                ? `Blue / ${size} · $148.00 total`
                : "$148.00 delivered"}
          </span>
        </div>
        {cart ? (
          <button type="button" onClick={openCart}>
            View cart <ArrowRight size={15} aria-hidden="true" />
          </button>
        ) : size ? (
          <button
            type="button"
            aria-label="Add selected Ocean Shell"
            onClick={add}
            disabled={busy}
          >
            Add item <ArrowRight size={15} aria-hidden="true" />
          </button>
        ) : (
          <a href="#product-options">
            Choose size <ArrowRight size={15} aria-hidden="true" />
          </a>
        )}
      </div>

      <dialog
        id="shopping-cart"
        ref={cartDialog}
        className={styles.cartDialog}
        aria-labelledby="cart-title"
      >
        <div className={styles.drawerHeader}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => cartDialog.current?.close()}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to product
          </button>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close cart"
            onClick={() => cartDialog.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div ref={drawerBody} className={styles.drawerBody}>
          <div className={styles.cartHeading}>
            <p className={styles.eyebrow}>
              {review
                ? "STEP 2 OF 2 / OBSERVATION"
                : "STEP 1 OF 2 / YOUR SELECTION"}
            </p>
            <h2 id="cart-title" ref={cartTitle} tabIndex={-1}>
              {review ? "Checkout reviewed." : "Your cart."}
              <span>{cart ? "01" : "00"}</span>
            </h2>
          </div>
          {!review && announcement && (
            <p className={styles.cartNotice} role="status">
              <Check size={14} aria-hidden="true" />
              {announcement}
            </p>
          )}
          {!cart ? (
            <div className={styles.emptyCart}>
              <ShoppingBag size={33} strokeWidth={1.3} aria-hidden="true" />
              <h3>{removedCart ? "Item removed." : "Your cart is empty."}</h3>
              <p>
                {removedCart
                  ? "You can restore the Ocean Shell or return to choose another size."
                  : "Choose an Ocean Shell size to begin."}
              </p>
              {removedCart && (
                <button
                  type="button"
                  ref={undoButton}
                  className={styles.secondaryButton}
                  onClick={undoRemove}
                >
                  Undo remove <ArrowRight size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          ) : review ? (
            <div className={styles.reviewContent}>
              <div className={styles.observationIntro} role="status">
                <span className={styles.reviewIcon}>
                  <Check size={22} aria-hidden="true" />
                </span>
                <div>
                  <strong>
                    {bridged
                      ? "Merchant observation received"
                      : "Local preview complete"}
                  </strong>
                  <p>
                    {bridged
                      ? "These details are attached to the active COMRDY run."
                      : "This preview did not call a payment provider."}
                  </p>
                </div>
              </div>
              <div className={styles.reviewProduct}>
                <div>
                  <ProductArt kind="shell" />
                </div>
                <p>
                  <strong>Ocean Shell</strong>
                  <span>Blue · Quantity 1</span>
                </p>
              </div>
              <dl className={styles.observedFacts}>
                <div>
                  <dt>
                    Observed size<span>You selected {cart.size}</span>
                  </dt>
                  <dd data-testid="cart-size">{review.size}</dd>
                </div>
                <div>
                  <dt>
                    Final total<span>Your cart: {money(cart.totalMinor)}</span>
                  </dt>
                  <dd data-testid="cart-total">{money(review.totalMinor)}</dd>
                </div>
              </dl>
              {observationChanged && (
                <p className={styles.changedNotice}>
                  The observed checkout differs from your cart. COMRDY evaluates
                  the observation against the confirmed contract.
                </p>
              )}
              <p className={styles.reviewBoundary}>
                No payment was authorized or captured by this review. No new
                merchant order was placed.
              </p>
              <button
                type="button"
                className={styles.inlineButton}
                onClick={() => {
                  setReview(null);
                  setAnnouncement(
                    "Edit your cart, then review the new selection.",
                  );
                  requestAnimationFrame(() => cartSize.current?.focus());
                }}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Edit cart
              </button>
            </div>
          ) : (
            <>
              <article className={styles.cartItem}>
                <div className={styles.cartThumbnail}>
                  <ProductArt kind="shell" />
                </div>
                <div className={styles.cartItemDetails}>
                  <h3>Ocean Shell</h3>
                  <p>Blue · Quantity 1</p>
                  <strong>$129.00</strong>
                  <div className={styles.cartItemActions}>
                    <label htmlFor="cart-size-select">Size</label>
                    <select
                      id="cart-size-select"
                      ref={cartSize}
                      aria-label="Cart size"
                      value={cart.size}
                      disabled={busy}
                      onChange={(event) => editCart(event.target.value)}
                    >
                      {sizes.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value} — {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.inlineButton}
                      disabled={busy}
                      onClick={remove}
                    >
                      Remove item
                    </button>
                  </div>
                </div>
              </article>
              <div className={styles.cartSummary}>
                <h3>Price breakdown</h3>
                <dl>
                  <div>
                    <dt>Ocean Shell</dt>
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
                </dl>
              </div>
              <div className={styles.cartTerms}>
                <Check size={14} aria-hidden="true" />
                <p>
                  One item, one-time purchase.
                  <span>No subscription or automatic substitution.</span>
                </p>
              </div>
              {error && errorArea === "checkout" && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
        <div className={styles.drawerFooter}>
          {!cart ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => cartDialog.current?.close()}
            >
              Back to product <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : review ? (
            <>
              {bridged ? (
                <Link href="/demo" className={styles.primaryButton}>
                  Return to COMRDY <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => cartDialog.current?.close()}
                >
                  Back to product <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
              {!bridged && (
                <Link className={styles.textLink} href="/demo">
                  Try the full transaction lab{" "}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              )}
            </>
          ) : (
            <>
              <div className={styles.drawerTotal}>
                <span>
                  Delivered total <small>USD</small>
                </span>
                <strong>{money(cart.totalMinor)}</strong>
              </div>
              <button
                type="button"
                ref={reviewButton}
                className={styles.primaryButton}
                onClick={reviewCheckout}
                disabled={busy}
              >
                <span>{busy ? "Reviewing checkout…" : "Review checkout"}</span>
                {busy ? (
                  <LoaderCircle
                    size={17}
                    className={styles.spin}
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight size={17} aria-hidden="true" />
                )}
              </button>
              <p>
                Review the merchant's current cart. This action does not place
                an order or charge a payment method.
              </p>
            </>
          )}
        </div>
      </dialog>

      <dialog
        ref={sizeGuide}
        className={styles.sizeDialog}
        aria-labelledby="size-guide-title"
      >
        <div className={styles.dialogHeading}>
          <p className={styles.eyebrow}>OCEAN SHELL</p>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close size guide"
            onClick={() => sizeGuide.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <h2 id="size-guide-title">Choose your size.</h2>
        <p>
          This demo uses standard size labels. Select the size specified in your
          test.
        </p>
        <div className={styles.sizeChoices}>
          {sizes.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={size === option.value}
              disabled={busy}
              onClick={() => {
                chooseSize(option.value);
                sizeGuide.current?.close();
                productSize.current?.focus();
              }}
            >
              <strong>{option.value}</strong>
              <span>{option.label}</span>
              {size === option.value && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
        <p className={styles.guideNote}>
          Garment measurements and real-world fit guidance are not supplied for
          this fictional product.
        </p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => sizeGuide.current?.close()}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to product
        </button>
      </dialog>
    </div>
  );
}

function ProductArt({
  kind,
  view = "front",
}: {
  kind: "shell" | "pack" | "bottle";
  view?: ProductView;
}) {
  if (kind === "shell")
    return (
      <svg
        className={styles.productSvg}
        viewBox={view === "detail" ? "115 118 130 150" : "0 0 360 400"}
        fill="none"
        role="img"
        aria-label={`Original illustration of the blue Ocean Shell jacket, ${view === "detail" ? "zip and pocket detail" : `${view} view`}`}
      >
        <path
          d="m129 83-31 22-46 145 42 17 34-88-5 151c23 12 91 12 114 0l-5-151 34 88 42-17-46-145-31-22-23-13h-56l-23 13Z"
          fill="#32617C"
          stroke="#173D55"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="m98 105 31-22 23-13-24 109-34 88-20-8 27-91-3-63Z"
          fill="#244E69"
        />
        <path
          d="m262 105-31-22-23-13 24 109 34 88 20-8-27-91 3-63Z"
          fill="#42748D"
        />
        <path
          d="m129 83 23-13h56l23 13-8 84-3 142c-22 7-58 7-80 0l-3-142-8-84Z"
          fill="#3D6D86"
        />
        <path
          d="m141 76 3-21c5-22 67-22 72 0l3 21-13 48h-52l-13-48Z"
          fill="#244E69"
          stroke="#173D55"
          strokeWidth="2"
        />
        {view === "back" ? (
          <>
            <path
              d="m144 55 10 69c15 8 37 8 52 0l10-69"
              fill="#477B94"
              stroke="#173D55"
              strokeWidth="2"
            />
            <path
              d="M180 43v80m-42 46c28 10 56 10 84 0M129 84l8 83m94-83-8 83"
              stroke="#7198AC"
              strokeWidth="1.5"
            />
            <path
              d="m165 205 15-16 15 16m-23-6 8 7 8-7"
              stroke="#A7CBD8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <path
              d="m151 55 11 45 18 15 18-15 11-45c-11-11-47-11-58 0Z"
              fill="#15394E"
              stroke="#123347"
              strokeWidth="2"
            />
            <path
              d="m151 55 10 41 19 19 19-19 10-41M180 115v218"
              stroke="#86ADBF"
              strokeWidth="2"
            />
            <path d="M177 118v212" stroke="#163C53" strokeWidth="4" />
            <path
              d="M181 132v26"
              stroke="#D9E9ED"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M180 159h6v10h-6z" fill="#C2D9E2" stroke="#173D55" />
            <path
              d="m137 209 23-15m63 15-23-15"
              stroke="#183F56"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="m137 207 23-15m63 15-23-15"
              stroke="#7FAABD"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d="M137 215v47m86-47v47" stroke="#285770" strokeWidth="2" />
            <path
              d="m201 146 8-9 8 9m-12-3 4 4 4-4"
              stroke="#B3D1DE"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="m150 89-4 36m64-36 4 36"
              stroke="#A7C6D5"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d="M144 123h4v8h-4zm68 0h4v8h-4z" fill="#173D55" />
          </>
        )}
        <path
          d="m129 84-1 95m103-95 1 95M123 316c38 10 76 10 114 0M57 235l42 17m162 0 42-17"
          stroke="#173D55"
          strokeWidth="2"
        />
        <path
          d="m71 225 28-91m190 91-28-91M133 281l-2 28m98-28 2 28"
          stroke="#6892A7"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="m53 249 41 18 5-14-42-17-4 13Z" fill="#183F56" />
        <path d="m266 267 42-18-5-13-42 17 5 14Z" fill="#183F56" />
        <path
          d="m125 329-1 8m112-8 1 8"
          stroke="#163A50"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === "pack")
    return (
      <svg
        className={styles.productSvg}
        viewBox="0 0 360 400"
        fill="none"
        role="img"
        aria-label="Original illustration of the slate Ridge Pack"
      >
        <path
          d="M151 96V81c0-20 58-20 58 0v15"
          stroke="#354B58"
          strokeWidth="10"
        />
        <path
          d="m113 117-16 21-9 154 28 18m131-193 16 21 9 154-28 18"
          stroke="#344A58"
          strokeWidth="14"
          strokeLinejoin="round"
        />
        <path
          d="M108 135c0-39 32-55 72-55s72 16 72 55l10 159c-14 24-150 24-164 0l10-159Z"
          fill="#7F98A3"
          stroke="#354F5E"
          strokeWidth="2"
        />
        <path
          d="M119 140c0-32 122-32 122 0v31H119v-31Z"
          fill="#9AB1B9"
          stroke="#4F6978"
          strokeWidth="2"
        />
        <path
          d="M122 211c0-21 116-21 116 0v66c0 16-116 16-116 0v-66Z"
          fill="#637F8D"
          stroke="#354F5E"
          strokeWidth="2"
        />
        <path
          d="M126 224h108M131 146h98M106 185l-13 6-4 68 13 5m152-79 13 6 4 68-13 5"
          stroke="#354F5E"
          strokeWidth="2"
        />
        <path d="M144 91v65m72-65v65" stroke="#C3D2D7" strokeWidth="9" />
        <path d="M140 145h8v14h-8zm72 0h8v14h-8z" fill="#354F5E" />
        <path
          d="m168 250 12-13 12 13m-18-5 6 6 6-6"
          stroke="#B9D0D9"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M126 304c26 7 82 7 108 0" stroke="#354F5E" strokeWidth="2" />
      </svg>
    );
  return (
    <svg
      className={styles.productSvg}
      viewBox="0 0 360 400"
      fill="none"
      role="img"
      aria-label="Original illustration of the steel Transit Bottle"
    >
      <path
        d="M153 75h54v39h-54z"
        fill="#334D5D"
        stroke="#233E50"
        strokeWidth="2"
      />
      <path d="m163 75 4-10h26l4 10" stroke="#233E50" strokeWidth="4" />
      <path
        d="M154 114c0 15-29 30-29 52v128c0 26 110 26 110 0V166c0-22-29-37-29-52h-52Z"
        fill="#A9C1CC"
        stroke="#587A8B"
        strokeWidth="2"
      />
      <path
        d="M154 114c0 20-20 34-20 53v127c0 9 11 15 21 17V164c0-19 10-30 10-50h-11Z"
        fill="#CDE0E7"
      />
      <path
        d="M206 114c0 20 20 34 20 53v127c0 9-11 15-21 17V164c0-19-10-30-10-50h11Z"
        fill="#88A6B5"
      />
      <path d="M126 282h108M153 95h54" stroke="#587A8B" strokeWidth="2" />
      <path
        d="m166 218 14-16 14 16m-21-6 7 7 7-7"
        stroke="#4B7288"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M163 248h34" stroke="#6F91A3" strokeWidth="2" />
    </svg>
  );
}
