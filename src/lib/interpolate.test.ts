import { describe, expect, it } from "vitest";
import { interpolate, resolveRows } from "./interpolate";
import { row } from "./rows";

const vars = [row("guid", "user@example.com"), row("password", "hunter2"), row("accessToken", "tok-123")];

describe("interpolate", () => {
  it("substitutes a named variable", () => {
    expect(interpolate("token={{accessToken}}", vars)).toBe("token=tok-123");
  });

  it("substitutes multiple variables in one string", () => {
    expect(interpolate("{{guid}}:{{password}}", vars)).toBe("user@example.com:hunter2");
  });

  it("replaces unknown variables with an empty string", () => {
    expect(interpolate("a={{missing}}b", vars)).toBe("a=b");
  });

  it("computes clientToken as md5(guid + password)", () => {
    const result = interpolate("{{clientToken}}", vars);
    expect(result).toMatch(/^[a-f0-9]{32}$/);
  });

  it("generates a numeric unix timestamp", () => {
    expect(interpolate("{{unix}}", vars)).toMatch(/^\d+$/);
  });

  it("leaves plain text untouched", () => {
    expect(interpolate("/app/init", vars)).toBe("/app/init");
  });
});

describe("resolveRows", () => {
  it("interpolates both keys and values", () => {
    const rows = [row("token", "{{accessToken}}"), row("user", "{{guid}}")];
    expect(resolveRows(rows, vars).map((r) => [r.key, r.value])).toEqual([
      ["token", "tok-123"],
      ["user", "user@example.com"]
    ]);
  });
});
