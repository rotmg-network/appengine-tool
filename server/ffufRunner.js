import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const runsDir = path.join(projectRoot, ".ffuf-runs");
const localFfufCandidates = [
  path.join(projectRoot, "tools", process.platform === "win32" ? "ffuf.exe" : "ffuf"),
  path.join(projectRoot, "bin", process.platform === "win32" ? "ffuf.exe" : "ffuf")
];

const wordlists = {
  "endpoints-small": path.join(projectRoot, "wordlists", "endpoints-small.txt"),
  "params-small": path.join(projectRoot, "wordlists", "params-small.txt"),
  "rotmg-known-params": path.join(projectRoot, "wordlists", "rotmg-known-params.txt")
};

const jobs = new Map();

const unityHeaders = {
  "User-Agent": "UnityPlayer/2021.3.16f1 (UnityWebRequest/1.0, libcurl/7.84.0-DEV)",
  "X-Unity-Version": "2021.3.16f1",
  "Content-Type": "application/x-www-form-urlencoded"
};

export function registerFuzzRoutes(app, { environments, normalizeBaseUrl }) {
  app.get("/api/fuzz/meta", async (_request, response) => {
    response.json({
      ffuf: await getFfufAvailability(),
      wordlists: Object.keys(wordlists),
      defaults: {
        rate: 3,
        timeoutSeconds: 10,
        maxTimeSeconds: 60,
        recursion: false,
        recursionDepth: 1
      }
    });
  });

  app.post("/api/fuzz/start", async (request, response) => {
    const availability = await getFfufAvailability();
    if (!availability.available) {
      response.status(400).json({ ok: false, error: "ffuf was not found in tools/ or on PATH" });
      return;
    }

    const payload = request.body || {};
    const resolvedBaseUrl = payload.customBaseUrl || environments[payload.environment] || environments.production;
    const normalized = normalizeBaseUrl(resolvedBaseUrl);
    if (normalized.error) {
      response.status(400).json({ ok: false, error: normalized.error });
      return;
    }

    const wordlist = wordlists[payload.wordlist];
    if (!wordlist) {
      response.status(400).json({ ok: false, error: "Unknown wordlist" });
      return;
    }

    const built = buildFfufArgs(normalized.baseUrl, wordlist, payload);
    if (built.error) {
      response.status(400).json({ ok: false, error: built.error });
      return;
    }

    await mkdir(runsDir, { recursive: true });
    const id = randomUUID();
    const outputFile = path.join(runsDir, `${id}.json`);
    const args = [...built.args, "-of", "json", "-o", outputFile];
    const startedAt = new Date().toISOString();
    const child = spawn(availability.command, args, { cwd: projectRoot, stdio: ["ignore", "pipe", "pipe"] });
    const job = {
      id,
      args,
      built,
      child,
      command: `${shellQuote(availability.command)} ${args.map(shellQuote).join(" ")}`,
      done: false,
      error: "",
      exitCode: null,
      outputFile,
      startedAt,
      stderr: "",
      stdout: ""
    };

    jobs.set(id, job);

    child.stdout.on("data", (chunk) => {
      job.stdout = trimLog(`${job.stdout}${chunk.toString()}`);
    });
    child.stderr.on("data", (chunk) => {
      job.stderr = trimLog(`${job.stderr}${chunk.toString()}`);
    });
    child.on("error", (error) => {
      job.done = true;
      job.error = error.message;
    });
    child.on("close", (code) => {
      job.done = true;
      job.exitCode = code;
      job.completedAt = new Date().toISOString();
    });

    response.json({ ok: true, job: serializeJob(job) });
  });

  app.get("/api/fuzz/jobs/:id", async (request, response) => {
    const job = jobs.get(request.params.id);
    if (!job) {
      response.status(404).json({ ok: false, error: "Unknown fuzz job" });
      return;
    }
    response.json({ ok: true, job: await serializeJobWithResults(job) });
  });

  app.post("/api/fuzz/jobs/:id/stop", (request, response) => {
    const job = jobs.get(request.params.id);
    if (!job) {
      response.status(404).json({ ok: false, error: "Unknown fuzz job" });
      return;
    }
    if (!job.done) {
      job.child.kill("SIGTERM");
      job.error = "Stopped by user";
    }
    response.json({ ok: true, job: serializeJob(job) });
  });
}

