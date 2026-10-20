// Downloads a ready-to-fill contact sheet (opens in Excel / Google Sheets).
const HEADERS = ['Name', 'Mobile / WhatsApp', 'Email address', 'Address', 'Job title'];
const EXAMPLE = ['Ayush Sharma', '919876543210', 'ayush@example.com', 'Swaroop Nagar, Kanpur', 'Software Engineer'];

const cell = (value) => (/[",\n]/.test(value) ? `"${String(value).replace(/"/g, '""')}"` : value);

export function downloadSampleSheet() {
  const csv = `﻿${[HEADERS, EXAMPLE].map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'propai-contacts-sample.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
