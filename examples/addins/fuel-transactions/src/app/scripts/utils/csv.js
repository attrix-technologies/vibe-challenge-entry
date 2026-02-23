/**
 * Export an array of row objects as a CSV file download.
 * @param {string} filename - The filename for the download (e.g. "fuel-transactions.csv")
 * @param {string[]} headers - Column headers in display order
 * @param {string[][]} rows - Array of row arrays, each matching headers order
 */
export const downloadCsv = (filename, headers, rows) => {
  const escape = (val) => {
    const str = val == null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(','))
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
