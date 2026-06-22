import { KeyValueEditor } from "./KeyValueEditor";
import type { BodyType, KeyValueRow } from "../types";

export function HeaderEditor({
  headerType,
  setHeaderType,
  headers,
  setHeaders,
  rawHeaders,
  setRawHeaders
}: {
  headerType: BodyType;
  setHeaderType: (type: BodyType) => void;
  headers: KeyValueRow[];
  setHeaders: (rows: KeyValueRow[]) => void;
  rawHeaders: string;
  setRawHeaders: (value: string) => void;
}) {
  return (
    <>
      <div className="segmented">
        {(["none", "form", "raw"] as BodyType[]).map((type) => (
          <button key={type} className={headerType === type ? "active" : ""} onClick={() => setHeaderType(type)}>
            {type}
          </button>
        ))}
      </div>
      {headerType === "form" && <KeyValueEditor rows={headers} onChange={setHeaders} />}
      {headerType === "raw" && (
        <textarea
          className="raw-editor"
          value={rawHeaders}
          onChange={(event) => setRawHeaders(event.target.value)}
          placeholder={"Header-Name: value\nAnother-Header: value"}
        />
      )}
      {headerType === "none" && <div className="empty-state">No request headers</div>}
    </>
  );
}
