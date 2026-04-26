// Minimal RFC-4180-ish CSV reader/writer. Handles quotes, embedded commas,
// and "" escaping. No external dependency.

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let curr: string[] = [];
  let cell = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cell += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { curr.push(cell); cell = ''; }
      else if (c === '\n') { curr.push(cell); rows.push(curr); curr = []; cell = ''; }
      else if (c === '\r') { /* ignore */ }
      else cell += c;
    }
  }
  // Flush last cell/row.
  if (cell.length > 0 || curr.length > 0) { curr.push(cell); rows.push(curr); }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim().length > 0));
  if (nonEmpty.length === 0) return [];
  const headers = nonEmpty[0]!.map((h) => h.trim().toLowerCase());
  return nonEmpty.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim(); });
    return obj;
  });
}

export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0 && !headers) return '';
  const cols = headers ?? Object.keys(rows[0] ?? {});
  const escape = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => escape((row as Record<string, unknown>)[c])).join(','));
  }
  return lines.join('\n') + '\n';
}
