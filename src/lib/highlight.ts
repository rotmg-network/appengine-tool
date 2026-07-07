// Lightweight, dependency-free tokenizer for the response viewer.
// The input is assumed to already be pretty-printed (see formatBody); the goal
// here is only to split it into typed spans for colouring. Concatenating every
// token's `value` always reproduces the original source exactly, so nothing is
// lost and search offsets stay accurate.

export type HighlightLanguage = "xml" | "json" | "text";

export type TokenKind =
  | "plain"
  | "xml-tag"
  | "xml-name"
  | "xml-attr"
  | "xml-value"
  | "xml-text"
  | "xml-comment"
  | "xml-cdata"
  | "xml-prolog"
  | "json-key"
  | "json-string"
  | "json-number"
  | "json-keyword"
  | "json-punct";

export type Token = { type: TokenKind; value: string };

// Mirrors the format decision made by formatBody so the colouring matches the
// pretty-printed shape the user actually sees.
export function detectHighlightLanguage(body: string, contentType: string): HighlightLanguage {
  const trimmed = body.trim();
  if (!trimmed) return "text";
  const type = contentType.toLowerCase();
  if (type.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (type.includes("xml") || type.includes("html") || trimmed.startsWith("<")) return "xml";
  return "text";
}

export function tokenize(source: string, language: HighlightLanguage): Token[] {
  if (!source) return [];
  if (language === "xml") return tokenizeXml(source);
  if (language === "json") return tokenizeJson(source);
  return [{ type: "plain", value: source }];
}

function tokenizeXml(source: string): Token[] {
  const tokens: Token[] = [];
  const n = source.length;
  let i = 0;
  const push = (type: TokenKind, value: string) => {
    if (value) tokens.push({ type, value });
  };

  while (i < n) {
    if (source.startsWith("<!--", i)) {
      const end = source.indexOf("-->", i);
      const stop = end === -1 ? n : end + 3;
      push("xml-comment", source.slice(i, stop));
      i = stop;
      continue;
    }
    if (source.startsWith("<![CDATA[", i)) {
      const end = source.indexOf("]]>", i);
      const stop = end === -1 ? n : end + 3;
      push("xml-cdata", source.slice(i, stop));
      i = stop;
      continue;
    }
    if (source.startsWith("<?", i)) {
      const end = source.indexOf("?>", i);
      const stop = end === -1 ? n : end + 2;
      push("xml-prolog", source.slice(i, stop));
      i = stop;
      continue;
    }
    if (source.startsWith("<!", i)) {
      const end = source.indexOf(">", i);
      const stop = end === -1 ? n : end + 1;
      push("xml-prolog", source.slice(i, stop));
      i = stop;
      continue;
    }
    if (source[i] === "<") {
      let nameStart = i + 1;
      if (source[nameStart] === "/") nameStart += 1;
      push("xml-tag", source.slice(i, nameStart)); // "<" or "</"
      let k = nameStart;
      while (k < n && !/[\s/>]/.test(source[k])) k += 1;
      push("xml-name", source.slice(nameStart, k));
      i = k;
      // Attributes, until the tag closes.
      while (i < n && source[i] !== ">" && !(source[i] === "/" && source[i + 1] === ">")) {
        if (/\s/.test(source[i])) {
          let w = i;
          while (w < n && /\s/.test(source[w])) w += 1;
          push("plain", source.slice(i, w));
          i = w;
          continue;
        }
        if (source[i] === "=") {
          push("xml-tag", "=");
          i += 1;
          const quote = source[i];
          if (quote === '"' || quote === "'") {
            let v = i + 1;
            while (v < n && source[v] !== quote) v += 1;
            const stop = v < n ? v + 1 : n;
            push("xml-value", source.slice(i, stop));
            i = stop;
          } else {
            let v = i;
            while (v < n && !/[\s>]/.test(source[v])) v += 1;
            push("xml-value", source.slice(i, v));
            i = v;
          }
          continue;
        }
        let a = i;
        while (a < n && !/[\s=/>]/.test(source[a])) a += 1;
        if (a > i) {
          push("xml-attr", source.slice(i, a));
          i = a;
        } else {
          push("plain", source[i]);
          i += 1;
        }
      }
      if (source[i] === "/" && source[i + 1] === ">") {
        push("xml-tag", "/>");
        i += 2;
      } else if (source[i] === ">") {
        push("xml-tag", ">");
        i += 1;
      }
      continue;
    }
    // Text content between tags.
    let t = i;
    while (t < n && source[t] !== "<") t += 1;
    push("xml-text", source.slice(i, t));
    i = t;
  }
  return tokens;
}

function tokenizeJson(source: string): Token[] {
  const tokens: Token[] = [];
  const n = source.length;
  let i = 0;
  const push = (type: TokenKind, value: string) => {
    if (value) tokens.push({ type, value });
  };

  while (i < n) {
    const char = source[i];
    if (/\s/.test(char)) {
      let w = i;
      while (w < n && /\s/.test(source[w])) w += 1;
      push("plain", source.slice(i, w));
      i = w;
      continue;
    }
    if (char === '"') {
      let j = i + 1;
      while (j < n) {
        if (source[j] === "\\") {
          j += 2;
          continue;
        }
        if (source[j] === '"') {
          j += 1;
          break;
        }
        j += 1;
      }
      const literal = source.slice(i, j);
      let k = j;
      while (k < n && /\s/.test(source[k])) k += 1;
      push(source[k] === ":" ? "json-key" : "json-string", literal);
      i = j;
      continue;
    }
    if (char === "-" || (char >= "0" && char <= "9")) {
      let j = i;
      while (j < n && /[-+0-9.eE]/.test(source[j])) j += 1;
      push("json-number", source.slice(i, j));
      i = j;
      continue;
    }
    if (source.startsWith("true", i) || source.startsWith("null", i)) {
      push("json-keyword", source.slice(i, i + 4));
      i += 4;
      continue;
    }
    if (source.startsWith("false", i)) {
      push("json-keyword", "false");
      i += 5;
      continue;
    }
    if ("{}[]:,".includes(char)) {
      push("json-punct", char);
      i += 1;
      continue;
    }
    push("plain", char);
    i += 1;
  }
  return tokens;
}

// Case-insensitive, non-overlapping match ranges. Kept consistent with
// countMatches so the highlighted count and the reported count never disagree.
export function findMatches(source: string, search: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  if (!search) return ranges;
  const haystack = source.toLowerCase();
  const needle = search.toLowerCase();
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    ranges.push([index, index + needle.length]);
    index = haystack.indexOf(needle, index + needle.length);
  }
  return ranges;
}
