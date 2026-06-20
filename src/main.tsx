import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CheckCircle2,
  Clock3,
  Cookie,
  Copy,
  Database,
  Download,
  History,
  ListPlus,
  Moon,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Sun,
  Trash2,
  Upload,
  XCircle
} from "lucide-react";
import md5 from "blueimp-md5";
import { builtinEndpointCatalog, type EndpointDefinition } from "./endpointCatalog";
import "./styles.css";

type EnvironmentKey =
  | "production"
  | "testing"
  | "currentTesting"
  | "realmTesting2"
  | "rotmgTesting3"
  | "rotmgTesting4"
  | "rotmgTesting5"
  | "custom";
type BodyType = "none" | "form" | "raw";
type ParamSource = "text" | "variable" | "generated" | "choice";
type Tab = "params" | "body" | "headers" | "variables" | "tests";
type ResponseTab = "body" | "headers" | "cookies" | "timing" | "rawRequest" | "rawResponse";
type Theme = "dark" | "light";

type KeyValueRow = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  source?: ParamSource;
};

type EndpointPreset = {
  id: string;
  group: string;
  name: string;
  method: string;
  path: string;
  params: KeyValueRow[];
  note?: string;
};

type SavedRequest = {
  id: string;
  name: string;
  method: string;
  path: string;
  queryParams: KeyValueRow[];
  formParams: KeyValueRow[];
  headers: KeyValueRow[];
  headerType: BodyType;
  rawHeaders: string;
  bodyType: BodyType;
  rawBody: string;
};

type HistoryItem = {
  id: string;
  method: string;
  path: string;
  environment: EnvironmentKey;
  status?: number;
  elapsedMs?: number;
  at: string;
};

type ProxyResponse = {
  ok: boolean;
  url?: string;
  status?: number;
  statusText?: string;
  redirected?: boolean;
  finalUrl?: string;
  headers?: Record<string, string>;
  setCookies?: string[];
  body?: string;
  elapsedMs?: number;
  rawRequest?: string;
  rawResponse?: string;
  error?: string;
};

type Assertion = {
  id: string;
  kind: "status" | "contains" | "header" | "latency" | "regex" | "xmlPath";
  expected: string;
};

type EnvironmentState = {
  customBaseUrl: string;
  method: string;
  path: string;
  queryParams: KeyValueRow[];
  formParams: KeyValueRow[];
  headers: KeyValueRow[];
  headerType: BodyType;
  rawHeaders: string;
  bodyType: BodyType;
  rawBody: string;
  variables: KeyValueRow[];
  history: HistoryItem[];
  savedRequests: SavedRequest[];
  useCookieJar: boolean;
  followRedirects: boolean;
  timeoutMs: number;
};

const environments: Record<EnvironmentKey, string> = {
  production: "https://realmofthemadgodhrd.appspot.com",
  testing: "https://rotmghrdtesting.appspot.com",
  currentTesting: "https://rotmgtesting.appspot.com",
  realmTesting2: "https://realmtesting2.appspot.com",
  rotmgTesting3: "https://rotmgtesting3.appspot.com",
  rotmgTesting4: "https://rotmgtesting4.appspot.com",
  rotmgTesting5: "https://rotmgtesting5.appspot.com",
  custom: ""
};

const environmentOptions: { key: EnvironmentKey; label: string }[] = [
  { key: "production", label: "Production" },
  { key: "testing", label: "Testing" },
  { key: "currentTesting", label: "Current testing" },
  { key: "realmTesting2", label: "Realm testing 2" },
  { key: "rotmgTesting3", label: "RotMG testing 3" },
  { key: "rotmgTesting4", label: "RotMG testing 4" },
  { key: "rotmgTesting5", label: "RotMG testing 5" },
  { key: "custom", label: "Custom" }
];

const environmentKeys = environmentOptions.map((item) => item.key);

const choices: Record<string, string[]> = {
  platform: ["standalonewindows64", "standalonewindows", "standaloneosxuniversal"],
  game_net: ["Unity", "rotmg"],
  play_platform: ["Unity"],
  game_net_user_id: ["_empty_"],
  languageType: ["en", "de", "fr", "es", "it", "pt", "ru", "tr"],
  timespan: ["week", "month", "all", "weekly", "monthly"],
  type: ["0", "1", "Unity"],
  /* Invalid = -1, Gold = 0, Fame = 1, GuildFame = 2, FortuneTokens = 3 */
  currency: ["-1", "0", "1", "2", "3"],
  quantity: ["1", "5", "10"],
  version: ["1.0"],
  isAgeVerified: ["1", "0"]
};

const customEndpointsStorageKey = "rotmg:custom-endpoints";

