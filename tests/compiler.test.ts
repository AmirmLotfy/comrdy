import test from "node:test";
import assert from "node:assert/strict";
import {
  compileIntent,
  COMPILER_PROMPT_VERSION,
} from "../src/providers/compiler";
import { createCanonicalCandidate } from "../src/core/fixtures";
import { confirmContract } from "../src/core/invariants";
import type { ContractCandidate } from "../src/core/types";

function mockedCompiler(modelCandidate: ContractCandidate) {
  const requests: Record<string, unknown>[] = [];
  const fetch: typeof globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({
        id: "resp_compiler_mock",
        object: "response",
        status: "completed",
        model: "mock-compiler-model",
        output: [
          {
            id: "msg_compiler_mock",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                text: JSON.stringify(modelCandidate),
                annotations: [],
              },
            ],
          },
        ],
        usage: { input_tokens: 120, output_tokens: 240, total_tokens: 360 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  return {
    requests,
    compile: (mandate = modelCandidate.mandate) =>
      compileIntent(mandate, { apiKey: "test-key-not-a-credential", fetch }),
  };
}

function candidateWithBudget(budget: string) {
  const candidate = structuredClone(createCanonicalCandidate());
  candidate.mandate = candidate.mandate.replace("$160 USD", budget);
  const total = candidate.constraints.find((c) => c.id === "inv_total")!;
  total.sourceText = total.sourceText!.replace("$160 USD", budget);
  // Deliberately reproduce a model inventing USD even when the buyer omitted it.
  return candidate;
}

test("compiler blocks model-inferred USD when the mandate currency is missing or ambiguous", async () => {
  for (const budget of ["160", "$160", "160 dollars", "EUR 160"]) {
    const modelCandidate = candidateWithBudget(budget);
    const { compile, requests } = mockedCompiler(modelCandidate);
    const compiled = await compile();
    assert.equal(requests.length, 1);
    assert.ok(
      compiled.candidate.needsResolution.some((issue) =>
        issue.includes("Explicitly identify USD"),
      ),
      budget,
    );
    assert.throws(() =>
      confirmContract(compiled.candidate, {
        id: "blocked-currency",
        version: 1,
        confirmedAt: "2026-11-01T00:00:00.000Z",
      }),
    );
    assert.deepEqual(compiled.rawCandidate, modelCandidate);
    assert.deepEqual(
      compiled.candidate.constraints,
      modelCandidate.constraints,
    );
    assert.deepEqual(modelCandidate.needsResolution, []);
  }
});

test("explicit supported currency spellings retain an otherwise valid model candidate", async () => {
  for (const budget of [
    "USD 160",
    "160 US dollars",
    "US$160",
    "160 U.S. dollars",
    "160 United States dollars",
  ]) {
    const modelCandidate = candidateWithBudget(budget);
    const compiled = await mockedCompiler(modelCandidate).compile();
    assert.deepEqual(compiled.candidate.needsResolution, [], budget);
    assert.deepEqual(compiled.candidate, modelCandidate);
    assert.equal(compiled.promptVersion, COMPILER_PROMPT_VERSION);
    assert.equal(compiled.responseId, "resp_compiler_mock");
    assert.equal(compiled.model, "mock-compiler-model");
    assert.deepEqual(compiled.usage, { inputTokens: 120, outputTokens: 240 });
  }
});

test("currency evidence comes from the submitted mandate even if the model rewrites it", async () => {
  const modelCandidate = createCanonicalCandidate();
  const buyerMandate = modelCandidate.mandate.replace("$160 USD", "160");
  const compiled = await mockedCompiler(modelCandidate).compile(buyerMandate);
  assert.equal(compiled.rawCandidate.mandate, modelCandidate.mandate);
  assert.equal(compiled.candidate.mandate, buyerMandate);
  assert.ok(
    compiled.candidate.needsResolution.some((issue) =>
      issue.includes("compiler altered the mandate"),
    ),
  );
  assert.ok(
    compiled.candidate.needsResolution.some((issue) =>
      issue.includes("Explicitly identify USD"),
    ),
  );
});

test("invented conjunction excerpt remains rejected and is never silently repaired", async () => {
  const modelCandidate = structuredClone(createCanonicalCandidate());
  const subscription = modelCandidate.constraints.find(
    (c) => c.id === "inv_subscription",
  )!;
  subscription.sourceText = "No subscriptions";
  const compiled = await mockedCompiler(modelCandidate).compile();
  assert.ok(
    compiled.candidate.needsResolution.includes(
      "inv_subscription: sourceText is not an exact mandate excerpt",
    ),
  );
  assert.throws(
    () =>
      confirmContract(compiled.candidate, {
        id: "blocked-excerpt",
        version: 1,
        confirmedAt: "2026-11-01T00:00:00.000Z",
      }),
    /sourceText is not an exact mandate excerpt/,
  );
  assert.deepEqual(compiled.rawCandidate, modelCandidate);
  assert.deepEqual(compiled.candidate.constraints, modelCandidate.constraints);
});

test("the complete shared prohibition can support both constraints without relaxation", async () => {
  const modelCandidate = createCanonicalCandidate();
  const { compile, requests } = mockedCompiler(modelCandidate);
  const compiled = await compile();
  assert.deepEqual(compiled.candidate, modelCandidate);
  assert.deepEqual(compiled.candidate.needsResolution, []);
  const input = requests[0].input as { role: string; content: string }[];
  const submitted = JSON.parse(
    input.find((item) => item.role === "user")!.content,
  );
  assert.deepEqual(submitted.catalog.sizeAliases, {
    small: "S",
    medium: "M",
    large: "L",
  });
  assert.equal(requests[0].store, false);
});
