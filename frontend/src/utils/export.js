export function exportToCSV(data, columns, filename = 'export.csv') {
  if (!data || data.length === 0) return;

  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = c.accessor ? c.accessor(row) : row[c.key] || '';
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`;
      }
      return val;
    }).join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToPDF(data, columns, title = 'Export') {
  if (!data || data.length === 0) return;

  const rows = data.map(row =>
    columns.map(c => {
      const val = c.accessor ? c.accessor(row) : row[c.key] || '';
      return `<td style="padding:6px 10px;border:1px solid #ddd">${String(val)}</td>`;
    }).join('')
  );

  const html = `
    <html><head><title>${title}</title>
    <style>
      body { font-family: -apple-system, sans-serif; padding: 20px; }
      h1 { font-size: 18px; margin-bottom: 12px; }
      table { border-collapse: collapse; width: 100%; font-size: 13px; }
      th { background: #7c3aed; color: white; padding: 8px 10px; text-align: left; border: 1px solid #6d28d9; }
      tr:nth-child(even) { background: #f3f4f6; }
      .footer { margin-top: 16px; font-size: 11px; color: #888; }
    </style></head>
    <body>
      <h1>${title}</h1>
      <table>
        <thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r}</tr>`).join('')}</tbody>
      </table>
      <p class="footer">Exported on ${new Date().toLocaleString()}</p>
    </body></html>
  `;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}
