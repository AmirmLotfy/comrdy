import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("artifacts/screenshots", { recursive: true });
try {
  await page.goto(base + "/demo");
  await page
    .getByRole("button", { name: "Compile intent contract", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm these constraints", exact: true })
    .click();
  const runPromise = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/runs") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Run transaction test", exact: true })
    .click();
  const run = await (await runPromise).json();
  assert.equal(run.mode, "simulation");
  assert.equal(run.decision.verdict, "DENY");
  assert.equal(run.payment.authorizationId, null);
  assert.equal(run.snapshots[1].size, "S");
  await page.goto(base + "/cases/" + run.id);
  await page
    .getByRole("heading", {
      name: "The payment can pass. The purchase cannot.",
      exact: true,
    })
    .waitFor();
  const playbackWrites: string[] = [];
  const watch = (request: any) => {
    if (request.method() === "POST") playbackWrites.push(request.url());
  };
  page.on("request", watch);
  await page
    .getByRole("button", { name: "Next recorded event", exact: true })
    .click();
  await page.getByLabel("Recorded event", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Inspect this recorded event", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").isVisible(), false);
  assert.deepEqual(playbackWrites, []);
  page.off("request", watch);

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: `artifacts/screenshots/case-${width}.png` });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    assert.equal(overflow, false, `document overflow at ${width}`);
    if (width <= 390) {
      await page.locator(".lineage-mobile").scrollIntoViewIfNeeded();
      assert.equal(await page.locator(".lineage-mobile").isVisible(), true);
      assert.match(
        await page.locator(".lineage-mobile").innerText(),
        /First drift/,
      );
      const trigger = page.getByRole("button", {
        name: "Open navigation",
        exact: true,
      });
      await trigger.click();
      const navigation = page.getByRole("dialog", {
        name: "COMRDY navigation",
        exact: true,
      });
      assert.equal(await navigation.isVisible(), true);
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        assert.equal(
          await navigation.evaluate((el) =>
            el.contains(document.activeElement),
          ),
          true,
        );
      }
      await page.keyboard.press("Escape");
      assert.equal(await navigation.isVisible(), false);
      assert.equal(
        await trigger.evaluate((el) => el === document.activeElement),
        true,
      );
      await page.locator(".lineage-mobile").screenshot({
        path: `artifacts/screenshots/mobile-evidence-${width}.png`,
      });
    }
  }
  const recovery = await context.request.post(
    base + `/api/v1/runs/${run.id}/recover`,
    { data: {} },
  );
  assert.equal(recovery.status(), 200);
  const recovered = await recovery.json();
  assert.equal(recovered.contract.hash, run.contract.hash);
  assert.equal(recovered.decision.verdict, "ALLOW");
  assert.notEqual(recovered.id, run.id);
  const duplicate = await context.request.post(
    base + `/api/v1/runs/${run.id}/recover`,
    { data: {} },
  );
  assert.equal(duplicate.status(), 400);
  const foreign = await browser.newContext();
  assert.equal(
    (await foreign.request.get(base + "/api/v1/runs/" + run.id)).status(),
    400,
  );
  await foreign.close();
  const crossOrigin = await context.request.post(base + "/api/v1/confirm", {
    headers: { Origin: "https://untrusted.invalid" },
    data: { contract: run.contract },
  });
  assert.equal(crossOrigin.status(), 403);
  await page.goto(base + `/compare?left=${run.id}&right=${recovered.id}`);
  await page.screenshot({ path: "artifacts/screenshots/comparison.png" });
  await page.goto(base + "/store");
  await page.getByLabel("Size", { exact: true }).selectOption("M");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page
    .getByRole("button", { name: "Review checkout", exact: true })
    .click();
  assert.equal(await page.getByTestId("cart-size").innerText(), "M");
  assert.equal(await page.getByTestId("cart-total").innerText(), "$148.00");
  await page.screenshot({ path: "artifacts/screenshots/store.png" });
  await page.goto(base);
  await page.screenshot({ path: "artifacts/screenshots/home.png" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 1000 });
    for (const route of [
      "/",
      "/demo",
      "/docs",
      "/store",
      `/compare?left=${run.id}&right=${recovered.id}`,
    ]) {
      await page.goto(base + route);
      await page.locator("main").waitFor();
      if (route === "/demo")
        await page.locator(".runs-table tbody tr").first().waitFor();
      if (route.startsWith("/compare"))
        await page.locator(".compare-table").waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 2,
        ),
        false,
        `${route} overflows at ${width}`,
      );
      await page.screenshot({
        path: `artifacts/screenshots/redesign-${route.split("?")[0].replaceAll("/", "") || "home"}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/screenshots/mobile-menu.png" });
  await page
    .getByRole("dialog", { name: "COMRDY navigation" })
    .getByRole("link", { name: /Test lab/ })
    .click();
  await page.waitForURL(base + "/demo");
  assert.equal(
    await page.getByRole("dialog", { name: "COMRDY navigation" }).isVisible(),
    false,
  );
  await page.goto(base);
  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  assert.equal(
    await page.evaluate(
      () =>
        document.getAnimations().filter((a) => a.playState === "running")
          .length,
    ),
    0,
    "reduced motion leaves no running animations",
  );
  await page.screenshot({ path: "artifacts/screenshots/mobile-footer.png" });
  const noJS = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const staticPage = await noJS.newPage();
  await staticPage.goto(base);
  assert.equal(await staticPage.locator("h1").isVisible(), true);
  assert.equal(await staticPage.locator("#mechanism h2").isVisible(), true);
  await noJS.close();
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  const touchPage = await touch.newPage();
  await touchPage.goto(base);
  await touchPage
    .getByRole("button", { name: "Open navigation", exact: true })
    .tap();
  await touchPage
    .getByRole("dialog", { name: "COMRDY navigation" })
    .getByRole("link", { name: /Test lab/ })
    .tap();
  await touchPage.waitForURL(base + "/demo");
  await touchPage
    .getByRole("button", { name: "Compile intent contract", exact: true })
    .tap();
  await touchPage
    .getByRole("button", { name: "Confirm these constraints", exact: true })
    .tap();
  await touchPage
    .getByRole("button", { name: "Run transaction test", exact: true })
    .tap();
  await touchPage
    .getByRole("heading", { name: "Constraint evidence", exact: true })
    .waitFor();
  assert.equal(await touchPage.locator(".lineage-mobile").isVisible(), true);
  await touchPage.screenshot({
    path: "artifacts/screenshots/touch-run.png",
    fullPage: true,
  });
  await touch.close();
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/local-browser.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        mode: "simulation",
        runId: run.id,
        recoveryId: recovered.id,
        widths: [320, 390, 768, 1440],
        checks: [
          "compile-confirm-deny",
          "read-only-event-playback",
          "dialog-escape",
          "responsive-overflow-all-product-routes",
          "mobile-final-divergence-visible",
          "mobile-menu-focus-containment-and-return",
          "mobile-menu-navigation",
          "reduced-motion",
          "no-javascript-home-content",
          "touch-menu-and-complete-local-run",
          "bounded-recovery",
          "private-session-isolation",
          "cross-origin-rejection",
          "merchant-select-cart-review",
        ],
        pageErrors: errors,
        providerVerified: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "Local browser flow passed; screenshots and report in artifacts. No provider qualification.",
  );
} finally {
  await browser.close();
}
