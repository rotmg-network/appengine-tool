import express, { type Request, type Response } from "express";
import { Cookie, CookieJar } from "tough-cookie";

const app = express();
const port = Number(process.env.PORT || 8787);

const environments: Record<string, string> = {
  production: "https://realmofthemadgodhrd.appspot.com",
  testing: "https://rotmghrdtesting.appspot.com",
  currentTesting: "https://rotmgtesting.appspot.com",
  realmTesting2: "https://realmtesting2.appspot.com",
  rotmgTesting3: "https://rotmgtesting3.appspot.com",
  rotmgTesting4: "https://rotmgtesting4.appspot.com",
  rotmgTesting5: "https://rotmgtesting5.appspot.com"
};

type KeyValue = { key?: string; value?: string; enabled?: boolean };

type SendPayload = {
  environment?: string;
  customBaseUrl?: string;
  method?: string;
  path?: string;
  queryParams?: KeyValue[];
  formParams?: KeyValue[];
  headers?: KeyValue[];
  bodyType?: "none" | "form" | "raw";
  rawBody?: string;
  useCookieJar?: boolean;
  followRedirects?: boolean;
  timeoutMs?: number;
};

const cookieJars = new Map<string, CookieJar>();

app.use(express.json({ limit: "2mb" }));

function getOrigin(baseUrl: string): string {
  return new URL(baseUrl).origin;
}

function normalizeBaseUrl(
  value: string
): { baseUrl: string; error?: undefined } | { baseUrl?: undefined; error: string } {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { error: "Base URL must use http or https" };
    }
    return { baseUrl: url.origin };
  } catch {
    return { error: "Invalid base URL" };
  }
}

function getSetCookies(headers: Headers): string[] {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const merged = headers.get("set-cookie");
  return merged ? [merged] : [];
}

function getJar(origin: string): CookieJar {
  const existing = cookieJars.get(origin);
  if (existing) return existing;
  const jar = new CookieJar();
  cookieJars.set(origin, jar);
  return jar;
}

async function readJar(origin: string, url: string): Promise<string> {
  const jar = cookieJars.get(origin);
  if (!jar) return "";
  return jar.getCookieString(url);
}

async function listJar(origin: string, url: string) {
  const jar = cookieJars.get(origin);
  if (!jar) return [];
  const cookies = await jar.getCookies(url);
  return cookies.map((cookie: Cookie) => ({
    name: cookie.key,
    value: cookie.value,
    domain: cookie.domain || "",
    path: cookie.path || "",
    expires: cookie.expires instanceof Date ? cookie.expires.toISOString() : String(cookie.expires || "")
  }));
}

async function writeJar(origin: string, url: string, setCookies: string[]): Promise<void> {
  if (!setCookies.length) return;
  const jar = getJar(origin);
  for (const value of setCookies) {
    await jar.setCookie(value, url, { ignoreError: true });
  }
}

function entriesToObject(headers: Headers): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of headers.entries()) output[key] = value;
  return output;
}

function buildUrl(baseUrl: string, path: string, queryParams: KeyValue[] = []): URL {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, baseUrl);
  for (const param of queryParams) {
    if (!param || param.enabled === false || !param.key) continue;
    url.searchParams.append(param.key, param.value ?? "");
  }
  return url;
}

function buildBody(
  bodyType: SendPayload["bodyType"],
  formParams: KeyValue[] = [],
  rawBody = ""
): string | URLSearchParams | undefined {
  if (bodyType === "none") return undefined;
  if (bodyType === "form") {
    const params = new URLSearchParams();
    for (const param of formParams) {
      if (!param || param.enabled === false || !param.key) continue;
      params.append(param.key, param.value ?? "");
    }
    return params;
  }
  return rawBody ?? "";
}

app.get("/api/health", (_request: Request, response: Response) => {
  response.json({ ok: true });
});

app.get("/api/environments", (_request: Request, response: Response) => {
  response.json(environments);
});

app.get("/api/cookies", (request: Request, response: Response) => {
  const key = String(request.query.environment || "production");
  const baseUrl = environments[key] || environments.production;
  const origin = getOrigin(baseUrl);
  listJar(origin, baseUrl).then((cookies) => response.json({ origin, cookies }));
});

