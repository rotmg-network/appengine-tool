import { describe, expect, it } from "vitest";
import { detectHighlightLanguage, findMatches, tokenize, type HighlightLanguage } from "./highlight";

function roundtrip(source: string, language: HighlightLanguage) {
  return tokenize(source, language)
    .map((token) => token.value)
    .join("");
}

describe("detectHighlightLanguage", () => {
  it("detects json by content type", () => {
    expect(detectHighlightLanguage("{}", "application/json")).toBe("json");
  });

  it("detects json by leading brace or bracket", () => {
    expect(detectHighlightLanguage('{"a":1}', "")).toBe("json");
    expect(detectHighlightLanguage("[1,2]", "")).toBe("json");
  });

  it("detects xml by content type or leading angle bracket", () => {
    expect(detectHighlightLanguage("<Account/>", "")).toBe("xml");
    expect(detectHighlightLanguage("<Account/>", "text/xml")).toBe("xml");
  });

  it("falls back to text for blank or unknown bodies", () => {
    expect(detectHighlightLanguage("   ", "")).toBe("text");
    expect(detectHighlightLanguage("hello", "text/plain")).toBe("text");
  });
});

describe("tokenize", () => {
  it("reproduces the source exactly for xml", () => {
    const xml = '<Account id="7">\n  <Name>Milk</Name>\n  <!-- note -->\n</Account>';
    expect(roundtrip(xml, "xml")).toBe(xml);
  });

  it("reproduces the source exactly for json", () => {
    const json = '{\n  "ok": true,\n  "count": -12.5,\n  "name": "milk"\n}';
    expect(roundtrip(json, "json")).toBe(json);
  });

  it("classifies xml tag names, attributes and values", () => {
    const tokens = tokenize('<Char id="1">x</Char>', "xml");
    expect(tokens.find((t) => t.type === "xml-name")?.value).toBe("Char");
    expect(tokens.find((t) => t.type === "xml-attr")?.value).toBe("id");
    expect(tokens.find((t) => t.type === "xml-value")?.value).toBe('"1"');
    expect(tokens.find((t) => t.type === "xml-text")?.value).toBe("x");
  });

  it("distinguishes json keys from string values", () => {
    const tokens = tokenize('{"name": "milk"}', "json");
    expect(tokens.find((t) => t.type === "json-key")?.value).toBe('"name"');
    expect(tokens.find((t) => t.type === "json-string")?.value).toBe('"milk"');
  });

  it("treats an unclosed comment as a single comment token", () => {
    const tokens = tokenize("<a/><!-- oops", "xml");
    expect(tokens.at(-1)).toEqual({ type: "xml-comment", value: "<!-- oops" });
  });

  it("emits a single plain token for text language", () => {
    expect(tokenize("<not-parsed>", "text")).toEqual([{ type: "plain", value: "<not-parsed>" }]);
  });
});

describe("findMatches", () => {
  it("returns non-overlapping case-insensitive ranges", () => {
    expect(findMatches("aAaA", "a")).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4]
    ]);
  });

  it("matches multi-character needles", () => {
    expect(findMatches("abcabc", "abc")).toEqual([
      [0, 3],
      [3, 6]
    ]);
  });

  it("returns nothing for an empty search", () => {
    expect(findMatches("anything", "")).toEqual([]);
  });
});
