import { builtinEndpointCatalog, type EndpointDefinition } from "../endpointCatalog";
import { row } from "./rows";
import type { EndpointPreset } from "../types";

export function endpointFromDefinition(definition: EndpointDefinition): EndpointPreset {
  return {
    id: `${definition.group}:${definition.name}:${definition.path}`.toLowerCase().replaceAll(/\s+/g, "-"),
    group: definition.group,
    name: definition.name,
    method: definition.method,
    path: definition.path,
    params: (definition.params || []).map((param) => row(param.key, param.value || "", param.source || "text")),
    note: definition.note || ""
  };
}

export const builtinPresets: EndpointPreset[] = builtinEndpointCatalog.map(endpointFromDefinition);
