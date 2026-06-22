import type { EnvironmentKey } from "../types";

export function loadStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function envStorageKey(environment: EnvironmentKey): string {
  return `rotmg:env:${environment}`;
}
