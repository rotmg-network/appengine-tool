import type { KeyValueRow, ParamSource } from "../types";

export function row(key = "", value = "", source: ParamSource = "text"): KeyValueRow {
  return { id: crypto.randomUUID(), enabled: true, key, value, source };
}

export function cloneRows(rows: KeyValueRow[]): KeyValueRow[] {
  return rows.map((item) => ({ ...item, id: crypto.randomUUID() }));
}

export function upsertVariable(rows: KeyValueRow[], key: string, value: string): KeyValueRow[] {
  const exists = rows.some((item) => item.key === key);
  if (exists) return rows.map((item) => (item.key === key ? { ...item, value } : item));
  return [...rows, row(key, value)];
}

export function extractAccessToken(body: string): string {
  return (
    body.match(/<AccessToken>([^<]+)<\/AccessToken>/i)?.[1] || body.match(/"accessToken"\s*:\s*"([^"]+)"/i)?.[1] || ""
  );
}

export function parseRawHeaders(value: string): KeyValueRow[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf(":");
      if (index === -1) return null;
      return row(line.slice(0, index).trim(), line.slice(index + 1).trim());
    })
    .filter((item): item is KeyValueRow => Boolean(item?.key));
}