function row(key = "", value = "", source: ParamSource = "text"): KeyValueRow {
  return { id: crypto.randomUUID(), enabled: true, key, value, source };
}

function endpointFromDefinition(definition: EndpointDefinition): EndpointPreset {
  return {
    id: `${definition.group}:${definition.name}:${definition.path}`.toLowerCase().replaceAll(/\s+/g, "-"),
    group: definition.group,
    name: definition.name,
    method: definition.method,
    path: definition.path,
    params: (definition.params || []).map((param) => row(param.key, param.value || "", param.source || "text")),
    note: definition.note || ""
  };
}

const builtinPresets = builtinEndpointCatalog.map(endpointFromDefinition);

const UNITY_HEADERS = {
  "User-Agent": "UnityPlayer/2021.3.16f1 (UnityWebRequest/1.0, libcurl/7.84.0-DEV)",
  "X-Unity-Version": "2021.3.16f1",
  "Content-Type": "application/x-www-form-urlencoded"
};

const defaultHeaders = Object.entries(UNITY_HEADERS).map(([key, value]) => row(key, value));
const defaultVariables = [
  row("guid", "", "text"),
  row("password", "", "text"),
  row("accessToken", "", "text"),
  row("clientToken", "auto: MD5(guid + password)", "generated"),
  row("gameClientVersion", "", "text")
];
const defaultAssertions: Assertion[] = [{ id: crypto.randomUUID(), kind: "status", expected: "200" }];

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function envStorageKey(environment: EnvironmentKey) {
  return `rotmg:env:${environment}`;
}

