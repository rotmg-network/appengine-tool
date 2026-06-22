import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Clock3,
  Database,
  Download,
  History,
  Moon,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sun,
  Trash2,
  Upload,
  XCircle
} from "lucide-react";
import { type EndpointDefinition } from "./endpointCatalog";
import { customEndpointsStorageKey, environmentKeys, environmentOptions, environments } from "./constants";
import { AssertionEditor } from "./components/AssertionEditor";
import { BodyEditor } from "./components/BodyEditor";
import { HeaderEditor } from "./components/HeaderEditor";
import { KeyValueEditor } from "./components/KeyValueEditor";
import { ResponseViewer } from "./components/ResponseViewer";
import { Tabs } from "./components/Tabs";
import { backendDownMessage } from "./lib/api";
import { evaluateAssertions } from "./lib/assertions";
import { environmentReducer, loadAllEnvironmentStates, loadEnvironmentState } from "./lib/environmentState";
import { interpolate, resolveRows } from "./lib/interpolate";
import { builtinPresets, endpointFromDefinition } from "./lib/presets";
import { cloneRows, extractAccessToken, parseRawHeaders, upsertVariable } from "./lib/rows";
import { envStorageKey, loadStorage, saveStorage } from "./lib/storage";
import type {
  Assertion,
  BodyType,
  EndpointPreset,
  EnvironmentKey,
  EnvironmentState,
  HistoryItem,
  KeyValueRow,
  ProxyResponse,
  ResponseTab,
  SavedRequest,
  Tab,
  Theme
} from "./types";
import "./styles.css";

const defaultAssertions: Assertion[] = [{ id: crypto.randomUUID(), kind: "status", expected: "200" }];

