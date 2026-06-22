export function formatBody(body: string, contentType: string): string {
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

export function prettyXml(xml: string): string {
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
    )
    .lines.join("\n");
}

export function countMatches(value: string, search: string): number {
  if (!search) return 0;
  let count = 0;
  let index = value.toLowerCase().indexOf(search.toLowerCase());
  while (index !== -1) {
    count += 1;
    index = value.toLowerCase().indexOf(search.toLowerCase(), index + search.length);
  }
  return count;
}

export function downloadText(filename: string, value: string): void {
  const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
