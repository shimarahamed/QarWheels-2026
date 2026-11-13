export function toVendorCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    // Spreadsheet apps may evaluate user-entered names as formulas, even in quoted CSV.
    const safe = /^\s*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}

export function downloadVendorCsv(filename: string, headers: readonly string[], rows: readonly (readonly unknown[])[]): void {
  const url = URL.createObjectURL(new Blob([toVendorCsv(headers, rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
