import { builtinPresets } from "./presets";
import { cloneRows } from "./rows";
import { loadStorage } from "./storage";
import { envStorageKey } from "./storage";
import { defaultHeaders, defaultVariables, environmentKeys } from "../constants";
import type { EnvironmentKey, EnvironmentState } from "../types";

export function createDefaultEnvironmentState(): EnvironmentState {
  return {
    customBaseUrl: "",
    method: "POST",
    path: "/app/init",
    queryParams: [],
    formParams: cloneRows(builtinPresets[0].params),
    headers: cloneRows(defaultHeaders),
    headerType: "form",
    rawHeaders: "",
    bodyType: "form",
    rawBody: "",
    variables: cloneRows(defaultVariables),
    history: [],
    savedRequests: [],
    useCookieJar: true,
    followRedirects: false,
    timeoutMs: 30000
  };
}

export function loadEnvironmentState(environment: EnvironmentKey): EnvironmentState {
  const stored = loadStorage<Partial<EnvironmentState> | null>(envStorageKey(environment), null);
  const defaults = createDefaultEnvironmentState();
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    queryParams: stored.queryParams || defaults.queryParams,
    formParams: stored.formParams || defaults.formParams,
    headers: stored.headers || defaults.headers,
    headerType: stored.headerType || defaults.headerType,
    rawHeaders: stored.rawHeaders || defaults.rawHeaders,
    variables: stored.variables || defaults.variables,
    history: stored.history || defaults.history,
    savedRequests: stored.savedRequests || defaults.savedRequests,
    timeoutMs: stored.timeoutMs || defaults.timeoutMs
  };
}

export function loadAllEnvironmentStates(): Record<EnvironmentKey, EnvironmentState> {
  return environmentKeys.reduce(
    (states, key) => {
      states[key] = loadEnvironmentState(key);
      return states;
    },
    {} as Record<EnvironmentKey, EnvironmentState>
  );
}

export type EnvironmentAction =
  | { type: "patch"; patch: Partial<EnvironmentState> }
  | { type: "replace"; state: EnvironmentState };

export function environmentReducer(state: EnvironmentState, action: EnvironmentAction): EnvironmentState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.patch };
    case "replace":
      return action.state;
    default:
      return state;
  }
}
