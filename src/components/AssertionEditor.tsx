import { CheckCircle2, ListPlus, Settings2, Trash2, XCircle } from "lucide-react";
import type { Assertion, AssertionResult } from "../types";

export function AssertionEditor({
  assertions,
  setAssertions,
  results
}: {
  assertions: Assertion[];
  setAssertions: (items: Assertion[]) => void;
  results: AssertionResult[];
}) {
  function update(id: string, patch: Partial<Assertion>) {
    setAssertions(assertions.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="assertions">
      {assertions.map((assertion) => {
        const result = results.find((item) => item.id === assertion.id);
        return (
          <div className="assertion-row" key={assertion.id}>
            {result ? (
              result.pass ? (
                <CheckCircle2 className="pass" size={17} />
              ) : (
                <XCircle className="fail" size={17} />
              )
            ) : (
              <Settings2 size={17} />
            )}
            <select
              value={assertion.kind}
              onChange={(event) => update(assertion.id, { kind: event.target.value as Assertion["kind"] })}
            >
              <option value="status">status</option>
              <option value="contains">contains</option>
              <option value="header">header</option>
              <option value="latency">latency</option>
              <option value="regex">regex</option>
              <option value="xmlPath">xml path</option>
            </select>
            <input
              value={assertion.expected}
              onChange={(event) => update(assertion.id, { expected: event.target.value })}
            />
            <span>{result?.message || ""}</span>
            <button
              className="icon-button small"
              onClick={() => setAssertions(assertions.filter((item) => item.id !== assertion.id))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
      <button
        className="add-row"
        onClick={() => setAssertions([...assertions, { id: crypto.randomUUID(), kind: "contains", expected: "" }])}
      >
        <ListPlus size={15} />
        Add assertion
      </button>
    </div>
  );
}
