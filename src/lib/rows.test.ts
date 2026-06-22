import { describe, expect, it } from "vitest";
import { cloneRows, extractAccessToken, parseRawHeaders, row, upsertVariable } from "./rows";

describe("row", () => {
  it("creates an enabled text row with a unique id", () => {
    const a = row("k", "v");
    const b = row("k", "v");
    expect(a).toMatchObject({ key: "k", value: "v", enabled: true, source: "text" });
    expect(a.id).not.toEqual(b.id);
  });
});

describe("cloneRows", () => {
  it("copies values but assigns fresh ids", () => {
    const original = [row("a", "1"), row("b", "2")];
    const cloned = cloneRows(original);
    expect(cloned.map((r) => ({ key: r.key, value: r.value }))).toEqual([
      { key: "a", value: "1" },
      { key: "b", value: "2" }
    ]);
    expect(cloned[0].id).not.toEqual(original[0].id);
  });
});

describe("upsertVariable", () => {
  it("updates an existing key in place", () => {
    const rows = [row("guid", "old")];
    const next = upsertVariable(rows, "guid", "new");
    expect(next).toHaveLength(1);
    expect(next[0].value).toBe("new");
  });

  it("appends a new key when missing", () => {
    const rows = [row("guid", "x")];
    const next = upsertVariable(rows, "accessToken", "tok");
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({ key: "accessToken", value: "tok" });
  });
});

describe("extractAccessToken", () => {
  it("reads an XML AccessToken element", () => {
    expect(extractAccessToken("<Account><AccessToken>abc123</AccessToken></Account>")).toBe("abc123");
  });

  it("reads a JSON accessToken field", () => {
    expect(extractAccessToken('{"accessToken":"def456"}')).toBe("def456");
  });

  it("returns empty string when absent", () => {
    expect(extractAccessToken("nothing here")).toBe("");
  });
});

describe("parseRawHeaders", () => {
  it("parses key: value lines and ignores blanks/invalid", () => {
    const rows = parseRawHeaders("Content-Type: application/json\n\nbogus-line\nX-Test:  spaced ");
    expect(rows.map((r) => [r.key, r.value])).toEqual([
      ["Content-Type", "application/json"],
      ["X-Test", "spaced"]
    ]);
  });
});
