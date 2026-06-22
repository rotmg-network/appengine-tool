import type { Assertion, AssertionResult, ProxyResponse } from "../types";

export function evaluateAssertions(assertions: Assertion[], response: ProxyResponse | null): AssertionResult[] {
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

export function xmlPathExists(xml: string, path: string): boolean {
  const segments = path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
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