export function App() {
  const [environment, setEnvironment] = useState<EnvironmentKey>("production");
  const [env, dispatch] = useReducer(environmentReducer, "production" as EnvironmentKey, loadEnvironmentState);
  const [assertions, setAssertions] = useState<Assertion[]>(defaultAssertions);
  const [activeTab, setActiveTab] = useState<Tab>("params");
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<Theme>(() => loadStorage("rotmg:theme", "dark"));
  const [customEndpoints, setCustomEndpoints] = useState<EndpointDefinition[]>(() =>
    loadStorage(customEndpointsStorageKey, [])
  );
  const [newEndpoint, setNewEndpoint] = useState<EndpointDefinition>({
    group: "custom",
    name: "",
    method: "GET",
    path: ""
  });
  const [isEndpointModalOpen, setIsEndpointModalOpen] = useState(false);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const requestController = useRef<AbortController | null>(null);

  const {
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
  } = env;

  // Thin setters that patch the single environment-state reducer.
  const patch = (p: Partial<EnvironmentState>) => dispatch({ type: "patch", patch: p });
  const setCustomBaseUrl = (value: string) => patch({ customBaseUrl: value });
  const setMethod = (value: string) => patch({ method: value });
  const setPath = (value: string) => patch({ path: value });
  const setQueryParams = (value: KeyValueRow[]) => patch({ queryParams: value });
  const setFormParams = (value: KeyValueRow[]) => patch({ formParams: value });
  const setHeaders = (value: KeyValueRow[]) => patch({ headers: value });
  const setHeaderType = (value: BodyType) => patch({ headerType: value });
  const setRawHeaders = (value: string) => patch({ rawHeaders: value });
  const setBodyType = (value: BodyType) => patch({ bodyType: value });
  const setRawBody = (value: string) => patch({ rawBody: value });
  const setVariables = (value: KeyValueRow[]) => patch({ variables: value });
  const setHistory = (value: HistoryItem[]) => patch({ history: value });
  const setSavedRequests = (value: SavedRequest[]) => patch({ savedRequests: value });
  const setUseCookieJar = (value: boolean) => patch({ useCookieJar: value });
  const setFollowRedirects = (value: boolean) => patch({ followRedirects: value });
  const setTimeoutMs = (value: number) => patch({ timeoutMs: value });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveStorage("rotmg:theme", theme);
  }, [theme]);

  const allPresets = useMemo(
    () => [...builtinPresets, ...customEndpoints.map(endpointFromDefinition)],
    [customEndpoints]
  );
  const customPresetIds = useMemo(
    () => new Set(customEndpoints.map((item) => endpointFromDefinition(item).id)),
    [customEndpoints]
  );

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

  // Persist the active environment state (debounced) whenever it changes.
  useEffect(() => {
    const id = window.setTimeout(() => {
      saveStorage(envStorageKey(environment), env);
    }, 250);
    return () => window.clearTimeout(id);
  }, [environment, env]);

  function resolveHeaders() {
    if (headerType === "none") return [];
    if (headerType === "raw") return parseRawHeaders(interpolate(rawHeaders, variables));
    return resolveRows(headers, variables);
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
        queryParams: resolveRows(queryParams, variables),
        formParams: resolveRows(formParams, variables),
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
      const text = await result.text();
      let data: ProxyResponse;
      try {
        data = JSON.parse(text) as ProxyResponse;
      } catch {
        // The proxy returned a non-JSON (usually empty) body. This almost always means the
        // backend proxy server isn't running, so the Vite dev/preview proxy could not connect.
        data = {
          ok: false,
          status: result.status || undefined,
          error: backendDownMessage(result.status)
        };
      }
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
      setHistory(nextHistory);
      const token = extractAccessToken(data.body || "");
      if (token) {
        setVariables(upsertVariable(variables, "accessToken", token));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setResponse({
          ok: false,
          error: "Request cancelled",
          elapsedMs: 0
        });
      } else if (error instanceof TypeError) {
        // A TypeError from fetch means the request never completed (network/proxy failure).
        setResponse({
          ok: false,
          error: backendDownMessage()
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

  // Keep the latest sendRequest / isSending reachable from the keydown listener
  // so the listener can be registered exactly once (no per-render churn, no stale closure).
  const sendRequestRef = useRef(sendRequest);
  sendRequestRef.current = sendRequest;
  const isSendingRef = useRef(isSending);
  isSendingRef.current = isSending;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (!isSendingRef.current) void sendRequestRef.current();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function changeEnvironment(nextEnvironment: EnvironmentKey) {
    if (nextEnvironment === environment) return;
    saveStorage(envStorageKey(environment), env);
    dispatch({ type: "replace", state: loadEnvironmentState(nextEnvironment) });
    setResponse(null);
    setResponseTab("body");
    setEnvironment(nextEnvironment);
  }

  function applyPreset(preset: EndpointPreset) {
    patch({
      method: preset.method,
      path: preset.path,
      queryParams: preset.method === "GET" ? cloneRows(preset.params) : [],
      formParams: preset.method === "GET" ? [] : cloneRows(preset.params),
      bodyType: preset.method === "GET" ? "none" : "form"
    });
    setActiveTab(preset.method === "GET" ? "params" : "body");
    requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({ block: "start" });
      window.scrollTo({ top: 0 });
    });
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
    persistCustomEndpoints(customEndpoints.filter((item) => endpointFromDefinition(item).id !== endpoint.id));
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
    setSavedRequests([next, ...savedRequests]);
  }

  function loadSaved(request: SavedRequest) {
    patch({
      method: request.method,
      path: request.path,
      queryParams: cloneRows(request.queryParams),
      formParams: cloneRows(request.formParams),
      headers: cloneRows(request.headers),
      headerType: request.headerType || "form",
      rawHeaders: request.rawHeaders || "",
      bodyType: request.bodyType,
      rawBody: request.rawBody
    });
  }

  function loadHistoryItem(item: HistoryItem) {
    if (item.environment !== environment) {
      saveStorage(envStorageKey(environment), env);
      dispatch({ type: "replace", state: loadEnvironmentState(item.environment) });
      setEnvironment(item.environment);
      setResponse(null);
    }
    patch({ method: item.method, path: item.path });
  }

  function exportCollection() {
    saveStorage(envStorageKey(environment), env);
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
        dispatch({ type: "replace", state: loadEnvironmentState(nextEnvironment) });
        setResponse(null);
        return;
      }
      if (parsed.savedRequests) setSavedRequests(parsed.savedRequests);
      if (parsed.variables) setVariables(parsed.variables);
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Database size={23} />
          <div>
            <strong>AppEngine Suite</strong>
            <span>RotMG Endpoint Testing</span>
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
                    setSavedRequests(savedRequests.filter((item) => item.id !== request.id));
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
                  {item.label} -{" "}
                  {item.key === "custom"
                    ? customBaseUrl || "custom URL"
                    : environments[item.key].replace("https://", "")}
                </option>
              ))}
            </select>
          </label>
          <div className="top-actions">
            <button
              className="icon-button"
              title="Import"
              onClick={() => document.getElementById("collection-import")?.click()}
            >
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
            <input
              type="checkbox"
              checked={followRedirects}
              onChange={(event) => setFollowRedirects(event.target.checked)}
            />
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
          {activeTab === "variables" && <KeyValueEditor rows={variables} onChange={setVariables} />}
          {activeTab === "tests" && (
            <AssertionEditor assertions={assertions} setAssertions={setAssertions} results={assertionResults} />
          )}
        </section>

        <section className="response-grid">
          <div className="panel response-panel">
            <div className="response-head">
              <div className="status-line">
                {response?.ok === false && <XCircle size={18} />}
                {response?.status && (
                  <span className={response.status < 400 ? "status-ok" : "status-bad"}>{response.status}</span>
                )}
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
            <ResponseViewer tab={responseTab} response={response} onRetry={sendRequest} isSending={isSending} />
          </div>

          <aside className="panel history-panel">
            <div className="history-title">
              <History size={17} />
              <strong>History</strong>
              <button className="icon-button small" title="Clear" onClick={() => setHistory([])}>
                <Trash2 size={14} />
              </button>
            </div>
            <div className="history-list">
              {history.map((item) => (
                <button key={item.id} onClick={() => loadHistoryItem(item)}>
                  <span className={`method ${item.method.toLowerCase()}`}>{item.method}</span>
                  <span>{item.path}</span>
                  <small>
                    {item.status || "-"} · {item.elapsedMs || "-"} ms
                  </small>
                </button>
              ))}
            </div>
          </aside>
        </section>
      </main>
      {isEndpointModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsEndpointModalOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="endpoint-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
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
                <select
                  value={newEndpoint.method}
                  onChange={(event) => setNewEndpoint({ ...newEndpoint, method: event.target.value })}
                >
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
              <button className="soft-button" onClick={() => setIsEndpointModalOpen(false)}>
                Cancel
              </button>
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
