/**
 * Convert a path + method into a camelCase tool name.
 * e.g. GET /web/api/v2.1/agents → getAgents
 */
export function deriveToolName(
  method: string,
  urlPath: string,
  stripPrefix?: string,
): string {
  let stripped = urlPath;
  if (stripPrefix) {
    if (stripped.startsWith(stripPrefix)) {
      stripped = stripped.slice(stripPrefix.length);
    }
  } else {
    // Auto-strip common API prefixes
    stripped = stripped
      .replace(/^\/web\/api\/v\d+(\.\d+)?\//, "")
      .replace(/^\/api\/v\d+(\.\d+)?\//, "")
      .replace(/^\/v\d+(\.\d+)?\//, "");
  }

  // Ensure leading slash is removed
  stripped = stripped.replace(/^\//, "");

  const segments = stripped
    .split("/")
    .filter(Boolean)
    .map((seg) => {
      // Remove path param braces: {hash} -> hash
      if (seg.startsWith("{") && seg.endsWith("}")) {
        return seg.slice(1, -1);
      }
      return seg;
    })
    // Convert camelCase/snake_case segments to separate words
    .map((seg) =>
      seg
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/_/g, "-")
        .toLowerCase(),
    );

  const kebab = `${method.toLowerCase()}-${segments.join("-")}`;
  return kebabToCamel(kebab);
}

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert a tag name to a valid kebab-case filename (without extension).
 */
export function tagToFilename(tag: string): string {
  return tag
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
}

/**
 * Convert a camelCase string to kebab-case.
 * e.g. getAgents → get-agents
 */
export function camelToKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Return a unique name by appending a numeric suffix if `name` already exists in `seen`.
 * Adds the final name to `seen` before returning.
 */
export function deduplicateName(name: string, seen: Set<string>): string {
  let unique = name;
  if (seen.has(unique)) {
    let i = 2;
    while (seen.has(`${name}${i}`)) i++;
    unique = `${name}${i}`;
  }
  seen.add(unique);
  return unique;
}
