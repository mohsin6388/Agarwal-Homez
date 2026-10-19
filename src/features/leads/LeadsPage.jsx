import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { leadApi } from "../../api/leadApi.js";
import StatCard from "../../components/ui/StatCard.jsx";
import LeadFormModal from "./LeadFormModal.jsx";
import ImportLeadsModal from "./ImportLeadsModal.jsx";

const EMPTY_CONTACT = {
  name: "",
  phone: "+91 ",
  email: "",
  address: "",
  occupation: "",
};

function prettySource(lead) {
  const type =
    lead.sourceType || (lead.source === "manual" ? "manual" : "other");
  if (type === "excel") return "Excel";
  if (type === "csv") return "CSV";
  if (type === "paste") return "Paste";
  if (type === "manual") return "Manual";
  return "Other";
}

function count(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

async function downloadResponse(response, filename) {
  const blob =
    response?.data instanceof Blob ? response.data : new Blob([response?.data]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [summary, setSummary] = useState({
    total: 0,
    whatsappSent: 0,
    emailSent: 0,
    replied: 0,
    sourceFiles: [],
  });
  const [search, setSearch] = useState("");
  const [sourceFile, setSourceFile] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [form, setForm] = useState(EMPTY_CONTACT);
  const [savingContact, setSavingContact] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchLeads = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError("");
      try {
        const response = await leadApi.list({
          page,
          limit: 50,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(sourceFile ? { sourceFile } : {}),
        });
        setLeads(response.data?.leads || []);
        setPagination(
          response.data?.pagination || {
            page,
            limit: 50,
            total: 0,
            totalPages: 1,
          },
        );
        setSummary((current) => ({
          ...current,
          ...(response.data?.summary || {}),
        }));
        setSelected([]);
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message ||
            "Could not load contacts. Check your connection and refresh.",
        );
      } finally {
        setLoading(false);
      }
    },
    [search, sourceFile],
  );

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  const visibleIds = useMemo(() => leads.map((lead) => lead._id), [leads]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const toggleSelect = (id) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const toggleAllVisible = () =>
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
    );

  const handleSampleDownload = async () => {
    setDownloadLoading(true);
    setError("");
    try {
      await downloadResponse(
        await leadApi.sampleSheet(),
        "propai-contacts-sample.xlsx",
      );
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Could not download the sample spreadsheet.",
      );
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleExport = async () => {
    setDownloadLoading(true);
    setError("");
    try {
      await downloadResponse(
        await leadApi.exportFile({
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(sourceFile ? { sourceFile } : {}),
          format: "xlsx",
        }),
        "propai-contacts.xlsx",
      );
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Could not download the Excel file.",
      );
    } finally {
      setDownloadLoading(false);
    }
  };

  const saveContact = async (event) => {
    event.preventDefault();
    setFormError("");
    const digits = String(form.phone || "").replace(/\D/g, "");
    if (digits.length < 10) {
      setFormError("A mobile / WhatsApp number is required.");
      return;
    }
    setSavingContact(true);
    try {
      await leadApi.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        occupation: form.occupation.trim(),
        sourceType: "manual",
        source: "manual",
      });
      setForm(EMPTY_CONTACT);
      setShowContact(false);
      setNotice("Contact saved. No message was sent.");
      await fetchLeads(1);
    } catch (requestError) {
      setFormError(
        requestError?.response?.data?.message ||
          "Could not save the contact. Please check the phone number.",
      );
    } finally {
      setSavingContact(false);
    }
  };

  const removeLead = async (lead) => {
    if (!window.confirm(`Delete ${lead.name || "this contact"}?`)) return;
    setError("");
    try {
      await leadApi.remove(lead._id);
      setNotice("Contact deleted.");
      await fetchLeads(pagination.page);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Could not delete the contact.",
      );
    }
  };

  const removeSelected = async () => {
    if (
      !selected.length ||
      !window.confirm(`Delete ${selected.length} selected contacts?`)
    )
      return;
    setError("");
    try {
      await leadApi.bulkDelete(selected);
      setNotice(`${selected.length} contacts deleted.`);
      setSelected([]);
      await fetchLeads(1);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Could not delete the selected contacts.",
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-8">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1>Upload Data</h1>
          <p className="page-description">
            Manage the contacts you want to reach through WhatsApp or email.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSampleDownload}
            disabled={downloadLoading}
            className="btn-secondary"
          >
            <Download size={17} /> Download sample sheet
          </button>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="btn-secondary"
          >
            <Upload size={17} /> Excel / CSV upload
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY_CONTACT);
              setFormError("");
              setShowContact((current) => !current);
            }}
            className="btn-primary"
          >
            <Plus size={18} /> Add contact
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-chip-error-text/20 bg-chip-error-bg px-4 py-3 text-sm text-chip-error-text"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />{" "}
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total contacts"
          value={count(summary.total)}
          icon={Users}
        />
        <StatCard
          label="WhatsApp messages sent"
          value={count(summary.whatsappSent)}
          icon={MessageCircle}
          helper="At least one successful send"
        />
        <StatCard
          label="Emails sent"
          value={count(summary.emailSent)}
          icon={Mail}
          helper="At least one successful send"
        />
        <StatCard
          label="Leads who replied"
          value={count(summary.replied)}
          icon={CheckCircle2}
          featured
          helper="Contacts who replied via WhatsApp or email"
        />
      </div>

      <div
        className={`grid items-start gap-5 ${showContact ? "xl:grid-cols-[minmax(0,1fr)_350px]" : "grid-cols-1"}`}
      >
        <section className="min-w-0 space-y-4">
          <div className="card !p-3 sm:!p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">
                  Search by name, mobile number, or email
                </span>
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, mobile number, or email"
                  className="input-field pl-10"
                />
              </label>
              <select
                aria-label="Upload source filter"
                value={sourceFile}
                onChange={(event) => setSourceFile(event.target.value)}
                className="input-field w-full lg:w-[230px]"
              >
                <option value="">All uploads</option>
                <option value="manual">Manual entries</option>
                {(summary.sourceFiles || []).map((file) => (
                  <option value={file} key={file}>
                    {file}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleExport}
                disabled={downloadLoading}
                className="btn-secondary shrink-0"
              >
                <FileSpreadsheet size={17} /> Download Excel
              </button>
              <button
                type="button"
                onClick={() => fetchLeads(pagination.page)}
                disabled={loading}
                className="btn-secondary shrink-0"
                aria-label="Refresh contacts"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-surface-border pt-3 dark:border-ink-800">
              <p className="text-sm text-text-muted dark:text-ink-400">
                {selected.length
                  ? `${selected.length} contacts selected`
                  : "Select contacts to create an audience."}
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={removeSelected}
                    className="btn-secondary !min-h-9 !py-1.5 text-chip-error-text"
                  >
                    <Trash2 size={15} /> Delete {selected.length}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    selected.length
                      ? navigate(
                          `/audiences/new?leadIds=${encodeURIComponent(selected.join(","))}`,
                        )
                      : setNotice(
                          "Select contacts first to create an audience.",
                        )
                  }
                  disabled={!selected.length}
                  className="btn-primary !min-h-9 !py-1.5"
                >
                  <Users size={16} /> {selected.length} select · Create audience
                </button>
              </div>
            </div>
          </div>

          <div className="card !p-0">
            <div className="table-scroll rounded-card">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-page text-xs font-extrabold uppercase tracking-wide text-text-muted dark:bg-ink-800 dark:text-ink-300">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all contacts on this page"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                      />
                    </th>
                    {[
                      "Name",
                      "Mobile / WhatsApp",
                      "Email",
                      "Address",
                      "Job title",
                      "Source",
                      "",
                    ].map((heading, index) => (
                      <th
                        key={`${heading}-${index}`}
                        className="whitespace-nowrap px-3 py-3"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-16 text-center text-text-muted"
                      >
                        Loading contacts…
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <Users
                          size={32}
                          className="mx-auto mb-3 text-text-muted/60"
                        />
                        <p className="font-bold">No contacts found</p>
                        <p className="mt-1 text-sm text-text-muted">
                          Upload an Excel / CSV file or add a new contact.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr
                        key={lead._id}
                        className="border-t border-surface-border align-middle dark:border-ink-800"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${lead.name || "contact"}`}
                            checked={selected.includes(lead._id)}
                            onChange={() => toggleSelect(lead._id)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex min-w-[170px] items-center gap-2">
                            <span
                              className="min-w-0 flex-1 truncate font-bold text-text dark:text-white"
                              title={lead.name}
                            >
                              {lead.name || "No name provided"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingLead(lead)}
                              className="rounded-lg p-1.5 text-text-muted hover:bg-page hover:text-primary dark:hover:bg-ink-800"
                              aria-label={`Edit ${lead.name || "contact"}`}
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-text dark:text-ink-200">
                          {lead.phone || "—"}
                        </td>
                        <td
                          className="max-w-[210px] truncate px-3 py-3 text-text dark:text-ink-200"
                          title={lead.email || ""}
                        >
                          {lead.email || "—"}
                        </td>
                        <td
                          className="max-w-[220px] truncate px-3 py-3 text-text-muted dark:text-ink-300"
                          title={lead.address || ""}
                        >
                          {lead.address || "—"}
                        </td>
                        <td
                          className="max-w-[180px] truncate px-3 py-3 text-text-muted dark:text-ink-300"
                          title={lead.occupation || ""}
                        >
                          {lead.occupation || "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex rounded-full bg-chip-neutral-bg px-2.5 py-1 text-xs font-bold text-chip-neutral-text">
                            {prettySource(lead)}
                          </span>
                          {lead.sourceFile && (
                            <p
                              className="mt-1 max-w-[150px] truncate text-[11px] text-text-muted"
                              title={lead.sourceFile}
                            >
                              {lead.sourceFile}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => removeLead(lead)}
                            className="rounded-lg p-2 text-text-muted hover:bg-chip-error-bg hover:text-chip-error-text"
                            aria-label={`Delete ${lead.name || "contact"}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col justify-between gap-3 border-t border-surface-border px-4 py-3 dark:border-ink-800 sm:flex-row sm:items-center">
              <p className="text-xs text-text-muted">
                {leads.length
                  ? `${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)}`
                  : "0"}{" "}
                / {count(pagination.total)} contacts
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => fetchLeads(pagination.page - 1)}
                  className="btn-secondary !min-h-9 !px-3 !py-1.5 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="min-w-20 text-center text-xs text-text-muted">
                  Page {pagination.page} / {pagination.totalPages || 1}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => fetchLeads(pagination.page + 1)}
                  className="btn-secondary !min-h-9 !px-3 !py-1.5 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <p className="px-1 text-sm leading-6 text-text-muted dark:text-ink-400">
            Uploading contacts does not send any messages. To send messages,
            open WhatsApp › Bulk Message or Email › Bulk Email.
          </p>
        </section>

        {showContact && (
          <aside className="card sticky top-4 !p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
                  Manual entry
                </p>
                <h2 className="mt-1 text-xl font-extrabold">New contact</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowContact(false)}
                aria-label="Close contact form"
                className="rounded-lg p-2 text-text-muted hover:bg-page dark:hover:bg-ink-800"
              >
                <X size={18} />
              </button>
            </div>
            {formError && (
              <div
                role="alert"
                className="mb-4 rounded-xl bg-chip-error-bg px-3 py-2.5 text-sm text-chip-error-text"
              >
                {formError}
              </div>
            )}
            <form className="space-y-4" onSubmit={saveContact}>
              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-1.5 block text-sm font-bold"
                >
                  Name
                </label>
                <input
                  id="contact-name"
                  value={form.name}
                  onChange={setField("name")}
                  placeholder="Customer name"
                  className="input-field"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-phone"
                  className="mb-1.5 block text-sm font-bold"
                >
                  Mobile / WhatsApp{" "}
                  <span className="text-chip-error-text">*</span>
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={setField("phone")}
                  className="input-field"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-1.5 block text-sm font-bold"
                >
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={setField("email")}
                  placeholder="name@example.com"
                  className="input-field"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-address"
                  className="mb-1.5 block text-sm font-bold"
                >
                  Address
                </label>
                <textarea
                  id="contact-address"
                  rows={3}
                  value={form.address}
                  onChange={setField("address")}
                  placeholder="Full address"
                  className="input-field resize-y"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-job-title"
                  className="mb-1.5 block text-sm font-bold"
                >
                  Job title
                </label>
                <input
                  id="contact-job-title"
                  value={form.occupation}
                  onChange={setField("occupation")}
                  placeholder="e.g. Sales Manager"
                  className="input-field"
                />
              </div>
              <button
                type="submit"
                disabled={savingContact}
                className="btn-primary w-full"
              >
                {savingContact ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Plus size={17} />
                )}{" "}
                Save contact
              </button>
              <p className="text-xs leading-5 text-text-muted dark:text-ink-400">
                Only the mobile number is required. You can fill in the other
                details later.
              </p>
            </form>
          </aside>
        )}
      </div>

      {editingLead && (
        <LeadFormModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSaved={() => {
            setEditingLead(null);
            fetchLeads(pagination.page);
          }}
        />
      )}
      {showImport && (
        <ImportLeadsModal
          onClose={() => setShowImport(false)}
          onImported={() => fetchLeads(1)}
        />
      )}
    </div>
  );
}
