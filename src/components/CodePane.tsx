import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Copy, Download, Search } from "lucide-react";
import { downloadText } from "../lib/format";
import { findMatches, tokenize, type HighlightLanguage, type TokenKind } from "../lib/highlight";

// Above this size we skip span-level highlighting: a multi-megabyte body would
// otherwise create hundreds of thousands of DOM nodes and lock up the tab.
const HIGHLIGHT_LIMIT = 100_000;

const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: "",
  "xml-tag": "tok-punct",
  "xml-name": "tok-tag",
  "xml-attr": "tok-attr",
  "xml-value": "tok-string",
  "xml-text": "tok-text",
  "xml-comment": "tok-comment",
  "xml-cdata": "tok-cdata",
  "xml-prolog": "tok-comment",
  "json-key": "tok-tag",
  "json-string": "tok-string",
  "json-number": "tok-number",
  "json-keyword": "tok-keyword",
  "json-punct": "tok-punct"
};

export function CodePane({
  value,
  error = false,
  filename = "response.txt",
  language = "text",
  search = "",
  setSearch
}: {
  value: string;
  error?: boolean;
  filename?: string;
  language?: HighlightLanguage;
  search?: string;
  setSearch?: (value: string) => void;
}) {
  const preRef = useRef<HTMLPreElement | null>(null);
  const [activeMatch, setActiveMatch] = useState(0);

  const tokens = useMemo(
    () => (value.length > HIGHLIGHT_LIMIT ? null : tokenize(value, language)),
    [value, language]
  );
  const matches = useMemo(() => findMatches(value, search), [value, search]);

  // Reset the active match whenever the result or the query changes.
  useEffect(() => {
    setActiveMatch(0);
  }, [value, search]);

  // Keep the active match scrolled into view as the user steps through hits.
  useEffect(() => {
    preRef.current?.querySelector(".search-hit.active")?.scrollIntoView({ block: "nearest" });
  }, [activeMatch, matches, value]);

  const step = (delta: number) => {
    if (!matches.length) return;
    setActiveMatch((current) => (current + delta + matches.length) % matches.length);
  };

  const content = renderHighlighted(value, tokens, matches, activeMatch);

  return (
    <>
      {setSearch && (
        <div className="response-tools">
          <label className="response-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  step(event.shiftKey ? -1 : 1);
                }
              }}
              placeholder="Search response"
            />
          </label>
          <div className="match-nav">
            <span className="match-count">
              {search ? (matches.length ? `${activeMatch + 1}/${matches.length}` : "0 matches") : ""}
            </span>
            <button
              className="icon-button small"
              title="Previous match"
              disabled={matches.length === 0}
              onClick={() => step(-1)}
            >
              <ChevronUp size={14} />
            </button>
            <button
              className="icon-button small"
              title="Next match"
              disabled={matches.length === 0}
              onClick={() => step(1)}
            >
              <ChevronDown size={14} />
            </button>
          </div>
          <button className="icon-button small" title="Copy" onClick={() => navigator.clipboard.writeText(value)}>
            <Copy size={14} />
          </button>
          <button className="icon-button small" title="Download" onClick={() => downloadText(filename, value)}>
            <Download size={14} />
          </button>
        </div>
      )}
      <pre ref={preRef} className={error ? "code-view error" : "code-view"}>
        {content}
      </pre>
    </>
  );
}

// Walks the token list once, splitting any token that overlaps a search match so
// the matched slice can be wrapped in a <mark>. Falls back to the raw string when
// the body is too large to highlight.
function renderHighlighted(
  value: string,
  tokens: ReturnType<typeof tokenize> | null,
  matches: Array<[number, number]>,
  activeMatch: number
): ReactNode {
  if (!tokens) return value;

  const nodes: ReactNode[] = [];
  let offset = 0;
  let key = 0;
  let matchCursor = 0;

  for (const token of tokens) {
    const start = offset;
    const end = offset + token.value.length;
    offset = end;
    const className = TOKEN_CLASS[token.type];

    // Advance past matches that ended before this token.
    while (matchCursor < matches.length && matches[matchCursor][1] <= start) matchCursor += 1;

    const overlapping: number[] = [];
    for (let m = matchCursor; m < matches.length && matches[m][0] < end; m += 1) {
      if (matches[m][1] > start) overlapping.push(m);
    }

    if (overlapping.length === 0) {
      nodes.push(
        className ? (
          <span key={key++} className={className}>
            {token.value}
          </span>
        ) : (
          token.value
        )
      );
      continue;
    }

    let cursor = start;
    const emit = (from: number, to: number) => {
      if (to <= from) return;
      const text = token.value.slice(from - start, to - start);
      nodes.push(
        className ? (
          <span key={key++} className={className}>
            {text}
          </span>
        ) : (
          <span key={key++}>{text}</span>
        )
      );
    };

    for (const m of overlapping) {
      const hitStart = Math.max(matches[m][0], start);
      const hitEnd = Math.min(matches[m][1], end);
      emit(cursor, hitStart);
      nodes.push(
        <mark key={key++} className={m === activeMatch ? "search-hit active" : "search-hit"}>
          {token.value.slice(hitStart - start, hitEnd - start)}
        </mark>
      );
      cursor = hitEnd;
    }
    emit(cursor, end);
  }

  return nodes;
}
