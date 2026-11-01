# Northpath Supply — store direction

## Brief and reference lock

Designing the controlled Northpath merchant for people and the existing COMRDY shopper on the web. The shopper must be able to choose a size, add exactly one Ocean Shell, inspect the cart, and review the merchant observation. The page should feel like a considered outdoor store while remaining explicit about its fictional catalog. A standalone visit is a local merchant preview; only a run-bound review calls the merchant observation API. Neither review path performs a payment operation.

Direct implementation follows the user's existing brand and store refinement request. Primary foundation: **Peak Design's product-first retail composition** — isolated product imagery, a contained grid, legible Geist body typography, precise controls and a clear light/dark section rhythm. Borrow only **COS's thin-rule links and restrained hover behavior**. Keep COMRDY's Geist, white, ink, Signal Blue and cyan; Northpath adds ocean navy and pale ice for the product presentation. Reference palette and serif typography are not imported.

Full style references retrieved before implementation:

- [Peak Design](https://peakdesign.com), Refero style `374af946-0972-40c3-a888-2700c29b3d5f`: product hierarchy, isolated imagery, flat surfaces and compact 4px controls.
- [COS](https://cos.com), Refero style `55e05a86-e14f-443a-94dc-b75efaaa2a7a`: thin-rule navigation and precise rectangular presentation only.

Product and journey references:

- [Peak Performance product selection](https://refero.design/pages/deda0a4d-22a2-44bc-9cce-83dd09bcf6fa), full metadata and screenshot inspected: large image, short details, variant selection and a single clear add action.
- [Peak Performance size guide](https://refero.design/pages/490c42a5-fdc3-411e-b83c-fde2cb8e2336), full metadata inspected: contextual size help with explicit back/close controls. Northpath supplies only the actual S/M/L labels; no garment measurements are invented.
- [On cart removal](https://refero.design/flows/13823), full flow and item screen inspected: the cart retains item/variant/price, removal updates the count, and the empty state offers a clear return to shopping.
- [On checkout](https://refero.design/flows/13825), full flow retrieved: compact cost breakdown, an obvious review action and inline failure feedback. Only the review pattern is borrowed; Northpath does not introduce delivery forms, payment choices or an order-submission operation.

## Decision ledger

| Decision                                                                        | Source and role                                    | Reason                                                                                                     |
| ------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Product title and price before a compact illustration on mobile                 | User review + Peak Design product hierarchy        | A shopper sees what is being bought and its price before inspecting the image                              |
| Ice product stage with original front/back/detail views                         | User color direction + existing Northpath identity | Preserves product inspection without pushing purchase controls below a large decorative section            |
| Geist 400/500, compact metadata, no decorative headline font                    | Existing COMRDY brand + Peak Design body role      | Preserves the shared identity and lets the product carry the expression                                    |
| Prominent S/M/L buttons, one native Size select and contextual size guide       | Existing shopper contract + Peak Performance       | Both controls share one state; the exact automation target remains visible and usable                      |
| Focused cart drawer, price summary, explicit edit/remove/undo                   | On cart flow + user purchase-flow feedback         | Adding opens a deliberate review step without scrolling the product page; Back to product stays visible    |
| Review is an observation, with observed size and final total prominent          | COMRDY constraints + On checkout hierarchy         | Avoids confusing merchant state with authorization, capture or an order                                    |
| Mobile action bar selects a size, adds the selected item or returns to the cart | User mobile requirement + craft guidance           | Keeps the purchase available on touch screens without duplicating the shopper's exact Add to cart selector |
| Fine underline/arrow movement and bounded product hover                         | COS link treatment + craft guidance                | Gives useful feedback without card lift, glow, infinite motion or hover-only content                       |

Token commitments: white `#ffffff`; ink/navy `#102c3a`; pale ice `#edf5f7`; secondary blue `#47758a`; rule `#d6e3e8`; Signal Blue `#0b63f6` for focus and selected UI; cyan `#8adce8` for small labels on navy. Product surfaces are rectangular, controls 4px, no gradients or decorative shadows. Red is error-only. No fake reviews, inventory urgency, shipping dates, physical performance claims or provider qualification.

## Purchase-flow refinement

The mobile order is product name and item price, compact product illustration, view controls, size selection, delivered total and Add to cart. The art stage is 218px tall at 390px and 186px below 360px; its three views remain available. Secondary product/test details and catalog previews follow the purchase controls. Desktop uses the same content in a compact two-column product layout rather than a tall hero followed by a long cart section.

S/M/L buttons have distinct accessible names and pressed states; the native select retains the single exact accessible name `Size`. A separate selected-size line makes the choice explicit. The mobile bar offers Choose size, Add item, or View cart according to state, without duplicating the shopper's exact `Add to cart` selector.

Adding opens a native modal cart drawer, with visible added-item feedback, a cart-size select, Remove item, Undo remove and one dominant `Review checkout` action. Desktop places the drawer at the right; mobile uses a bounded bottom sheet with a scrollable body and a persistent review footer. Back to product and Close cart are always available. Native dialog behavior supplies Escape dismissal, modal keyboard containment and return focus; undo and edit actions focus their next useful control. No page autoscroll occurs when adding. Size and cart controls retain at least 44px touch targets at 320px.

Review replaces the editable cart with the authoritative observed size and total, alongside the selected cart values. Differences are called out without inventing a verdict. Successful observation moves focus to the review heading only while the drawer is still open. A standalone result says Local preview complete and states that no payment provider was called. Errors remain retryable in the cart. The original run/token binding, merchant API payload and error handling are preserved.

## Behavioral boundary and validation ownership

The canonical cart remains Ocean Shell / Blue / S, M or L / quantity 1; item $129 + shipping $10 + tax $9 = $148. Existing `Size`, `Add to cart`, `Review checkout`, `cart-size` and `cart-total` targets remain. The merchant POST still reads `run` and `token` from the existing URL and sends the selected cart size. In-page store navigation preserves that URL binding. The observed merchant response may differ from the selected cart and must remain visible.

No new payment, capture, authorization, merchant-order, provider or agent call is introduced. The cart is page-local and the no-run review remains an explicitly labeled local preview. Rendering, 390px/320px overflow, keyboard/dialog focus, reduced motion and end-to-end selector checks belong to the coordinator's single browser/build task; source inspection alone is not rendered or provider qualification.
