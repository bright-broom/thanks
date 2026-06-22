const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export class InterpolationError extends Error {
  constructor(
    message: string,
    readonly missing: string[],
    readonly unused: string[],
  ) {
    super(message);
    this.name = "InterpolationError";
  }
}

export function interpolate(template: string, values: Record<string, string>): string {
  const required = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER_RE)) {
    const key = match[1];
    if (key !== undefined) required.add(key);
  }

  const provided = new Set(Object.keys(values));
  const missing: string[] = [];
  for (const k of required) if (!provided.has(k)) missing.push(k);

  if (missing.length > 0) {
    throw new InterpolationError(
      `Missing placeholder values: ${missing.join(", ")}`,
      missing,
      [],
    );
  }

  return template.replace(PLACEHOLDER_RE, (_, key: string) => values[key] ?? "");
}

export function extractPlaceholders(template: string): string[] {
  const out = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER_RE)) {
    const key = match[1];
    if (key !== undefined) out.add(key);
  }
  return [...out];
}
