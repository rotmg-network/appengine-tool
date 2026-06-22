import { describe, expect, it } from "vitest";
import { evaluateAssertions, xmlPathExists } from "./assertions";
import type { Assertion, ProxyResponse } from "../types";

const response: ProxyResponse = {
  ok: true,
  status: 200,
  elapsedMs: 120,
  headers: { "content-type": "application/xml" },
  body: "<Account><Name>Tester</Name></Account>"
};

function assertion(kind: Assertion["kind"], expected: string): Assertion {
  return { id: kind, kind, expected };
}

describe("evaluateAssertions", () => {
  it("returns no results without a response", () => {
    expect(evaluateAssertions([assertion("status", "200")], null)).toEqual([]);
  });

  it("passes a matching status", () => {
    expect(evaluateAssertions([assertion("status", "200")], response)[0].pass).toBe(true);
  });

  it("fails a mismatched status with a helpful message", () => {
    const result = evaluateAssertions([assertion("status", "404")], response)[0];
    expect(result.pass).toBe(false);
    expect(result.message).toContain("200");
  });

  it("checks body contains", () => {
    expect(evaluateAssertions([assertion("contains", "Tester")], response)[0].pass).toBe(true);
    expect(evaluateAssertions([assertion("contains", "Missing")], response)[0].pass).toBe(false);
  });

  it("checks header presence case-insensitively", () => {
    expect(evaluateAssertions([assertion("header", "Content-Type")], response)[0].pass).toBe(true);
    expect(evaluateAssertions([assertion("header", "x-absent")], response)[0].pass).toBe(false);
  });

  it("checks latency within a limit", () => {
    expect(evaluateAssertions([assertion("latency", "200")], response)[0].pass).toBe(true);
    expect(evaluateAssertions([assertion("latency", "100")], response)[0].pass).toBe(false);
  });

  it("evaluates regex and reports invalid patterns", () => {
    expect(evaluateAssertions([assertion("regex", "Test\\w+")], response)[0].pass).toBe(true);
    expect(evaluateAssertions([assertion("regex", "(")], response)[0].message).toBe("invalid regex");
  });

  it("evaluates an xml path", () => {
    expect(evaluateAssertions([assertion("xmlPath", "Account/Name")], response)[0].pass).toBe(true);
    expect(evaluateAssertions([assertion("xmlPath", "Account/Missing")], response)[0].pass).toBe(false);
  });
});

describe("xmlPathExists", () => {
  it("finds a nested element relative to the document root", () => {
    expect(xmlPathExists("<Account><Name>x</Name></Account>", "Account/Name")).toBe(true);
    expect(xmlPathExists("<Account><Name>x</Name></Account>", "Name")).toBe(true);
  });

  it("returns false for non-XML input", () => {
    expect(xmlPathExists("not xml", "Account")).toBe(false);
  });

  it("returns false for an empty path", () => {
    expect(xmlPathExists("<Account/>", "")).toBe(false);
  });
});
