import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const base = "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();
try {
  await page.goto(base);
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page
    .getByRole("button", { name: "Replay illustration", exact: true })
    .click();
  await page.waitForTimeout(3000);
  assert.deepEqual(posts, []);
  assert.equal(await page.locator(".bench-stages li").count(), 4);
  assert.doesNotMatch(
    await page.locator(".transaction-diagram").innerText(),
    /M → S|SIZE [MS]/,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(
    await page
      .locator(".capture-copy > p:not(.technical-label)")
      .evaluate((el) => getComputedStyle(el).color),
    "rgb(189, 206, 227)",
  );
  await page.screenshot({
    path: "artifacts/screenshots/final-hero-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base);
  await page.screenshot({
    path: "artifacts/screenshots/final-hero-desktop.png",
  });
  await page.goto(base + "/demo");
  await page
    .getByRole("button", { name: "Compile intent contract", exact: true })
    .click();
  await page.getByText("Edit candidate constraints", { exact: true }).click();
  const input = page.getByLabel("Constraint JSON", { exact: true });
  const constraints = JSON.parse(await input.inputValue());
  const budget = constraints.find((c: any) => c.path === "pricing.total");
  budget.value.amountMinor = 15900;
  await input.fill(JSON.stringify(constraints, null, 2));
  await page.getByRole("button", { name: "Apply edits", exact: true }).click();
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/confirm") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Confirm these constraints", exact: true })
    .click();
  const confirmed = await (await response).json();
  assert.equal(confirmed.compiler.source, "local-fixture");
  assert.ok(
    confirmed.compiler.review.changedPaths.some((p: string) =>
      p.endsWith("/value/amountMinor"),
    ),
  );
  assert.equal(
    confirmed.compiler.review.originalCandidate.constraints.find(
      (c: any) => c.path === "pricing.total",
    ).value.amountMinor,
    16000,
  );
  assert.equal(
    confirmed.contract.constraints.find((c: any) => c.path === "pricing.total")
      .value.amountMinor,
    15900,
  );
  await page
    .getByRole("button", {
      name: "View compilation and review history",
      exact: true,
    })
    .click();
  assert.equal(await page.getByRole("dialog").isVisible(), true);
  await page.screenshot({
    path: "artifacts/screenshots/edited-contract-history.png",
  });
  await writeFile(
    "artifacts/hero-provenance-browser.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        mode: "simulation",
        checks: [
          "four-stage-hero",
          "replay-zero-posts",
          "mobile-overflow",
          "dark-section-readable-color",
          "edited-contract-original-and-final-provenance",
          "history-dialog",
        ],
        providerVerified: false,
      },
      null,
      2,
    ),
  );
  console.log("Hero and edited-contract browser checks passed.");
} finally {
  await browser.close();
}
