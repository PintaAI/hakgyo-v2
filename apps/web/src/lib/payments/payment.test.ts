import { describe, expect, test } from "bun:test";

import {
  canTransitionPayment,
  createPaymentProofKey,
  parsePaymentProofKey,
} from "./payment";

describe("canTransitionPayment", () => {
  test("lets learners report and staff settle open payments", () => {
    expect(canTransitionPayment("PENDING", "SUBMITTED")).toBe(true);
    expect(canTransitionPayment("SUBMITTED", "PAID")).toBe(true);
    expect(canTransitionPayment("SUBMITTED", "REJECTED")).toBe(true);
  });

  test("lets staff approve late money and revert an approval", () => {
    expect(canTransitionPayment("CANCELLED", "PAID")).toBe(true);
    expect(canTransitionPayment("REJECTED", "PAID")).toBe(true);
    expect(canTransitionPayment("PAID", "REJECTED")).toBe(true);
  });

  test("keeps closed payments closed for learners", () => {
    expect(canTransitionPayment("PAID", "SUBMITTED")).toBe(false);
    expect(canTransitionPayment("PAID", "CANCELLED")).toBe(false);
    expect(canTransitionPayment("CANCELLED", "SUBMITTED")).toBe(false);
    expect(canTransitionPayment("EXPIRED", "SUBMITTED")).toBe(false);
  });
});

describe("payment proof keys", () => {
  test("round-trips size and content type for the payment", () => {
    const key = createPaymentProofKey("pay_1", 2048, "image/png");
    expect(parsePaymentProofKey(key, "pay_1")).toMatchObject({
      size: 2048,
      contentType: "image/png",
    });
  });

  test("rejects keys of another payment", () => {
    const key = createPaymentProofKey("pay_1", 2048, "image/png");
    expect(parsePaymentProofKey(key, "pay_2")).toBeNull();
  });
});
