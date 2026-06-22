import { describe, expect, it } from "vitest";
import { countMatches, formatBody, prettyXml } from "./format";

describe("formatBody", () => {
  it("pretty-prints JSON detected by content type", () => {
    expect(formatBody('{"a":1,"b":2}', "application/json")).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("pretty-prints JSON detected by leading brace", () => {
    expect(formatBody('{"a":1}', "")).toBe('{\n  "a": 1\n}');
  });

  it("returns the original text when JSON is invalid", () => {
    expect(formatBody("{not json}", "application/json")).toBe("{not json}");
  });

  it("indents XML", () => {
    expect(formatBody("<Account><Name>x</Name></Account>", "text/xml")).toBe("<Account>\n  <Name>x</Name>\n</Account>");
  });

  it("returns empty string for blank input", () => {
    expect(formatBody("   ", "")).toBe("");
  });

  it("passes plain text through", () => {
    expect(formatBody("hello world", "text/plain")).toBe("hello world");
  });
});

describe("prettyXml", () => {
  it("nests child elements with two-space indentation", () => {
    expect(prettyXml("<root><child>x</child></root>")).toBe("<root>\n  <child>x</child>\n</root>");
  });
});

describe("countMatches", () => {
  it("counts case-insensitive occurrences", () => {
    expect(countMatches("aAaA", "a")).toBe(4);
  });

  it("returns 0 for an empty search", () => {
    expect(countMatches("anything", "")).toBe(0);
  });

  it("counts non-overlapping multi-char matches", () => {
    expect(countMatches("abcabcabc", "abc")).toBe(3);
  });
});
