import { useState } from "react";
import { Cookie, RefreshCw } from "lucide-react";
import { CodePane } from "./CodePane";
import { formatBody } from "../lib/format";
import type { ProxyResponse, ResponseTab } from "../types";

export function ResponseViewer({
  tab,
  response,
  onRetry,
  isSending
}: {
  tab: ResponseTab;
  response: ProxyResponse | null;
  onRetry?: () => void;
  isSending?: boolean;
}) {
  const [search, setSearch] = useState("");
  if (!response) return <div className="empty-state">No response</div>;
  if (response.error) {
    return (
      <div className="error-pane">
        <CodePane value={response.error} error />
        {onRetry && (
          <button className="send-button retry-button" onClick={onRetry} disabled={isSending}>
            {isSending ? <RefreshCw className="spin" size={16} /> : <RefreshCw size={16} />}
            Retry
          </button>
        )}
      </div>
    );
  }

  if (tab === "body") {
    return (
      <CodePane
        value={formatBody(response.body || "", response.headers?.["content-type"] || "")}
        search={search}
        setSearch={setSearch}
        filename="response-body.txt"
      />
    );
  }
  if (tab === "headers") {
    return (
      <CodePane
        value={JSON.stringify(response.headers || {}, null, 2)}
        search={search}
        setSearch={setSearch}
        filename="response-headers.json"
      />
    );
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
        <div>
          <span>Elapsed</span>
          <strong>{response.elapsedMs} ms</strong>
        </div>
        <div>
          <span>Redirected</span>
          <strong>{response.redirected ? "yes" : "no"}</strong>
        </div>
        <div>
          <span>Final URL</span>
          <strong>{response.finalUrl || response.url}</strong>
        </div>
      </div>
    );
  }
  if (tab === "rawRequest") {
    return (
      <CodePane value={response.rawRequest || ""} search={search} setSearch={setSearch} filename="raw-request.txt" />
    );
  }
  return (
    <CodePane value={response.rawResponse || ""} search={search} setSearch={setSearch} filename="raw-response.txt" />
  );
}
