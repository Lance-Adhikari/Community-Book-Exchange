import { APPROVED_SOURCE_SHA256, APPROVED_SOURCE_SIZE, assertApprovedFingerprint } from "./input";
import { ImportValidationError } from "./parser";
import { aggregateDigest, classifyIdempotency } from "./reconcile";
import { stableHash } from "./transform";

function assert(condition: unknown, test: string): asserts condition {
  if (!condition) throw new ImportValidationError("VALIDATION_TEST_FAILED", `Importer validation failed: ${test}.`);
}

function expectValidationError(action: () => void, expectedCode: string, test: string): void {
  try {
    action();
  } catch (error) {
    assert(error instanceof ImportValidationError && error.code === expectedCode, test);
    return;
  }
  throw new ImportValidationError("VALIDATION_TEST_FAILED", `Importer validation failed: ${test}.`);
}

function main(): void {
  assertApprovedFingerprint(APPROVED_SOURCE_SIZE, APPROVED_SOURCE_SHA256);
  expectValidationError(
    () => assertApprovedFingerprint(APPROVED_SOURCE_SIZE, "0".repeat(64)),
    "SOURCE_HASH_MISMATCH",
    "source hash rejection",
  );

  const firstHash = stableHash({ legacy_user_id: 1, nested: { a: true, b: null } });
  const reorderedHash = stableHash({ nested: { b: null, a: true }, legacy_user_id: 1 });
  assert(firstHash === reorderedHash, "stable source-row hashing");
  assert(aggregateDigest([firstHash, reorderedHash]) === aggregateDigest([reorderedHash, firstHash]), "stable aggregate hashing");

  const idempotency = classifyIdempotency(
    [
      { key: "insert", sourceRowHash: firstHash },
      { key: "same", sourceRowHash: firstHash },
      { key: "conflict", sourceRowHash: firstHash },
      { key: "invalid", sourceRowHash: "not-a-hash" },
    ],
    new Map([
      ["same", firstHash],
      ["conflict", stableHash({ different: true })],
    ]),
  );
  assert(idempotency.insert === 1, "idempotent insert classification");
  assert(idempotency.noOpSameHash === 1, "idempotent no-op classification");
  assert(idempotency.conflictDifferentHash === 1, "idempotent conflict classification");
  assert(idempotency.invalid === 1, "idempotent invalid classification");

  process.stdout.write(`${JSON.stringify({
    status: "PASS",
    tests: {
      approvedSourceFingerprint: "PASS",
      mismatchedSourceFingerprintRejection: "PASS",
      sourceRowHashStability: "PASS",
      aggregateHashDeterminism: "PASS",
      idempotencyClassification: "PASS",
    },
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  const category = error instanceof ImportValidationError ? error.code : "UNEXPECTED_VALIDATION_ERROR";
  process.stderr.write(`${JSON.stringify({ status: "FAIL", category })}\n`);
  process.exitCode = 1;
}