function buildFfufArgs(baseUrl, wordlist, payload) {
  const mode = payload.mode || "endpoint";
  const rate = clamp(Number(payload.rate) || 3, 1, 10);
  const timeoutSeconds = clamp(Number(payload.timeoutSeconds) || 10, 3, 30);
  const maxTimeSeconds = clamp(Number(payload.maxTimeSeconds) || 60, 10, 300);
  const method = String(payload.method || "GET").toUpperCase();
  const targetPath = normalizePath(payload.path || "/");
  const headers = normalizeHeaders(payload.headers);
  const args = ["-w", wordlist, "-rate", String(rate), "-timeout", String(timeoutSeconds), "-maxtime", String(maxTimeSeconds), "-s"];

  for (const [key, value] of Object.entries(headers)) {
    args.push("-H", `${key}: ${value}`);
  }

  if (payload.followRedirects) args.push("-r");
  if (payload.recursion) {
    args.push("-recursion", "-recursion-depth", String(clamp(Number(payload.recursionDepth) || 1, 1, 2)));
  }

  if (mode === "endpoint" || mode === "nested") {
    const basePath = normalizeDirectoryPath(payload.fuzzBasePath || targetPath);
    args.push("-u", `${baseUrl}${basePath}FUZZ`);
    return { args, target: `${baseUrl}${basePath}FUZZ` };
  }

  if (mode === "getParam") {
    const joiner = targetPath.includes("?") ? "&" : "?";
    args.push("-u", `${baseUrl}${targetPath}${joiner}FUZZ=test`);
    return { args, target: `${baseUrl}${targetPath}${joiner}FUZZ=test` };
  }

  if (mode === "postParam") {
    const body = buildFormBody(payload.formParams);
    const data = body ? `${body}&FUZZ=test` : "FUZZ=test";
    args.push("-X", method === "GET" ? "POST" : method, "-u", `${baseUrl}${targetPath}`, "-d", data);
    return { args, target: `${baseUrl}${targetPath}`, data };
  }

  return { error: "Unknown fuzz mode" };
}

function normalizeHeaders(headers = []) {
  const output = { ...unityHeaders };
  for (const header of headers) {
    if (!header || header.enabled === false || !header.key) continue;
    output[header.key] = header.value || "";
  }
  return output;
}

function buildFormBody(rows = []) {
  const params = new URLSearchParams();
  for (const row of rows) {
    if (!row || row.enabled === false || !row.key) continue;
    params.append(row.key, row.value || "");
  }
  return params.toString();
}

function normalizePath(value) {
  const pathValue = String(value || "/").trim();
  return pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
}

function normalizeDirectoryPath(value) {
  const pathValue = normalizePath(value).split("?")[0];
  if (pathValue.endsWith("/")) return pathValue;
  const lastSegment = pathValue.split("/").pop() || "";
  if (lastSegment.includes(".")) return `${pathValue.slice(0, -lastSegment.length)}`;
  return `${pathValue}/`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function trimLog(value) {
  return value.split("\n").slice(-80).join("\n");
}

function shellQuote(value) {
  if (/^[a-zA-Z0-9_./:=@-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function serializeJob(job) {
  return {
    id: job.id,
    command: job.command,
    done: job.done,
    error: job.error,
    exitCode: job.exitCode,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    stderr: job.stderr,
    stdout: job.stdout,
    target: job.built.target
  };
}

async function serializeJobWithResults(job) {
  const serialized = serializeJob(job);
  if (!job.done) return { ...serialized, results: [] };
  try {
    const raw = await readFile(job.outputFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...serialized,
      results: (parsed.results || []).map((result) => ({
        input: result.input,
        position: result.position,
        status: result.status,
        length: result.length,
        words: result.words,
        lines: result.lines,
        url: result.url
      }))
    };
  } catch {
    return { ...serialized, results: [] };
  }
}

function getFfufAvailability() {
  return findFfufCommand().then((command) => {
    if (!command) {
      return {
        available: false,
        version: "",
        command: "",
        source: ""
      };
    }
    return new Promise((resolve) => {
      execFile(command, ["-V"], { timeout: 3000 }, (error, stdout, stderr) => {
        const version = (stdout || stderr || "").trim();
        resolve({
          available: !error,
          version,
          command: error ? "" : command,
          source: localFfufCandidates.includes(command) ? "repo" : "PATH"
        });
      });
    });
  });
}

async function findFfufCommand() {
  for (const candidate of localFfufCandidates) {
    try {
      await access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Keep looking for a repo-local binary, then fall back to PATH.
    }
  }
  return new Promise((resolve) => {
    execFile("ffuf", ["-V"], { timeout: 3000 }, (error) => {
      resolve({
        available: !error
      });
    });
  }).then((result) => (result.available ? "ffuf" : ""));
}