function createDefaultEnvironmentState(): EnvironmentState {
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

function loadEnvironmentState(environment: EnvironmentKey): EnvironmentState {
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

function loadAllEnvironmentStates() {
  return environmentKeys.reduce(
    (states, key) => {
      states[key] = loadEnvironmentState(key);
      return states;
    },
    {} as Record<EnvironmentKey, EnvironmentState>
  );
}

function App() {
  const [environment, setEnvironment] = useState<EnvironmentKey>("production");
  const initialEnvironmentState = loadEnvironmentState("production");
  const [customBaseUrl, setCustomBaseUrl] = useState(initialEnvironmentState.customBaseUrl);
  const [method, setMethod] = useState(initialEnvironmentState.method);
  const [path, setPath] = useState(initialEnvironmentState.path);
  const [queryParams, setQueryParams] = useState<KeyValueRow[]>(initialEnvironmentState.queryParams);
  const [formParams, setFormParams] = useState<KeyValueRow[]>(initialEnvironmentState.formParams);
  const [headers, setHeaders] = useState<KeyValueRow[]>(initialEnvironmentState.headers);
  const [headerType, setHeaderType] = useState<BodyType>(initialEnvironmentState.headerType);
  const [rawHeaders, setRawHeaders] = useState(initialEnvironmentState.rawHeaders);
  const [bodyType, setBodyType] = useState<BodyType>(initialEnvironmentState.bodyType);
  const [rawBody, setRawBody] = useState(initialEnvironmentState.rawBody);
  const [variables, setVariables] = useState<KeyValueRow[]>(initialEnvironmentState.variables);
  const [history, setHistory] = useState<HistoryItem[]>(initialEnvironmentState.history);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>(initialEnvironmentState.savedRequests);
  const [assertions, setAssertions] = useState<Assertion[]>(defaultAssertions);
  const [activeTab, setActiveTab] = useState<Tab>("params");
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<Theme>(() => loadStorage("rotmg:theme", "dark"));
  const [useCookieJar, setUseCookieJar] = useState(initialEnvironmentState.useCookieJar);
  const [followRedirects, setFollowRedirects] = useState(initialEnvironmentState.followRedirects);
  const [timeoutMs, setTimeoutMs] = useState(initialEnvironmentState.timeoutMs);
  const [customEndpoints, setCustomEndpoints] = useState<EndpointDefinition[]>(() => loadStorage(customEndpointsStorageKey, []));
  const [newEndpoint, setNewEndpoint] = useState<EndpointDefinition>({
    group: "custom",
    name: "",
    method: "GET",
    path: ""
  });
  const [isEndpointModalOpen, setIsEndpointModalOpen] = useState(false);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveStorage("rotmg:theme", theme);
  }, [theme]);

  const allPresets = useMemo(() => [...builtinPresets, ...customEndpoints.map(endpointFromDefinition)], [customEndpoints]);
  const customPresetIds = useMemo(() => new Set(customEndpoints.map((item) => endpointFromDefinition(item).id)), [customEndpoints]);

  const groupedPresets = useMemo(() => {
    const filtered = allPresets.filter((preset) => {
      const haystack = `${preset.group} ${preset.name} ${preset.path}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
    return filtered.reduce((groups, preset) => {
      const group = groups.get(preset.group) || [];
      group.push(preset);
      groups.set(preset.group, group);
      return groups;
    }, new Map<string, EndpointPreset[]>());
  }, [allPresets, search]);

  const assertionResults = useMemo(() => evaluateAssertions(assertions, response), [assertions, response]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (!isSending) void sendRequest();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function currentEnvironmentState(): EnvironmentState {
    return {
      customBaseUrl,
      method,
      path,
      queryParams,
      formParams,
      headers,
      headerType,
      rawHeaders,
      bodyType,
      rawBody,
      variables,
      history,
      savedRequests,
      useCookieJar,
      followRedirects,
      timeoutMs
    };
  }

  function applyEnvironmentState(state: EnvironmentState) {
    setCustomBaseUrl(state.customBaseUrl);
    setMethod(state.method);
    setPath(state.path);
    setQueryParams(state.queryParams);
    setFormParams(state.formParams);
    setHeaders(state.headers);
    setHeaderType(state.headerType);
    setRawHeaders(state.rawHeaders);
    setBodyType(state.bodyType);
    setRawBody(state.rawBody);
    setVariables(state.variables);
    setHistory(state.history);
    setSavedRequests(state.savedRequests);
    setUseCookieJar(state.useCookieJar);
    setFollowRedirects(state.followRedirects);
    setTimeoutMs(state.timeoutMs);
  }

  function changeEnvironment(nextEnvironment: EnvironmentKey) {
    if (nextEnvironment === environment) return;
    saveStorage(envStorageKey(environment), currentEnvironmentState());
    applyEnvironmentState(loadEnvironmentState(nextEnvironment));
    setResponse(null);
    setResponseTab("body");
    setEnvironment(nextEnvironment);
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      saveStorage(envStorageKey(environment), currentEnvironmentState());
    }, 250);
    return () => window.clearTimeout(id);
  }, [
    environment,
    customBaseUrl,
    method,
    path,
    queryParams,
    formParams,
    headers,
    headerType,
    rawHeaders,
    bodyType,
    rawBody,
    variables,
    history,
    savedRequests,
    useCookieJar,
    followRedirects,
    timeoutMs
  ]);

  function applyPreset(preset: EndpointPreset) {
    setMethod(preset.method);
    setPath(preset.path);
    setQueryParams(preset.method === "GET" ? cloneRows(preset.params) : []);
    setFormParams(preset.method === "GET" ? [] : cloneRows(preset.params));
    setBodyType(preset.method === "GET" ? "none" : "form");
    setActiveTab(preset.method === "GET" ? "params" : "body");
    requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({ block: "start" });
      window.scrollTo({ top: 0 });
    });
  }

  function persistVariables(next: KeyValueRow[]) {
    setVariables(next);
  }

  function persistHistory(next: HistoryItem[]) {
    setHistory(next);
  }

  function persistSaved(next: SavedRequest[]) {
    setSavedRequests(next);
  }

  function persistCustomEndpoints(next: EndpointDefinition[]) {
    setCustomEndpoints(next);
    saveStorage(customEndpointsStorageKey, next);
  }

  function addCustomEndpoint() {
    const name = newEndpoint.name.trim();
    const pathValue = newEndpoint.path.trim();
    if (!name || !pathValue) return;
    const nextEndpoint: EndpointDefinition = {
      group: newEndpoint.group.trim() || "custom",
      name,
      method: newEndpoint.method || "GET",
      path: pathValue.startsWith("/") ? pathValue : `/${pathValue}`,
      params: []
    };
    persistCustomEndpoints([...customEndpoints, nextEndpoint]);
    setNewEndpoint({ group: "custom", name: "", method: "GET", path: "" });
    setIsEndpointModalOpen(false);
  }

  function removeCustomEndpoint(endpoint: EndpointPreset) {
    persistCustomEndpoints(
      customEndpoints.filter((item) => endpointFromDefinition(item).id !== endpoint.id)
    );
  }

  function resolveRows(rows: KeyValueRow[]) {
    return rows.map((item) => ({ ...item, key: interpolate(item.key, variables), value: interpolate(item.value, variables) }));
  }

  function resolveHeaders() {
    if (headerType === "none") return [];
    if (headerType === "raw") return parseRawHeaders(interpolate(rawHeaders, variables));
    return resolveRows(headers);
  }

  async function sendRequest() {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setIsSending(true);
    setResponse(null);
    try {
      const payload = {
        environment,
        customBaseUrl: environment === "custom" ? customBaseUrl : "",
        method,
        path: interpolate(path, variables),
        queryParams: resolveRows(queryParams),
        formParams: resolveRows(formParams),
        headers: resolveHeaders(),
        bodyType,
        rawBody: interpolate(rawBody, variables),
        useCookieJar,
        followRedirects,
        timeoutMs
      };
      const result = await fetch("/api/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const data = (await result.json()) as ProxyResponse;
      setResponse(data);
      setResponseTab("body");
      const nextHistory = [
        {
          id: crypto.randomUUID(),
          method,
          path,
          environment,
          status: data.status,
          elapsedMs: data.elapsedMs,
          at: new Date().toISOString()
        },
        ...history
      ].slice(0, 80);
      persistHistory(nextHistory);
      const token = extractAccessToken(data.body || "");
      if (token) {
        persistVariables(upsertVariable(variables, "accessToken", token));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setResponse({
          ok: false,
          error: "Request cancelled",
          elapsedMs: 0
        });
      } else {
        setResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } finally {
      if (requestController.current === controller) requestController.current = null;
      setIsSending(false);
    }
  }

  function cancelRequest() {
    requestController.current?.abort();
  }

  function saveCurrentRequest() {
    const name = `${method} ${path}`;
    const next: SavedRequest = {
      id: crypto.randomUUID(),
      name,
      method,
      path,
      queryParams,
      formParams,
      headers,
      headerType,
      rawHeaders,
      bodyType,
      rawBody
    };
    persistSaved([next, ...savedRequests]);
  }

  function loadSaved(request: SavedRequest) {
    setMethod(request.method);
    setPath(request.path);
    setQueryParams(cloneRows(request.queryParams));
    setFormParams(cloneRows(request.formParams));
    setHeaders(cloneRows(request.headers));
    setHeaderType(request.headerType || "form");
    setRawHeaders(request.rawHeaders || "");
    setBodyType(request.bodyType);
    setRawBody(request.rawBody);
  }

  function loadHistoryItem(item: HistoryItem) {
    if (item.environment !== environment) {
      saveStorage(envStorageKey(environment), currentEnvironmentState());
      applyEnvironmentState(loadEnvironmentState(item.environment));
      setEnvironment(item.environment);
      setResponse(null);
    }
    setMethod(item.method);
    setPath(item.path);
  }

  function exportCollection() {
    saveStorage(envStorageKey(environment), currentEnvironmentState());
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 2,
            exportedAt: new Date().toISOString(),
            activeEnvironment: environment,
            environmentStates: loadAllEnvironmentStates(),
            customEndpoints
          },
          null,
          2
        )
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "appengine-api-suite-collection.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importCollection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      const parsed = JSON.parse(text) as {
        activeEnvironment?: EnvironmentKey;
        environmentStates?: Partial<Record<EnvironmentKey, EnvironmentState>>;
        customEndpoints?: EndpointDefinition[];
        savedRequests?: SavedRequest[];
        variables?: KeyValueRow[];
      };
      if (parsed.customEndpoints) persistCustomEndpoints(parsed.customEndpoints);
      if (parsed.environmentStates) {
        for (const key of environmentKeys) {
          const state = parsed.environmentStates[key];
          if (state) saveStorage(envStorageKey(key), state);
        }
        const nextEnvironment = parsed.activeEnvironment || environment;
        setEnvironment(nextEnvironment);
        applyEnvironmentState(loadEnvironmentState(nextEnvironment));
        setResponse(null);
        return;
      }
      if (parsed.savedRequests) persistSaved(parsed.savedRequests);
      if (parsed.variables) persistVariables(parsed.variables);
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Database size={23} />
          <div>
            <strong>AppEngine Suite</strong>
            <span>RotMG endpoint testing</span>
          </div>
        </div>

        <label className="search">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search endpoints" />
        </label>

        <div className="sidebar-action">
          <button className="add-row endpoint-add-button" onClick={() => setIsEndpointModalOpen(true)}>
            <Plus size={15} />
            Add endpoint
          </button>
        </div>

        <div className="sidebar-scroll">
          {[...groupedPresets.entries()].map(([group, items]) => (
            <section className="nav-group" key={group}>
              <div className="group-title">{group}</div>
              {items.map((preset) => (
                <button className="endpoint-button" key={preset.id} onClick={() => applyPreset(preset)}>
                  <span className={`method ${preset.method.toLowerCase()}`}>{preset.method}</span>
                  <span>{preset.name}</span>
                  {customPresetIds.has(preset.id) && (
                    <Trash2
                      size={14}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeCustomEndpoint(preset);
                      }}
                    />
                  )}
                </button>
              ))}
            </section>
          ))}

          <section className="nav-group">
            <div className="group-title">Saved</div>
            {savedRequests.map((request) => (
              <button className="saved-button" key={request.id} onClick={() => loadSaved(request)}>
                <span>{request.name}</span>
                <Trash2
                  size={14}
                  onClick={(event) => {
                    event.stopPropagation();
                    persistSaved(savedRequests.filter((item) => item.id !== request.id));
                  }}
                />
              </button>
            ))}
          </section>
        </div>
      </aside>

      <main className="workspace" ref={workspaceRef}>
        <header className="topbar">
          <label className="environment-picker">
            <span>Environment</span>
            <select value={environment} onChange={(event) => changeEnvironment(event.target.value as EnvironmentKey)}>
              {environmentOptions.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label} - {item.key === "custom" ? customBaseUrl || "custom URL" : environments[item.key].replace("https://", "")}
                </option>
              ))}
            </select>
          </label>
          <div className="top-actions">
            <button className="icon-button" title="Import" onClick={() => document.getElementById("collection-import")?.click()}>
              <Upload size={17} />
            </button>
            <input id="collection-import" hidden type="file" accept="application/json" onChange={importCollection} />
            <button className="icon-button" title="Export" onClick={exportCollection}>
              <Download size={17} />
            </button>
            <button className="icon-button" title="Save" onClick={saveCurrentRequest}>
              <Save size={17} />
            </button>
            <button
              className="icon-button"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        {environment === "custom" && (
          <input
            className="custom-url"
            value={customBaseUrl}
            onChange={(event) => setCustomBaseUrl(event.target.value)}
            placeholder="https://example.appspot.com"
          />
        )}

        <section className="request-line">
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input value={path} onChange={(event) => setPath(event.target.value)} />
          <button className="send-button" onClick={sendRequest} disabled={isSending}>
            {isSending ? <RefreshCw className="spin" size={17} /> : <Play size={17} />}
            Send
          </button>
          {isSending && (
            <button className="cancel-button" onClick={cancelRequest}>
              <XCircle size={17} />
              Cancel
            </button>
          )}
        </section>

        <section className="switch-row">
          <label>
            <input type="checkbox" checked={useCookieJar} onChange={(event) => setUseCookieJar(event.target.checked)} />
            Cookie jar
          </label>
          <label>
            <input type="checkbox" checked={followRedirects} onChange={(event) => setFollowRedirects(event.target.checked)} />
            Follow redirects
          </label>
          <label>
            Timeout
            <input
              className="number-input"
              min="1000"
              max="120000"
              step="1000"
              type="number"
              value={timeoutMs}
              onChange={(event) => setTimeoutMs(Number(event.target.value) || 30000)}
            />
            ms
          </label>
        </section>

        <section className="panel request-panel">
          <Tabs
            active={activeTab}
            onChange={setActiveTab}
            tabs={[
              ["params", "Params"],
              ["body", "Body"],
              ["headers", "Headers"],
              ["variables", "Variables"],
              ["tests", "Tests"]
            ]}
          />
          {activeTab === "params" && <KeyValueEditor rows={queryParams} onChange={setQueryParams} />}
          {activeTab === "body" && (
            <BodyEditor
              bodyType={bodyType}
              setBodyType={setBodyType}
              formParams={formParams}
              setFormParams={setFormParams}
              rawBody={rawBody}
              setRawBody={setRawBody}
            />
          )}
          {activeTab === "headers" && (
            <HeaderEditor
              headerType={headerType}
              setHeaderType={setHeaderType}
              headers={headers}
              setHeaders={setHeaders}
              rawHeaders={rawHeaders}
              setRawHeaders={setRawHeaders}
            />
          )}
          {activeTab === "variables" && <KeyValueEditor rows={variables} onChange={persistVariables} />}
          {activeTab === "tests" && <AssertionEditor assertions={assertions} setAssertions={setAssertions} results={assertionResults} />}
        </section>

        <section className="response-grid">
          <div className="panel response-panel">
            <div className="response-head">
              <div className="status-line">
                {response?.ok === false && <XCircle size={18} />}
                {response?.status && <span className={response.status < 400 ? "status-ok" : "status-bad"}>{response.status}</span>}
                {response?.statusText && <span>{response.statusText}</span>}
                {typeof response?.elapsedMs === "number" && (
                  <span className="muted">
                    <Clock3 size={14} /> {response.elapsedMs} ms
                  </span>
                )}
              </div>
              {response?.url && <span className="url-line">{response.url}</span>}
            </div>
            <Tabs
              active={responseTab}
              onChange={setResponseTab}
              tabs={[
                ["body", "Body"],
                ["headers", "Headers"],
                ["cookies", "Cookies"],
                ["timing", "Timing"],
                ["rawRequest", "Raw Request"],
                ["rawResponse", "Raw Response"]
              ]}
            />
            <ResponseViewer tab={responseTab} response={response} />
          </div>

          <aside className="panel history-panel">
            <div className="history-title">
              <History size={17} />
              <strong>History</strong>
              <button className="icon-button small" title="Clear" onClick={() => persistHistory([])}>
                <Trash2 size={14} />
              </button>
            </div>
            <div className="history-list">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadHistoryItem(item)}
                >
                  <span className={`method ${item.method.toLowerCase()}`}>{item.method}</span>
                  <span>{item.path}</span>
                  <small>{item.status || "-"} · {item.elapsedMs || "-"} ms</small>
                </button>
              ))}
            </div>
          </aside>
        </section>
      </main>
      {isEndpointModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsEndpointModalOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="endpoint-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <strong id="endpoint-modal-title">Add endpoint</strong>
              <button className="icon-button small" title="Close" onClick={() => setIsEndpointModalOpen(false)}>
                <XCircle size={14} />
              </button>
            </div>
            <div className="endpoint-form modal-endpoint-form">
              <label>
                Group
                <input
                  value={newEndpoint.group}
                  onChange={(event) => setNewEndpoint({ ...newEndpoint, group: event.target.value })}
                  placeholder="custom"
                />
              </label>
              <label>
                Name
                <input
                  autoFocus
                  value={newEndpoint.name}
                  onChange={(event) => setNewEndpoint({ ...newEndpoint, name: event.target.value })}
                  placeholder="endpointName"
                />
              </label>
              <label>
                Method
                <select value={newEndpoint.method} onChange={(event) => setNewEndpoint({ ...newEndpoint, method: event.target.value })}>
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="wide-field">
                Path
                <input
                  value={newEndpoint.path}
                  onChange={(event) => setNewEndpoint({ ...newEndpoint, path: event.target.value })}
                  placeholder="/path"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="soft-button" onClick={() => setIsEndpointModalOpen(false)}>Cancel</button>
              <button className="send-button modal-submit" onClick={addCustomEndpoint}>
                <Plus size={15} />
                Add endpoint
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function BodyEditor({
  bodyType,
  setBodyType,
  formParams,
  setFormParams,
  rawBody,
  setRawBody
}: {
  bodyType: BodyType;
  setBodyType: (type: BodyType) => void;
  formParams: KeyValueRow[];
  setFormParams: (rows: KeyValueRow[]) => void;
  rawBody: string;
  setRawBody: (value: string) => void;
}) {
  return (
    <>
      <div className="segmented">
        {(["none", "form", "raw"] as BodyType[]).map((type) => (
          <button key={type} className={bodyType === type ? "active" : ""} onClick={() => setBodyType(type)}>
            {type}
          </button>
        ))}
      </div>
      {bodyType === "form" && <KeyValueEditor rows={formParams} onChange={setFormParams} />}
      {bodyType === "raw" && <textarea className="raw-editor" value={rawBody} onChange={(event) => setRawBody(event.target.value)} />}
      {bodyType === "none" && <div className="empty-state">No request body</div>}
    </>
  );
}

function HeaderEditor({
  headerType,
  setHeaderType,
  headers,
  setHeaders,
  rawHeaders,
  setRawHeaders
}: {
  headerType: BodyType;
  setHeaderType: (type: BodyType) => void;
  headers: KeyValueRow[];
  setHeaders: (rows: KeyValueRow[]) => void;
  rawHeaders: string;
  setRawHeaders: (value: string) => void;
}) {
  return (
    <>
      <div className="segmented">
        {(["none", "form", "raw"] as BodyType[]).map((type) => (
          <button key={type} className={headerType === type ? "active" : ""} onClick={() => setHeaderType(type)}>
            {type}
          </button>
        ))}
      </div>
      {headerType === "form" && <KeyValueEditor rows={headers} onChange={setHeaders} />}
      {headerType === "raw" && (
        <textarea
          className="raw-editor"
          value={rawHeaders}
          onChange={(event) => setRawHeaders(event.target.value)}
          placeholder={"Header-Name: value\nAnother-Header: value"}
        />
      )}
      {headerType === "none" && <div className="empty-state">No request headers</div>}
    </>
  );
}

function KeyValueEditor({
  rows,
  onChange
}: {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
}) {
  function update(id: string, patch: Partial<KeyValueRow>) {
    onChange(rows.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="kv-editor">
      <div className="kv-head">
        <span></span>
        <span>Key</span>
        <span>Value</span>
        <span>Source</span>
        <span></span>
      </div>
      {rows.map((item) => {
        const keyChoices = choices[item.key] || [];
        return (
          <div className="kv-row" key={item.id}>
            <input type="checkbox" checked={item.enabled} onChange={(event) => update(item.id, { enabled: event.target.checked })} />
            <input value={item.key} onChange={(event) => update(item.id, { key: event.target.value })} />
            {keyChoices.length ? (
              <select value={item.value} onChange={(event) => update(item.id, { value: event.target.value, source: "choice" })}>
                {keyChoices.map((choice) => (
                  <option key={choice}>{choice}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={item.value}
                onChange={(event) => update(item.id, { value: event.target.value })}
              />
            )}
            <select value={item.source || "text"} onChange={(event) => update(item.id, { source: event.target.value as ParamSource })}>
              <option value="text">text</option>
              <option value="variable">variable</option>
              <option value="generated">generated</option>
              <option value="choice">choice</option>
            </select>
            <button className="icon-button small" title="Remove" onClick={() => onChange(rows.filter((rowItem) => rowItem.id !== item.id))}>
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
      <button className="add-row" onClick={() => onChange([...rows, row()])}>
        <Plus size={15} />
        Add row
      </button>
    </div>
  );
}

function AssertionEditor({
  assertions,
  setAssertions,
  results
}: {
  assertions: Assertion[];
  setAssertions: (items: Assertion[]) => void;
  results: { id: string; pass: boolean; message: string }[];
}) {
  function update(id: string, patch: Partial<Assertion>) {
    setAssertions(assertions.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="assertions">
      {assertions.map((assertion) => {
        const result = results.find((item) => item.id === assertion.id);
        return (
          <div className="assertion-row" key={assertion.id}>
            {result ? result.pass ? <CheckCircle2 className="pass" size={17} /> : <XCircle className="fail" size={17} /> : <Settings2 size={17} />}
            <select value={assertion.kind} onChange={(event) => update(assertion.id, { kind: event.target.value as Assertion["kind"] })}>
              <option value="status">status</option>
              <option value="contains">contains</option>
              <option value="header">header</option>
              <option value="latency">latency</option>
              <option value="regex">regex</option>
              <option value="xmlPath">xml path</option>
            </select>
            <input value={assertion.expected} onChange={(event) => update(assertion.id, { expected: event.target.value })} />
            <span>{result?.message || ""}</span>
            <button className="icon-button small" onClick={() => setAssertions(assertions.filter((item) => item.id !== assertion.id))}>
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
      <button className="add-row" onClick={() => setAssertions([...assertions, { id: crypto.randomUUID(), kind: "contains", expected: "" }])}>
        <ListPlus size={15} />
        Add assertion
      </button>
    </div>
  );
}

function ResponseViewer({ tab, response }: { tab: ResponseTab; response: ProxyResponse | null }) {
  const [search, setSearch] = useState("");
  if (!response) return <div className="empty-state">No response</div>;
  if (response.error) return <CodePane value={response.error} error />;

  if (tab === "body") {
    return <CodePane value={formatBody(response.body || "", response.headers?.["content-type"] || "")} search={search} setSearch={setSearch} filename="response-body.txt" />;
  }
  if (tab === "headers") {
    return <CodePane value={JSON.stringify(response.headers || {}, null, 2)} search={search} setSearch={setSearch} filename="response-headers.json" />;
  }
  if (tab === "cookies") {
    return (
      <div className="cookie-list">
        {(response.setCookies || []).length === 0 && <div className="empty-state">No Set-Cookie headers</div>}
        {(response.setCookies || []).map((cookie, index) => (
          <div className="cookie-row" key={`${cookie}-${index}`}>
            <Cookie size={15} />
            <code>{cookie}</code>
          </div>
        ))}
      </div>
    );
  }
  if (tab === "timing") {
    return (
      <div className="timing-view">
        <div><span>Elapsed</span><strong>{response.elapsedMs} ms</strong></div>
        <div><span>Redirected</span><strong>{response.redirected ? "yes" : "no"}</strong></div>
        <div><span>Final URL</span><strong>{response.finalUrl || response.url}</strong></div>
      </div>
    );
  }
  if (tab === "rawRequest") return <CodePane value={response.rawRequest || ""} search={search} setSearch={setSearch} filename="raw-request.txt" />;
  return <CodePane value={response.rawResponse || ""} search={search} setSearch={setSearch} filename="raw-response.txt" />;
}

function CodePane({
  value,
  error = false,
  filename = "response.txt",
  search = "",
  setSearch
}: {
  value: string;
  error?: boolean;
  filename?: string;
  search?: string;
  setSearch?: (value: string) => void;
}) {
  const matches = search ? countMatches(value, search) : 0;
  return (
    <>
      {setSearch && (
        <div className="response-tools">
          <label className="response-search">
            <Search size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search response" />
          </label>
          <span className="match-count">{search ? `${matches} matches` : ""}</span>
          <button className="icon-button small" title="Copy" onClick={() => navigator.clipboard.writeText(value)}>
            <Copy size={14} />
          </button>
          <button className="icon-button small" title="Download" onClick={() => downloadText(filename, value)}>
            <Download size={14} />
          </button>
        </div>
      )}
      <pre className={error ? "code-view error" : "code-view"}>{value}</pre>
    </>
  );
}

function countMatches(value: string, search: string) {
  if (!search) return 0;
  let count = 0;
  let index = value.toLowerCase().indexOf(search.toLowerCase());
  while (index !== -1) {
    count += 1;
    index = value.toLowerCase().indexOf(search.toLowerCase(), index + search.length);
  }
  return count;
}

function downloadText(filename: string, value: string) {
  const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Tabs<T extends string>({
  active,
  onChange,
  tabs
}: {
  active: T;
  onChange: (tab: T) => void;
  tabs: [T, string][];
}) {
  return (
    <div className="tabs">
      {tabs.map(([key, label]) => (
        <button key={key} className={active === key ? "active" : ""} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function parseRawHeaders(value: string): KeyValueRow[] {
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

function interpolate(value: string, variables: KeyValueRow[]) {
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

function cloneRows(rows: KeyValueRow[]) {
  return rows.map((item) => ({ ...item, id: crypto.randomUUID() }));
}

function upsertVariable(rows: KeyValueRow[], key: string, value: string) {
  const exists = rows.some((item) => item.key === key);
  if (exists) return rows.map((item) => (item.key === key ? { ...item, value } : item));
  return [...rows, row(key, value)];
}

function extractAccessToken(body: string) {
  return body.match(/<AccessToken>([^<]+)<\/AccessToken>/i)?.[1] || body.match(/"accessToken"\s*:\s*"([^"]+)"/i)?.[1] || "";
}

function formatBody(body: string, contentType: string) {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (contentType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return body;
    }
  }
  if (trimmed.startsWith("<")) return prettyXml(trimmed);
  return body;
}

function prettyXml(xml: string) {
  return xml
    .replace(/></g, ">\n<")
    .split("\n")
    .reduce<{ indent: number; lines: string[] }>(
      (state, line) => {
        const trimmed = line.trim();
        if (/^<\//.test(trimmed)) state.indent = Math.max(0, state.indent - 1);
        state.lines.push(`${"  ".repeat(state.indent)}${trimmed}`);
        if (/^<[^!?/][^>]*[^/]>\s*$/.test(trimmed) && !trimmed.includes("</")) state.indent += 1;
        return state;
      },
      { indent: 0, lines: [] }
    ).lines.join("\n");
}

function evaluateAssertions(assertions: Assertion[], response: ProxyResponse | null) {
  if (!response) return [];
  return assertions.map((assertion) => {
    if (assertion.kind === "status") {
      const pass = String(response.status || "") === assertion.expected;
      return { id: assertion.id, pass, message: pass ? "matched" : `got ${response.status || "-"}` };
    }
    if (assertion.kind === "contains") {
      const pass = (response.body || "").includes(assertion.expected);
      return { id: assertion.id, pass, message: pass ? "found" : "missing" };
    }
    if (assertion.kind === "header") {
      const pass = Boolean(response.headers?.[assertion.expected.toLowerCase()]);
      return { id: assertion.id, pass, message: pass ? "present" : "missing" };
    }
    if (assertion.kind === "regex") {
      try {
        const pass = new RegExp(assertion.expected).test(response.body || "");
        return { id: assertion.id, pass, message: pass ? "matched" : "no match" };
      } catch {
        return { id: assertion.id, pass: false, message: "invalid regex" };
      }
    }
    if (assertion.kind === "xmlPath") {
      const pass = xmlPathExists(response.body || "", assertion.expected);
      return { id: assertion.id, pass, message: pass ? "exists" : "missing" };
    }
    const limit = Number(assertion.expected);
    const pass = typeof response.elapsedMs === "number" && response.elapsedMs <= limit;
    return { id: assertion.id, pass, message: pass ? "within limit" : `${response.elapsedMs || "-"} ms` };
  });
}

function xmlPathExists(xml: string, path: string) {
  const segments = path.split("/").map((segment) => segment.trim()).filter(Boolean);
  if (!segments.length || !xml.trim().startsWith("<")) return false;
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) return false;
    let nodes: Element[] = [doc.documentElement];
    for (const segment of segments[0] === doc.documentElement.tagName ? segments.slice(1) : segments) {
      nodes = nodes.flatMap((node) => Array.from(node.children).filter((child) => child.tagName === segment));
      if (!nodes.length) return false;
    }
    return nodes.length > 0;
  } catch {
    return false;
  }
}

createRoot(document.getElementById("root")!).render(<App />);
