const SENSITIVE_KEY_PATTERN = /key|token|secret|password|authorization|email/i;
const MAX_STRING_LENGTH = 500;

export function redactAgentData(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(redactAgentData);
  const redacted: Record<string, unknown> = {};
  for (const [k, item] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) redacted[k] = "[redacted]";
    else if (typeof item === "string" && item.length > MAX_STRING_LENGTH) redacted[k] = item.slice(0, MAX_STRING_LENGTH) + "…";
    else redacted[k] = redactAgentData(item);
  }
  return redacted;
}
