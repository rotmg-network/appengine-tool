import md5 from "blueimp-md5";
import type { KeyValueRow } from "../types";

export function interpolate(value: string, variables: KeyValueRow[]): string {
  const lookup = new Map(variables.map((item) => [item.key, item.value]));
  const guid = lookup.get("guid") || "";
  const password = lookup.get("password") || "";
  const generated: Record<string, string> = {
    clientToken: guid || password ? md5(`${guid}${password}`) : "",
    timestamp: String(Date.now()),
    unix: String(Math.floor(Date.now() / 1000)),
    isoTime: new Date().toISOString(),
    randomInt: String(Math.floor(Math.random() * 1_000_000)),
    uuid: crypto.randomUUID(),
    randomEmail: `tester-${Math.floor(Math.random() * 1_000_000)}@example.com`
  };
  return value.replaceAll(/\{\{([^}]+)}}/g, (_match, key: string) => generated[key] ?? lookup.get(key) ?? "");
}

export function resolveRows(rows: KeyValueRow[], variables: KeyValueRow[]): KeyValueRow[] {
  return rows.map((item) => ({
    ...item,
    key: interpolate(item.key, variables),
    value: interpolate(item.value, variables)
  }));
}
