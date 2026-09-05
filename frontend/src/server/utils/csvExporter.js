// Dependency-free CSV writer (RFC 4180-ish): escapes commas, quotes, and
// newlines, and writes a header row from the keys of the first object.
// Intentionally has no npm dependency -- report exports are small/medium
// tabular data, not worth pulling in a CSV library for.

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of flat objects into a CSV string.
 * @param {object[]} rows
 * @param {string[]} [columns] - explicit column order; defaults to the keys of the first row.
 * @returns {string} CSV text (CRLF line endings, trailing CRLF).
 */
export function toCsv(rows, columns) {
  const cols = columns && columns.length ? columns : rows && rows.length ? Object.keys(rows[0]) : [];
  const lines = [cols.map(escapeCsvValue).join(',')];

  for (const row of rows || []) {
    lines.push(cols.map((col) => escapeCsvValue(row[col])).join(','));
  }

  return `${lines.join('\r\n')}\r\n`;
}

export default toCsv;
