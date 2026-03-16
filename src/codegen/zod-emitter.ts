import type { NormalizedSchema } from "../normalize/types.js";

/**
 * Convert a NormalizedSchema to a Zod code string.
 */
export function schemaToZod(schema: NormalizedSchema, indent = 2): string {
  return emitZod(schema, indent);
}

function emitZod(schema: NormalizedSchema, indent: number): string {
  if (schema.enum && schema.enum.length > 0) {
    // z.enum only accepts string arrays — filter out non-string values
    const stringVals = schema.enum.filter(
      (v): v is string => typeof v === "string",
    );
    if (stringVals.length > 0) {
      const vals = stringVals.map((v) => JSON.stringify(v)).join(", ");
      let code = `z.enum([${vals}])`;
      if (schema.description) code += `.describe(${JSON.stringify(schema.description)})`;
      return code;
    }
    // Fall through to type-based handling if no string enum values
  }

  switch (schema.type) {
    case "string": {
      let code = "z.string()";
      if (schema.description) code += `.describe(${JSON.stringify(schema.description)})`;
      return code;
    }
    case "integer": {
      let code = "z.number().int()";
      if (schema.minimum !== undefined) code += `.min(${schema.minimum})`;
      if (schema.maximum !== undefined) code += `.max(${schema.maximum})`;
      if (schema.description) code += `.describe(${JSON.stringify(schema.description)})`;
      return code;
    }
    case "number": {
      let code = "z.number()";
      if (schema.minimum !== undefined) code += `.min(${schema.minimum})`;
      if (schema.maximum !== undefined) code += `.max(${schema.maximum})`;
      if (schema.description) code += `.describe(${JSON.stringify(schema.description)})`;
      return code;
    }
    case "boolean": {
      let code = "z.boolean()";
      if (schema.description) code += `.describe(${JSON.stringify(schema.description)})`;
      return code;
    }
    case "array": {
      const itemsCode = schema.items ? emitZod(schema.items, indent) : "z.any()";
      let code = `z.array(${itemsCode})`;
      if (schema.description) code += `.describe(${JSON.stringify(schema.description)})`;
      return code;
    }
    case "object":
    default: {
      if (schema.properties) {
        return emitObject(schema.properties, schema.required || [], indent);
      }
      if (schema.type === "object") {
        let code = "z.record(z.string(), z.any())";
        if (schema.description) code += `.describe(${JSON.stringify(schema.description)})`;
        return code;
      }
      return "z.any()";
    }
  }
}

function emitObject(
  properties: Record<string, NormalizedSchema>,
  required: string[],
  indent: number,
): string {
  const pad = " ".repeat(indent);
  const innerPad = pad + "  ";
  const fields: string[] = [];

  for (const [name, propSchema] of Object.entries(properties)) {
    let zodType = emitZod(propSchema, indent + 2);
    if (!required.includes(name)) zodType += ".optional()";
    fields.push(`${innerPad}${JSON.stringify(name)}: ${zodType}`);
  }

  return `z.object({\n${fields.join(",\n")}\n${pad}})`;
}
