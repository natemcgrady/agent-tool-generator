import type { NormalizedOperation } from "../normalize/types.js";
import type { GeneratorConfig } from "../config.js";
import type { AuthInfo } from "./auth.js";
import { schemaToZod } from "./zod-emitter.js";
import { deriveToolName, deduplicateName } from "../util/naming.js";

/**
 * Generate code for a single tool factory function.
 */
export function emitTool(
  op: NormalizedOperation,
  config: GeneratorConfig,
  auth: AuthInfo,
  optionsTypeName: string,
  seenNames: Set<string>,
): string {
  const toolName = deduplicateName(
    deriveToolName(op.method, op.path, config.stripPrefix),
    seenNames,
  );

  const description = [op.summary, op.description].filter(Boolean).join(" - ");
  const escapedDescription = description
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  const usedInputNames = new Set<string>();
  const bindInputName = (rawName: string): string =>
    deduplicateInputName(toInputPropertyName(rawName), usedInputNames);

  const pathParams = op.parameters
    .filter((p) => p.in === "path")
    .map((p) => ({ ...p, inputName: bindInputName(p.name) }));
  const queryParams = op.parameters
    .filter((p) => p.in === "query")
    .map((p) => ({ ...p, inputName: bindInputName(p.name) }));
  const bodyInputName = op.requestBody ? bindInputName("body") : undefined;

  // Build inputSchema fields
  const schemaFields: string[] = [];

  for (const p of pathParams) {
    let zodCode = schemaToZod(p.schema, 4);
    // Path params are always required
    if (p.description && !zodCode.includes(".describe(")) {
      zodCode += `.describe(${JSON.stringify(p.description)})`;
    }
    schemaFields.push(`      ${p.inputName}: ${zodCode}`);
  }

  for (const p of queryParams) {
    let zodCode = schemaToZod(p.schema, 4);
    if (p.description && !zodCode.includes(".describe(")) {
      zodCode += `.describe(${JSON.stringify(p.description)})`;
    }
    if (!p.required) zodCode += ".optional()";
    schemaFields.push(`      ${p.inputName}: ${zodCode}`);
  }

  if (op.requestBody && bodyInputName) {
    let bodyZod = schemaToZod(op.requestBody.schema, 4);
    if (!op.requestBody.required) bodyZod += ".optional()";
    schemaFields.push(`      ${bodyInputName}: ${bodyZod}`);
  }

  const schemaCode =
    schemaFields.length > 0
      ? `z.object({\n${schemaFields.join(",\n")}\n    })`
      : "z.object({})";

  // Build execute function
  const execLines: string[] = [];

  // URL construction
  let urlTemplate = op.path;
  if (pathParams.length > 0) {
    for (const p of pathParams) {
      const encodedValueExpr = toWireStringExpression(`params.${p.inputName}`, p.schema.type);
      urlTemplate = urlTemplate.replace(
        `{${p.name}}`,
        `\${encodeURIComponent(${encodedValueExpr})}`,
      );
    }
    execLines.push(`      let url = \`\${options.baseUrl}${urlTemplate}\`;`);
  } else {
    execLines.push(`      let url = \`\${options.baseUrl}${op.path}\`;`);
  }

  // Query params
  if (queryParams.length > 0) {
    execLines.push(`      const query = new URLSearchParams();`);
    for (const p of queryParams) {
      const queryValueExpr = toWireStringExpression(`params.${p.inputName}`, p.schema.type);
      execLines.push(
        `      if (params.${p.inputName} !== undefined) query.set(${JSON.stringify(p.name)}, ${queryValueExpr});`,
      );
    }
    execLines.push(`      const qs = query.toString();`);
    execLines.push(`      if (qs) url += "?" + qs;`);
  }

  // Auth query code (if auth is query-based)
  if (auth.queryCode) {
    execLines.push(auth.queryCode);
  }

  // Fetch options
  const methodUpper = op.method.toUpperCase();
  const hasBody = !!op.requestBody;
  execLines.push(`      const response = await fetch(url, {`);
  execLines.push(`        method: "${methodUpper}",`);
  execLines.push(`        headers: {`);
  if (auth.headerCode) {
    execLines.push(auth.headerCode);
  }
  if (hasBody) {
    execLines.push(`          "Content-Type": "application/json",`);
  }
  execLines.push(`        },`);

  if (op.requestBody && bodyInputName) {
    execLines.push(
      `        body: params.${bodyInputName} ? JSON.stringify(params.${bodyInputName}) : undefined,`,
    );
  }

  execLines.push(`      });`);

  // Error handling
  execLines.push(`      if (!response.ok) {`);
  execLines.push(`        const error = await response.json().catch(() => null) as Record<string, unknown> | null;`);
  execLines.push(`        return {`);
  execLines.push(`          error: true as const,`);
  execLines.push(`          status: response.status,`);
  execLines.push(`          message: (error as any)?.errors?.[0]?.detail ?? \`Request failed with status \${response.status}\`,`);
  execLines.push(`        };`);
  execLines.push(`      }`);
  execLines.push(`      return await response.json();`);

  // Build outputSchema if response schema is available
  let outputSchemaCode: string | undefined;
  if (op.responseSchema && (op.responseSchema.type || op.responseSchema.properties)) {
    outputSchemaCode = schemaToZod(op.responseSchema, 4);
  }

  const toolProps = [
    `    description: \`${escapedDescription}\``,
    `    inputSchema: ${schemaCode}`,
    ...(outputSchemaCode ? [`    outputSchema: ${outputSchemaCode}`] : []),
    `    execute: async (params) => {\n${execLines.join("\n")}\n    }`,
  ];

  return `export const ${toolName} = (options: ${optionsTypeName}) =>
  tool({
${toolProps.join(",\n")},
  });`;
}

function toInputPropertyName(name: string): string {
  const segments = name
    .split(/[^a-zA-Z0-9]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const camel = segments
    .map((segment, index) => {
      const normalized = segment.toLowerCase();
      if (index === 0) return normalized;
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join("");

  const fallback = camel || "param";
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(fallback) ? fallback : `p${fallback}`;
}

function deduplicateInputName(base: string, seen: Set<string>): string {
  let candidate = base;
  let index = 2;
  while (seen.has(candidate)) {
    candidate = `${base}${index}`;
    index++;
  }
  seen.add(candidate);
  return candidate;
}

function toWireStringExpression(valueExpr: string, schemaType?: string): string {
  if (
    schemaType === "integer" ||
    schemaType === "number" ||
    schemaType === "boolean" ||
    schemaType === "array" ||
    schemaType === "object"
  ) {
    return `String(${valueExpr})`;
  }
  return valueExpr;
}
