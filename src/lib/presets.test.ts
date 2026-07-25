import { describe, expect, it } from "vitest";
import { buildSidebarEndpoints, endpointId } from "./presets";
import type { EndpointDefinition } from "../endpointCatalog";

const catalog: EndpointDefinition[] = [
  { group: "app", name: "init", method: "POST", path: "/app/init", params: [{ key: "key", value: "abc" }] },
  { group: "char", name: "list", method: "POST", path: "/char/list" }
];

describe("endpointId", () => {
  it("derives a stable, slugged id from group, name and path", () => {
    expect(endpointId({ group: "App", name: "get List", method: "GET", path: "/a/b" })).toBe("app:get-list:/a/b");
  });
});

describe("buildSidebarEndpoints", () => {
  it("returns the catalog untouched when there are no overrides or custom endpoints", () => {
    const list = buildSidebarEndpoints({}, [], catalog);
    expect(list.map((item) => item.preset.name)).toEqual(["init", "list"]);
    expect(list.every((item) => item.origin === "builtin")).toBe(true);
  });

  it("hides a built-in endpoint deleted via a null override", () => {
    const list = buildSidebarEndpoints({ [endpointId(catalog[0])]: null }, [], catalog);
    expect(list.map((item) => item.preset.name)).toEqual(["list"]);
  });

  it("replaces a built-in endpoint with its override while keeping the original id", () => {
    const id = endpointId(catalog[0]);
    const list = buildSidebarEndpoints(
      { [id]: { group: "app", name: "boot", method: "GET", path: "/app/boot", params: catalog[0].params } },
      [],
      catalog
    );
    const edited = list.find((item) => item.origin === "builtin" && item.builtinId === id);
    expect(edited?.preset.name).toBe("boot");
    expect(edited?.preset.method).toBe("GET");
    expect(edited?.preset.params).toHaveLength(1);
  });

  it("appends custom endpoints after the built-ins with their array index", () => {
    const custom: EndpointDefinition[] = [{ group: "custom", name: "mine", method: "GET", path: "/mine" }];
    const list = buildSidebarEndpoints({}, custom, catalog);
    const last = list.at(-1);
    expect(last).toMatchObject({ origin: "custom", index: 0 });
    expect(last?.preset.name).toBe("mine");
  });
});
