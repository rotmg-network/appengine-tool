import { builtinEndpointCatalog, type EndpointDefinition } from "../endpointCatalog";
import { row } from "./rows";
import type { EndpointPreset } from "../types";

// User customisations layered on top of the built-in catalog. Keyed by the
// stable id of the original built-in endpoint: a replacement definition means
// "edited", and null means "deleted/hidden".
export type EndpointOverrides = Record<string, EndpointDefinition | null>;

export type SidebarEndpoint =
  | { origin: "builtin"; builtinId: string; definition: EndpointDefinition; preset: EndpointPreset }
  | { origin: "custom"; index: number; definition: EndpointDefinition; preset: EndpointPreset };

export function endpointId(definition: EndpointDefinition): string {
  return `${definition.group}:${definition.name}:${definition.path}`.toLowerCase().replaceAll(/\s+/g, "-");
}

export function endpointFromDefinition(definition: EndpointDefinition): EndpointPreset {
  return {
    id: endpointId(definition),
    group: definition.group,
    name: definition.name,
    method: definition.method,
    path: definition.path,
    params: (definition.params || []).map((param) => row(param.key, param.value || "", param.source || "text")),
    note: definition.note || ""
  };
}

export const builtinPresets: EndpointPreset[] = builtinEndpointCatalog.map(endpointFromDefinition);

// Merges the built-in catalog with the user's overrides and custom endpoints
// into the flat list the sidebar renders. Built-in ids are derived from the
// original catalog entry so they stay stable even after an endpoint is edited.
export function buildSidebarEndpoints(
  overrides: EndpointOverrides,
  custom: EndpointDefinition[],
  catalog: EndpointDefinition[] = builtinEndpointCatalog
): SidebarEndpoint[] {
  const list: SidebarEndpoint[] = [];
  for (const definition of catalog) {
    const builtinId = endpointId(definition);
    const override = overrides[builtinId];
    if (override === null) continue;
    const effective = override ?? definition;
    list.push({ origin: "builtin", builtinId, definition: effective, preset: endpointFromDefinition(effective) });
  }
  custom.forEach((definition, index) => {
    list.push({ origin: "custom", index, definition, preset: endpointFromDefinition(definition) });
  });
  return list;
}
