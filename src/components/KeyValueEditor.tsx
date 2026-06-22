import { Plus, Trash2 } from "lucide-react";
import { choices } from "../constants";
import { row } from "../lib/rows";
import type { KeyValueRow, ParamSource } from "../types";

export function KeyValueEditor({ rows, onChange }: { rows: KeyValueRow[]; onChange: (rows: KeyValueRow[]) => void }) {
  function update(id: string, patch: Partial<KeyValueRow>) {
    onChange(rows.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="kv-editor">
      <div className="kv-head">
        <span></span>
        <span>Key</span>
        <span>Value</span>
        <span>Source</span>
        <span></span>
      </div>
      {rows.map((item) => {
        const keyChoices = choices[item.key] || [];
        return (
          <div className="kv-row" key={item.id}>
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(event) => update(item.id, { enabled: event.target.checked })}
            />
            <input value={item.key} onChange={(event) => update(item.id, { key: event.target.value })} />
            {keyChoices.length ? (
              <select
                value={item.value}
                onChange={(event) => update(item.id, { value: event.target.value, source: "choice" })}
              >
                {keyChoices.map((choice) => (
                  <option key={choice}>{choice}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={item.value}
                onChange={(event) => update(item.id, { value: event.target.value })}
              />
            )}
            <select
              value={item.source || "text"}
              onChange={(event) => update(item.id, { source: event.target.value as ParamSource })}
            >
              <option value="text">text</option>
              <option value="variable">variable</option>
              <option value="generated">generated</option>
              <option value="choice">choice</option>
            </select>
            <button
              className="icon-button small"
              title="Remove"
              onClick={() => onChange(rows.filter((rowItem) => rowItem.id !== item.id))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
      <button className="add-row" onClick={() => onChange([...rows, row()])}>
        <Plus size={15} />
        Add row
      </button>
    </div>
  );
}
