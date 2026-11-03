import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/produksi?line=discpad", "/produksi?line=discpad"],
    ["/", "/"],
    [null, "/"],
    ["https://evil.example", "/"],
    ["//evil.example/path", "/"],
    ["/\\evil.example", "/"],
  ])("accepts only internal callback paths (%s)", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
