/**
 * Recursively collect all $ref strings from an object.
 */
export function extractRefs(obj: unknown): Set<string> {
  const refs = new Set<string>();
  walk(obj, refs);
  return refs;
}

function walk(obj: unknown, refs: Set<string>): void {
  if (obj === null || obj === undefined || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) walk(item, refs);
    return;
  }
  const record = obj as Record<string, unknown>;
  if (typeof record.$ref === "string") {
    refs.add(record.$ref);
  }
  for (const v of Object.values(record)) {
    walk(v, refs);
  }
}

/**
 * Given a set of $ref strings, transitively resolve all referenced definitions.
 * Returns the subset of definitions needed.
 */
export function resolveTransitiveDefinitions(
  refs: Set<string>,
  allDefinitions: Record<string, unknown>,
  refPrefix = "#/definitions/",
): Record<string, unknown> {
  const needed = new Set<string>();
  const queue = [...refs];

  while (queue.length > 0) {
    const ref = queue.pop()!;
    if (!ref.startsWith(refPrefix)) continue;
    const name = ref.slice(refPrefix.length);
    if (needed.has(name)) continue;
    needed.add(name);
    if (allDefinitions[name]) {
      for (const childRef of extractRefs(allDefinitions[name])) {
        queue.push(childRef);
      }
    }
  }

  const result: Record<string, unknown> = {};
  for (const name of needed) {
    if (allDefinitions[name]) {
      result[name] = allDefinitions[name];
    }
  }
  return result;
}

/**
 * Resolve a $ref string to its definition object.
 */
export function resolveRef(
  ref: string,
  definitions: Record<string, unknown>,
  refPrefix = "#/definitions/",
): unknown {
  if (!ref.startsWith(refPrefix)) return undefined;
  const name = ref.slice(refPrefix.length);
  return definitions[name];
}