app.delete("/api/cookies", (request: Request, response: Response) => {
  const key = String(request.query.environment || "production");
  const baseUrl = environments[key] || environments.production;
  cookieJars.delete(getOrigin(baseUrl));
  response.json({ ok: true });
});

app.post("/api/send", async (request: Request, response: Response) => {
  const startedAt = performance.now();
  const payload: SendPayload = request.body || {};
  const resolvedBaseUrl =
    payload.customBaseUrl || (payload.environment && environments[payload.environment]) || environments.production;
  const normalized = normalizeBaseUrl(resolvedBaseUrl);
  if (normalized.error || !normalized.baseUrl) {
    response.status(400).json({
      ok: false,
      error: normalized.error || "Invalid base URL",
      elapsedMs: 0
    });
    return;
  }
  const baseUrl = normalized.baseUrl;
  const origin = getOrigin(baseUrl);
  const url = buildUrl(baseUrl, payload.path || "/", payload.queryParams);
  const timeoutMs = Math.max(1000, Math.min(Number(payload.timeoutMs) || 30000, 120000));
  const abortController = new AbortController();
  const timeout = setTimeout(
    () => abortController.abort(new Error(`Request timed out after ${timeoutMs} ms`)),
    timeoutMs
  );
  const headers: Record<string, string> = {};

  for (const header of payload.headers || []) {
    if (!header || header.enabled === false || !header.key) continue;
    headers[header.key] = header.value ?? "";
  }

  if (payload.bodyType === "form" && !Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
    headers["content-type"] = "application/x-www-form-urlencoded;charset=UTF-8";
  }

  const jarCookie = payload.useCookieJar === false ? "" : await readJar(origin, url.toString());
  if (jarCookie && !Object.keys(headers).some((key) => key.toLowerCase() === "cookie")) {
    headers.cookie = jarCookie;
  }

  const body = buildBody(payload.bodyType || "none", payload.formParams, payload.rawBody);
  const method = String(payload.method || "GET").toUpperCase();
  const requestInit: RequestInit = {
    method,
    headers,
    redirect: payload.followRedirects ? "follow" : "manual",
    signal: abortController.signal
  };

  if (!["GET", "HEAD"].includes(method) && body !== undefined) requestInit.body = body;

  const rawRequest = [
    `${method} ${url.pathname}${url.search} HTTP/1.1`,
    `host: ${url.host}`,
    ...Object.entries(headers).map(([key, value]) => `${key}: ${value}`),
    "",
    typeof body === "string" ? body : body instanceof URLSearchParams ? body.toString() : ""
  ].join("\n");

  try {
    const upstream = await fetch(url, requestInit);
    const text = await upstream.text();
    const setCookies = getSetCookies(upstream.headers);
    await writeJar(origin, upstream.url || url.toString(), setCookies);
    const elapsedMs = Math.round((performance.now() - startedAt) * 10) / 10;

    response.json({
      ok: true,
      url: url.toString(),
      status: upstream.status,
      statusText: upstream.statusText,
      redirected: upstream.redirected,
      finalUrl: upstream.url,
      headers: entriesToObject(upstream.headers),
      setCookies,
      body: text,
      elapsedMs,
      timeoutMs,
      rawRequest,
      rawResponse: [
        `HTTP ${upstream.status} ${upstream.statusText}`,
        ...Object.entries(entriesToObject(upstream.headers)).map(([key, value]) => `${key}: ${value}`),
        "",
        text
      ].join("\n")
    });
  } catch (error) {
    const elapsedMs = Math.round((performance.now() - startedAt) * 10) / 10;
    const timedOut = abortController.signal.aborted;
    response.status(timedOut ? 504 : 502).json({
      ok: false,
      error: timedOut
        ? `Request timed out after ${timeoutMs} ms`
        : error instanceof Error
          ? error.message
          : String(error),
      elapsedMs,
      timeoutMs,
      rawRequest
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Proxy listening on http://127.0.0.1:${port}`);
});
