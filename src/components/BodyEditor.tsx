import { KeyValueEditor } from "./KeyValueEditor";
import type { BodyType, KeyValueRow } from "../types";

export function BodyEditor({
  bodyType,
  setBodyType,
  formParams,
  setFormParams,
  rawBody,
  setRawBody
}: {
  bodyType: BodyType;
  setBodyType: (type: BodyType) => void;
  formParams: KeyValueRow[];
  setFormParams: (rows: KeyValueRow[]) => void;
  rawBody: string;
  setRawBody: (value: string) => void;
}) {
  return (
    <>
      <div className="segmented">
        {(["none", "form", "raw"] as BodyType[]).map((type) => (
          <button key={type} className={bodyType === type ? "active" : ""} onClick={() => setBodyType(type)}>
            {type}
          </button>
        ))}
      </div>
      {bodyType === "form" && <KeyValueEditor rows={formParams} onChange={setFormParams} />}
      {bodyType === "raw" && (
        <textarea className="raw-editor" value={rawBody} onChange={(event) => setRawBody(event.target.value)} />
      )}
      {bodyType === "none" && <div className="empty-state">No request body</div>}
    </>
  );
}
