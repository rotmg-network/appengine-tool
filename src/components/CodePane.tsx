import { Copy, Download, Search } from "lucide-react";
import { countMatches, downloadText } from "../lib/format";

export function CodePane({
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
