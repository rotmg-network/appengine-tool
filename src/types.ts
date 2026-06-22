export type EnvironmentKey =
  | "production"
  | "testing"
  | "currentTesting"
  | "realmTesting2"
  | "rotmgTesting3"
  | "rotmgTesting4"
  | "rotmgTesting5"
  | "custom";

export type BodyType = "none" | "form" | "raw";
export type ParamSource = "text" | "variable" | "generated" | "choice";
export type Tab = "params" | "body" | "headers" | "variables" | "tests";
export type ResponseTab = "body" | "headers" | "cookies" | "timing" | "rawRequest" | "rawResponse";
export type Theme = "dark" | "light";

export type KeyValueRow = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  source?: ParamSource;
};

export type EndpointPreset = {
  id: string;
  group: string;
  name: string;
  method: string;
  path: string;
  params: KeyValueRow[];
  note?: string;
};

export type SavedRequest = {
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

export type HistoryItem = {
  id: string;
  method: string;
  path: string;
  environment: EnvironmentKey;
  status?: number;
  elapsedMs?: number;
  at: string;
};

export type ProxyResponse = {
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

export type Assertion = {
  id: string;
  kind: "status" | "contains" | "header" | "latency" | "regex" | "xmlPath";
  expected: string;
};

export type AssertionResult = {
  id: string;
  pass: boolean;
  message: string;
};

export type EnvironmentState = {
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
