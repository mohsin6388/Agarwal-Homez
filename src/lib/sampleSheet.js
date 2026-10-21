const HEADERS = [
  "Name",
  "Mobile / WhatsApp",
  "Email address",
  "Address",
  "Job title",
];

const cell = (value) =>
  /[",\n]/.test(value) ? `"${String(value).replace(/"/g, '""')}"` : value;

export function downloadSampleSheet() {
  // Download only column headings; no example contacts.
  const csv = `\uFEFF${HEADERS.map(cell).join(",")}\r\n`;

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = "propai-contacts-sample.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
