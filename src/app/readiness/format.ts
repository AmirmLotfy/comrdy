/** Client-safe display/export helpers; no verification or payment policy lives here. */
export function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "Not observed";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (
    typeof value === "object" &&
    "amountMinor" in value &&
    "currency" in value
  ) {
    const amount = (value as { amountMinor: unknown }).amountMinor;
    const currency = (value as { currency: unknown }).currency;
    if (typeof amount === "number" && typeof currency === "string")
      return `${currency} ${(amount / 100).toFixed(2)}`;
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/** A leading apostrophe prevents formula interpretation in spreadsheet applications. */
export function safeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)
    ? `'${text}`
    : text;
}

export function dollarsToMinor(value: string): number | null {
  const match = /^(\d{3})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const minor =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return minor >= 13800 && minor <= 25000 ? minor : null;
}
